import type {
  AuthConfig,
  BodyType,
  CollectionItem,
  FolderItem,
  HttpMethod,
  KeyValueRow,
  Mode,
  PersistedRequestItem,
  SavedRequestItem,
} from '../types'
import { createId } from './formatters'
import { parseUrlToQueryParams, syncPathVariables } from './urlHelper'

export interface PostmanImportResult {
  collection: CollectionItem
  folders: FolderItem[]
  requests: SavedRequestItem[]
}

/**
 * Imports a Postman Collection v2.1 JSON string into local Collections, Folders, and Requests.
 */
export function importPostmanCollectionV2(jsonString: string): PostmanImportResult {
  const parsed = JSON.parse(jsonString) as {
    info?: { name?: string; description?: string }
    item?: unknown[]
  }

  const collectionId = createId()
  const collection: CollectionItem = {
    id: collectionId,
    name: parsed.info?.name || 'Imported Postman Collection',
    description: parsed.info?.description || '',
  }

  const folders: FolderItem[] = []
  const requests: SavedRequestItem[] = []

  function processItem(itemObj: unknown, parentFolderId: string | null = null) {
    if (!itemObj || typeof itemObj !== 'object') return
    const item = itemObj as Record<string, unknown>

    // If item contains sub-items, it is a Folder
    if (Array.isArray(item.item)) {
      const folderId = createId()
      folders.push({
        id: folderId,
        collectionId,
        parentId: parentFolderId,
        name: String(item.name || 'Folder'),
      })

      item.item.forEach((sub) => processItem(sub, folderId))
      return
    }

    // Otherwise it is a Request
    if (item.request && typeof item.request === 'object') {
      const req = item.request as Record<string, unknown>
      const name = String(item.name || 'Untitled Request')

      // Parse method
      const methodStr = String(req.method || 'GET').toUpperCase()
      const method: HttpMethod = (
        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(methodStr)
          ? methodStr
          : 'GET'
      ) as HttpMethod

      // Parse URL
      let urlStr = ''
      if (typeof req.url === 'string') {
        urlStr = req.url
      } else if (req.url && typeof req.url === 'object') {
        const urlObj = req.url as { raw?: string }
        urlStr = urlObj.raw || ''
      }

      // Parse Auth
      const auth: AuthConfig = {
        type: 'none',
        bearerToken: '',
        basicUsername: '',
        basicPassword: '',
        apiKeyName: '',
        apiKeyValue: '',
        apiKeyAddTo: 'header',
      }

      if (req.auth && typeof req.auth === 'object') {
        const authObj = req.auth as Record<string, unknown>
        const authType = String(authObj.type || '').toLowerCase()

        if (authType === 'bearer' && Array.isArray(authObj.bearer)) {
          const tokenEntry = (authObj.bearer as Array<{ key?: string; value?: string }>).find(
            (e) => e.key === 'token',
          )
          if (tokenEntry?.value) {
            auth.type = 'bearer'
            auth.bearerToken = tokenEntry.value
          }
        } else if (authType === 'basic' && Array.isArray(authObj.basic)) {
          const userEntry = (authObj.basic as Array<{ key?: string; value?: string }>).find(
            (e) => e.key === 'username',
          )
          const passEntry = (authObj.basic as Array<{ key?: string; value?: string }>).find(
            (e) => e.key === 'password',
          )
          auth.type = 'basic'
          auth.basicUsername = userEntry?.value || ''
          auth.basicPassword = passEntry?.value || ''
        } else if (authType === 'apikey' && Array.isArray(authObj.apikey)) {
          const keyEntry = (authObj.apikey as Array<{ key?: string; value?: string }>).find(
            (e) => e.key === 'key',
          )
          const valEntry = (authObj.apikey as Array<{ key?: string; value?: string }>).find(
            (e) => e.key === 'value',
          )
          const inEntry = (authObj.apikey as Array<{ key?: string; value?: string }>).find(
            (e) => e.key === 'in',
          )
          auth.type = 'apiKey'
          auth.apiKeyName = keyEntry?.value || ''
          auth.apiKeyValue = valEntry?.value || ''
          auth.apiKeyAddTo = inEntry?.value === 'query' ? 'query' : 'header'
        }
      }

      // Parse Headers & Filter out Authorization (Single Source of Truth in tab Auth)
      const headersList: KeyValueRow[] = []
      if (Array.isArray(req.header)) {
        req.header.forEach((h: unknown) => {
          if (h && typeof h === 'object') {
            const hObj = h as { key?: string; value?: string; disabled?: boolean; description?: string }
            if (hObj.key) {
              const lowerKey = hObj.key.trim().toLowerCase()
              if (lowerKey === 'authorization') {
                if (auth.type === 'none' && hObj.value) {
                  const val = hObj.value.trim()
                  if (val.toLowerCase().startsWith('bearer ')) {
                    auth.type = 'bearer'
                    auth.bearerToken = val.slice(7).trim()
                  } else if (val.toLowerCase().startsWith('basic ')) {
                    auth.type = 'basic'
                    try {
                      const decoded = atob(val.slice(6).trim())
                      const [u, ...p] = decoded.split(':')
                      auth.basicUsername = u || ''
                      auth.basicPassword = p.join(':') || ''
                    } catch {
                      // ignore
                    }
                  } else {
                    auth.type = 'bearer'
                    auth.bearerToken = val
                  }
                }
                // Filter out Authorization from User Headers
                return
              }

              headersList.push({
                id: createId(),
                key: hObj.key,
                value: hObj.value || '',
                enabled: !hObj.disabled,
                description: hObj.description || '',
              })
            }
          }
        })
      }

      // Parse Body
      let bodyType: BodyType = 'none'
      let restBody = ''
      let rawText = ''
      const formData: KeyValueRow[] = []
      const urlencoded: KeyValueRow[] = []
      let mode: Mode = 'REST'
      let gqlQuery = ''
      let gqlVariables = '{}'

      if (req.body && typeof req.body === 'object') {
        const bodyObj = req.body as Record<string, unknown>
        const bMode = String(bodyObj.mode || '').toLowerCase()

        if (bMode === 'graphql' && bodyObj.graphql && typeof bodyObj.graphql === 'object') {
          mode = 'GRAPHQL'
          const gqlObj = bodyObj.graphql as { query?: string; variables?: string }
          gqlQuery = gqlObj.query || ''
          gqlVariables = gqlObj.variables || '{}'
        } else if (bMode === 'raw') {
          const rawContent = String(bodyObj.raw || '')
          if (rawContent.trim().startsWith('{') || rawContent.trim().startsWith('[')) {
            bodyType = 'json'
            restBody = rawContent
          } else {
            bodyType = 'raw'
            rawText = rawContent
          }
        } else if (bMode === 'urlencoded' && Array.isArray(bodyObj.urlencoded)) {
          bodyType = 'x-www-form-urlencoded'
          bodyObj.urlencoded.forEach((param: unknown) => {
            if (param && typeof param === 'object') {
              const p = param as { key?: string; value?: string; disabled?: boolean; description?: string }
              if (p.key) {
                urlencoded.push({
                  id: createId(),
                  key: p.key,
                  value: p.value || '',
                  enabled: !p.disabled,
                  description: p.description || '',
                })
              }
            }
          })
        } else if (bMode === 'formdata' && Array.isArray(bodyObj.formdata)) {
          bodyType = 'form-data'
          bodyObj.formdata.forEach((param: unknown) => {
            if (param && typeof param === 'object') {
              const p = param as { key?: string; value?: string; disabled?: boolean; description?: string }
              if (p.key) {
                formData.push({
                  id: createId(),
                  key: p.key,
                  value: p.value || '',
                  enabled: !p.disabled,
                  description: p.description || '',
                })
              }
            }
          })
        }
      }

      // Parse Event / Test Script
      let testScript = ''
      if (Array.isArray(item.event)) {
        const testEvent = item.event.find(
          (e: unknown) =>
            e &&
            typeof e === 'object' &&
            (e as { listen?: string }).listen === 'test',
        ) as { script?: { exec?: string | string[] } } | undefined

        if (testEvent?.script?.exec) {
          if (Array.isArray(testEvent.script.exec)) {
            testScript = testEvent.script.exec.join('\n')
          } else if (typeof testEvent.script.exec === 'string') {
            testScript = testEvent.script.exec
          }
        }
      }

      const { params } = parseUrlToQueryParams(urlStr)

      let pathVars: KeyValueRow[] = []
      if (
        req.url &&
        typeof req.url === 'object' &&
        Array.isArray((req.url as { variable?: unknown[] }).variable)
      ) {
        pathVars = (
          (req.url as { variable: Array<{ key?: string; value?: string; description?: string }> })
            .variable || []
        ).map((v) => ({
          id: createId(),
          key: v.key || '',
          value: v.value || '',
          description: v.description || '',
          enabled: true,
        }))
      }
      const pathVariables = syncPathVariables(urlStr, pathVars)

      const persistedRequest: PersistedRequestItem = {
        id: createId(),
        name,
        mode,
        method,
        url: urlStr,
        params,
        pathVariables,
        headersList,
        headersText: JSON.stringify(
          Object.fromEntries(headersList.filter((h) => h.enabled).map((h) => [h.key, h.value])),
          null,
          2,
        ),
        auth,
        bodyType,
        restBody,
        rawText,
        formData,
        urlencoded,
        gqlQuery,
        gqlVariables,
        testScript,
        editorTab: mode === 'GRAPHQL' ? 'BODY' : 'PARAMS',
        responseTab: 'PRETTY',
      }

      requests.push({
        id: createId(),
        collectionId,
        folderId: parentFolderId,
        name,
        request: persistedRequest,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
  }

  if (Array.isArray(parsed.item)) {
    parsed.item.forEach((i) => processItem(i))
  }

  return { collection, folders, requests }
}

/**
 * Exports a Collection, its Folders, and its Requests to Postman Collection v2.1 format.
 */
export function exportPostmanCollectionV2(
  collection: CollectionItem,
  folders: FolderItem[],
  requests: SavedRequestItem[],
): string {
  const collectionFolders = folders.filter((f) => f.collectionId === collection.id)
  const collectionRequests = requests.filter((r) => r.collectionId === collection.id)

  function buildRequestItem(req: SavedRequestItem) {
    const r = req.request
    const headers = r.headersList
      .filter((h) => h.key.trim())
      .map((h) => ({
        key: h.key,
        value: h.value,
        type: 'text',
        disabled: !h.enabled,
        description: h.description,
      }))

    const body: Record<string, unknown> = {}
    if (r.mode === 'GRAPHQL') {
      body.mode = 'graphql'
      body.graphql = {
        query: r.gqlQuery,
        variables: r.gqlVariables,
      }
    } else if (r.bodyType === 'json') {
      body.mode = 'raw'
      body.raw = r.restBody
      body.options = { raw: { language: 'json' } }
    } else if (r.bodyType === 'raw') {
      body.mode = 'raw'
      body.raw = r.rawText
    } else if (r.bodyType === 'x-www-form-urlencoded') {
      body.mode = 'urlencoded'
      body.urlencoded = r.urlencoded.map((u) => ({
        key: u.key,
        value: u.value,
        disabled: !u.enabled,
        description: u.description,
      }))
    } else if (r.bodyType === 'form-data') {
      body.mode = 'formdata'
      body.formdata = r.formData.map((f) => ({
        key: f.key,
        value: f.value,
        type: 'text',
        disabled: !f.enabled,
        description: f.description,
      }))
    }

    const auth: Record<string, unknown> = {}
    if (r.auth?.type === 'bearer') {
      auth.type = 'bearer'
      auth.bearer = [{ key: 'token', value: r.auth.bearerToken, type: 'string' }]
    } else if (r.auth?.type === 'basic') {
      auth.type = 'basic'
      auth.basic = [
        { key: 'username', value: r.auth.basicUsername, type: 'string' },
        { key: 'password', value: r.auth.basicPassword, type: 'string' },
      ]
    } else if (r.auth?.type === 'apiKey') {
      auth.type = 'apikey'
      auth.apikey = [
        { key: 'key', value: r.auth.apiKeyName, type: 'string' },
        { key: 'value', value: r.auth.apiKeyValue, type: 'string' },
        { key: 'in', value: r.auth.apiKeyAddTo, type: 'string' },
      ]
    }

    const event = r.testScript?.trim()
      ? [
          {
            listen: 'test',
            script: {
              exec: r.testScript.split('\n'),
              type: 'text/javascript',
            },
          },
        ]
      : undefined

    return {
      name: req.name,
      event,
      request: {
        method: r.method,
        header: headers,
        body: Object.keys(body).length > 0 ? body : undefined,
        auth: Object.keys(auth).length > 0 ? auth : undefined,
        url: {
          raw: r.url,
        },
      },
    }
  }

  function buildFolderTree(parentId: string | null = null): unknown[] {
    const childFolders = collectionFolders.filter((f) => (f.parentId || null) === parentId)
    const childRequests = collectionRequests.filter((r) => (r.folderId || null) === parentId)

    const items: unknown[] = []

    // Add subfolders
    childFolders.forEach((folder) => {
      items.push({
        name: folder.name,
        item: buildFolderTree(folder.id),
      })
    })

    // Add requests
    childRequests.forEach((req) => {
      items.push(buildRequestItem(req))
    })

    return items
  }

  const exportPayload = {
    info: {
      _postman_id: createId(),
      name: collection.name,
      description: collection.description || '',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: buildFolderTree(null),
  }

  return JSON.stringify(exportPayload, null, 2)
}
