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
 * Parses Postman Auth configuration from a request or folder/collection node.
 */
export function parsePostmanAuth(rawAuth: unknown): AuthConfig | null {
  if (!rawAuth || typeof rawAuth !== 'object') return null
  const authObj = rawAuth as Record<string, unknown>
  const authType = String(authObj.type || '').toLowerCase()

  if (authType === 'noauth' || authType === 'none') {
    return {
      type: 'none',
      bearerToken: '',
      basicUsername: '',
      basicPassword: '',
      apiKeyName: '',
      apiKeyValue: '',
      apiKeyAddTo: 'header',
    }
  }

  if (authType === 'bearer') {
    let token = ''
    if (Array.isArray(authObj.bearer)) {
      const entry = (authObj.bearer as Array<{ key?: string; value?: string }>).find(
        (e) => e.key === 'token',
      )
      token = String(entry?.value || '')
    } else if (typeof authObj.bearer === 'string') {
      token = authObj.bearer
    } else if (authObj.bearer && typeof authObj.bearer === 'object') {
      token = String((authObj.bearer as { token?: string }).token || '')
    }
    return {
      type: 'bearer',
      bearerToken: token,
      basicUsername: '',
      basicPassword: '',
      apiKeyName: '',
      apiKeyValue: '',
      apiKeyAddTo: 'header',
    }
  }

  if (authType === 'oauth2') {
    let token = ''
    if (Array.isArray(authObj.oauth2)) {
      const entry = (authObj.oauth2 as Array<{ key?: string; value?: string }>).find(
        (e) => e.key === 'accessToken' || e.key === 'token' || e.key === 'tokenValue',
      )
      token = String(entry?.value || '')
    } else if (typeof authObj.oauth2 === 'string') {
      token = authObj.oauth2
    } else if (authObj.oauth2 && typeof authObj.oauth2 === 'object') {
      token = String(
        (authObj.oauth2 as { accessToken?: string; token?: string }).accessToken ||
          (authObj.oauth2 as { token?: string }).token ||
          '',
      )
    }
    return {
      type: 'bearer',
      bearerToken: token,
      basicUsername: '',
      basicPassword: '',
      apiKeyName: '',
      apiKeyValue: '',
      apiKeyAddTo: 'header',
    }
  }

  if (authType === 'basic') {
    let username = ''
    let password = ''
    if (Array.isArray(authObj.basic)) {
      const uEntry = (authObj.basic as Array<{ key?: string; value?: string }>).find(
        (e) => e.key === 'username',
      )
      const pEntry = (authObj.basic as Array<{ key?: string; value?: string }>).find(
        (e) => e.key === 'password',
      )
      username = String(uEntry?.value || '')
      password = String(pEntry?.value || '')
    } else if (authObj.basic && typeof authObj.basic === 'object') {
      username = String((authObj.basic as { username?: string }).username || '')
      password = String((authObj.basic as { password?: string }).password || '')
    }
    return {
      type: 'basic',
      bearerToken: '',
      basicUsername: username,
      basicPassword: password,
      apiKeyName: '',
      apiKeyValue: '',
      apiKeyAddTo: 'header',
    }
  }

  if (authType === 'apikey' || authType === 'api_key') {
    let key = ''
    let val = ''
    let where: 'header' | 'query' = 'header'
    if (Array.isArray(authObj.apikey)) {
      const kEntry = (authObj.apikey as Array<{ key?: string; value?: string }>).find(
        (e) => e.key === 'key',
      )
      const vEntry = (authObj.apikey as Array<{ key?: string; value?: string }>).find(
        (e) => e.key === 'value',
      )
      const inEntry = (authObj.apikey as Array<{ key?: string; value?: string }>).find(
        (e) => e.key === 'in',
      )
      key = String(kEntry?.value || '')
      val = String(vEntry?.value || '')
      where = inEntry?.value === 'query' ? 'query' : 'header'
    } else if (authObj.apikey && typeof authObj.apikey === 'object') {
      key = String((authObj.apikey as { key?: string }).key || '')
      val = String((authObj.apikey as { value?: string }).value || '')
      where = (authObj.apikey as { in?: string }).in === 'query' ? 'query' : 'header'
    }
    return {
      type: 'apiKey',
      bearerToken: '',
      basicUsername: '',
      basicPassword: '',
      apiKeyName: key,
      apiKeyValue: val,
      apiKeyAddTo: where,
    }
  }

  return null
}

/**
 * Parses URL string, query parameters and path variables from Postman request URL.
 */
export function parsePostmanUrl(rawUrl: unknown): {
  urlStr: string
  queryParams: KeyValueRow[]
  pathVars: KeyValueRow[]
} {
  let urlStr = ''
  const queryParams: KeyValueRow[] = []
  const pathVars: KeyValueRow[] = []

  if (typeof rawUrl === 'string') {
    urlStr = rawUrl.trim()
    const parsed = parseUrlToQueryParams(urlStr)
    return { urlStr, queryParams: parsed.params, pathVars: [] }
  }

  if (rawUrl && typeof rawUrl === 'object') {
    const urlObj = rawUrl as Record<string, unknown>

    if (typeof urlObj.raw === 'string' && urlObj.raw.trim()) {
      urlStr = urlObj.raw.trim()
    } else {
      // Reconstruct URL from protocol, host, port, path
      const protocol = typeof urlObj.protocol === 'string' ? `${urlObj.protocol}://` : ''

      let hostStr = ''
      if (Array.isArray(urlObj.host)) {
        hostStr = urlObj.host.join('.')
      } else if (typeof urlObj.host === 'string') {
        hostStr = urlObj.host
      }

      const portStr = urlObj.port ? `:${urlObj.port}` : ''

      let pathStr = ''
      if (Array.isArray(urlObj.path)) {
        pathStr = urlObj.path.length > 0 ? `/${urlObj.path.join('/')}` : ''
      } else if (typeof urlObj.path === 'string') {
        pathStr = urlObj.path.startsWith('/') ? urlObj.path : `/${urlObj.path}`
      }

      urlStr = `${protocol}${hostStr}${portStr}${pathStr}`
    }

    // Query parameters from url.query array
    if (Array.isArray(urlObj.query)) {
      urlObj.query.forEach((q: unknown) => {
        if (q && typeof q === 'object') {
          const qObj = q as { key?: string; value?: string; disabled?: boolean; description?: string }
          if (qObj.key !== undefined) {
            queryParams.push({
              id: createId(),
              key: String(qObj.key || ''),
              value: String(qObj.value || ''),
              enabled: !qObj.disabled,
              description: qObj.description ? String(qObj.description) : '',
            })
          }
        }
      })
    } else if (urlStr) {
      const parsed = parseUrlToQueryParams(urlStr)
      queryParams.push(...parsed.params)
    }

    // Path variables from url.variable array
    if (Array.isArray(urlObj.variable)) {
      urlObj.variable.forEach((v: unknown) => {
        if (v && typeof v === 'object') {
          const vObj = v as { key?: string; value?: string; description?: string; disabled?: boolean }
          if (vObj.key !== undefined) {
            pathVars.push({
              id: createId(),
              key: String(vObj.key || ''),
              value: String(vObj.value || ''),
              description: vObj.description ? String(vObj.description) : '',
              enabled: !vObj.disabled,
            })
          }
        }
      })
    }
  }

  return { urlStr, queryParams, pathVars }
}

/**
 * Parses headers and extracts Authorization if not already configured in Auth tab.
 */
export function parsePostmanHeaders(
  rawHeaders: unknown,
  existingAuth: AuthConfig,
): { headersList: KeyValueRow[]; auth: AuthConfig } {
  const headersList: KeyValueRow[] = []
  const auth: AuthConfig = { ...existingAuth }

  const processHeaderItem = (hObj: { key?: string; value?: string; disabled?: boolean; description?: string }) => {
    if (!hObj.key) return
    const key = String(hObj.key).trim()
    const lowerKey = key.toLowerCase()
    const val = String(hObj.value || '').trim()

    // If Authorization header is present and auth is not yet set, extract it to auth tab
    if (lowerKey === 'authorization') {
      if (auth.type === 'none' && val) {
        if (/^bearer\s+/i.test(val)) {
          auth.type = 'bearer'
          auth.bearerToken = val.replace(/^bearer\s+/i, '').trim()
        } else if (val.toLowerCase().startsWith('basic ')) {
          auth.type = 'basic'
          try {
            const decoded = atob(val.slice(6).trim())
            const [u, ...p] = decoded.split(':')
            auth.basicUsername = u || ''
            auth.basicPassword = p.join(':') || ''
          } catch {
            auth.bearerToken = val
          }
        } else {
          auth.type = 'bearer'
          auth.bearerToken = val
        }
      }
      // Filter out Authorization from user headers table to avoid duplicate headers
      return
    }

    headersList.push({
      id: createId(),
      key,
      value: String(hObj.value || ''),
      enabled: !hObj.disabled,
      description: hObj.description ? String(hObj.description) : '',
    })
  }

  if (Array.isArray(rawHeaders)) {
    rawHeaders.forEach((h: unknown) => {
      if (h && typeof h === 'object') {
        processHeaderItem(h as { key?: string; value?: string; disabled?: boolean; description?: string })
      }
    })
  } else if (typeof rawHeaders === 'string' && rawHeaders.trim()) {
    rawHeaders.split('\n').forEach((line) => {
      const idx = line.indexOf(':')
      if (idx > 0) {
        processHeaderItem({
          key: line.slice(0, idx).trim(),
          value: line.slice(idx + 1).trim(),
          disabled: false,
        })
      }
    })
  }

  return { headersList, auth }
}

/**
 * Parses Postman request body payload (raw JSON/text, formdata, urlencoded, graphql).
 */
export function parsePostmanBody(rawBody: unknown): {
  mode: Mode
  bodyType: BodyType
  restBody: string
  rawText: string
  formData: KeyValueRow[]
  urlencoded: KeyValueRow[]
  gqlQuery: string
  gqlVariables: string
} {
  let mode: Mode = 'REST'
  let bodyType: BodyType = 'none'
  let restBody = ''
  let rawText = ''
  const formData: KeyValueRow[] = []
  const urlencoded: KeyValueRow[] = []
  let gqlQuery = ''
  let gqlVariables = '{}'

  if (!rawBody || typeof rawBody !== 'object') {
    return { mode, bodyType, restBody, rawText, formData, urlencoded, gqlQuery, gqlVariables }
  }

  const bodyObj = rawBody as Record<string, unknown>
  const bMode = String(bodyObj.mode || '').toLowerCase()

  if (bMode === 'graphql') {
    mode = 'GRAPHQL'
    if (bodyObj.graphql && typeof bodyObj.graphql === 'object') {
      const gqlObj = bodyObj.graphql as { query?: string; variables?: string }
      gqlQuery = String(gqlObj.query || '')
      gqlVariables = String(gqlObj.variables || '{}')
    } else if (typeof bodyObj.raw === 'string') {
      gqlQuery = bodyObj.raw
    }
  } else if (bMode === 'raw') {
    const rawContent = String(bodyObj.raw || '')
    const language =
      (bodyObj.options as { raw?: { language?: string } } | undefined)?.raw?.language || ''

    if (
      language.toLowerCase() === 'json' ||
      rawContent.trim().startsWith('{') ||
      rawContent.trim().startsWith('[')
    ) {
      bodyType = 'json'
      restBody = rawContent
    } else {
      bodyType = 'raw'
      rawText = rawContent
    }
  } else if (bMode === 'urlencoded' || bMode === 'x-www-form-urlencoded') {
    bodyType = 'x-www-form-urlencoded'
    if (Array.isArray(bodyObj.urlencoded)) {
      bodyObj.urlencoded.forEach((param: unknown) => {
        if (param && typeof param === 'object') {
          const p = param as { key?: string; value?: string; disabled?: boolean; description?: string }
          if (p.key !== undefined) {
            urlencoded.push({
              id: createId(),
              key: String(p.key || ''),
              value: String(p.value || ''),
              enabled: !p.disabled,
              description: p.description ? String(p.description) : '',
            })
          }
        }
      })
    }
  } else if (bMode === 'formdata' || bMode === 'form-data') {
    bodyType = 'form-data'
    if (Array.isArray(bodyObj.formdata)) {
      bodyObj.formdata.forEach((param: unknown) => {
        if (param && typeof param === 'object') {
          const p = param as {
            key?: string
            value?: string
            disabled?: boolean
            description?: string
            type?: string
            src?: string
          }
          if (p.key !== undefined) {
            formData.push({
              id: createId(),
              key: String(p.key || ''),
              value: String(p.value || ''),
              type: p.type === 'file' ? 'file' : 'text',
              fileName: p.src ? String(p.src) : '',
              enabled: !p.disabled,
              description: p.description ? String(p.description) : '',
            })
          }
        }
      })
    }
  }

  return { mode, bodyType, restBody, rawText, formData, urlencoded, gqlQuery, gqlVariables }
}

/**
 * Extracts a complete request item from a Postman node.
 */
export function parsePostmanRequest(
  itemObj: Record<string, unknown>,
  collectionId: string,
  folderId: string | null,
  inheritedAuth?: AuthConfig | null,
): SavedRequestItem {
  const reqObj = (
    typeof itemObj.request === 'object' && itemObj.request ? itemObj.request : {}
  ) as Record<string, unknown>
  const name = String(itemObj.name || reqObj.name || 'Untitled Request').trim() || 'Untitled Request'

  // 1. Method
  let methodStr = 'GET'
  if (typeof reqObj.method === 'string') {
    methodStr = reqObj.method.toUpperCase()
  } else if (typeof itemObj.request === 'string') {
    const parts = (itemObj.request as string).split(' ')
    if (parts.length > 1) methodStr = parts[0].toUpperCase()
  }
  const method: HttpMethod = (
    ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(methodStr)
      ? methodStr
      : 'GET'
  ) as HttpMethod

  // 2. URL
  let rawUrlInput: unknown = reqObj.url
  if (!rawUrlInput && typeof itemObj.request === 'string') {
    const parts = (itemObj.request as string).split(' ')
    rawUrlInput = parts.length > 1 ? parts[1] : parts[0]
  }
  const { urlStr, queryParams, pathVars } = parsePostmanUrl(rawUrlInput)
  const pathVariables = syncPathVariables(urlStr, pathVars)

  // 3. Auth
  let auth: AuthConfig = {
    type: 'none',
    bearerToken: '',
    basicUsername: '',
    basicPassword: '',
    apiKeyName: '',
    apiKeyValue: '',
    apiKeyAddTo: 'header',
  }
  const reqAuth = parsePostmanAuth(reqObj.auth)
  if (reqAuth) {
    auth = reqAuth
  } else if (inheritedAuth) {
    auth = { ...inheritedAuth }
  }

  // 4. Headers
  const { headersList, auth: updatedAuth } = parsePostmanHeaders(reqObj.header, auth)
  auth = updatedAuth

  // 5. Body
  const {
    mode,
    bodyType,
    restBody,
    rawText,
    formData,
    urlencoded,
    gqlQuery,
    gqlVariables,
  } = parsePostmanBody(reqObj.body)

  // 6. Test Scripts
  let testScript = ''
  if (Array.isArray(itemObj.event)) {
    const testEvent = itemObj.event.find(
      (e: unknown) =>
        e && typeof e === 'object' && (e as { listen?: string }).listen === 'test',
    ) as { script?: { exec?: string | string[] } } | undefined

    if (testEvent?.script?.exec) {
      if (Array.isArray(testEvent.script.exec)) {
        testScript = testEvent.script.exec.join('\n')
      } else if (typeof testEvent.script.exec === 'string') {
        testScript = testEvent.script.exec
      }
    }
  }

  const persistedRequest: PersistedRequestItem = {
    id: createId(),
    name,
    mode,
    method,
    url: urlStr,
    params: queryParams,
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

  return {
    id: createId(),
    collectionId,
    folderId,
    name,
    request: persistedRequest,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Imports a Postman Collection v2.1 JSON string into local Collections, Folders, and Requests.
 */
export function importPostmanCollectionV2(jsonString: string): PostmanImportResult {
  const parsed = JSON.parse(jsonString) as Record<string, unknown>

  // Normalize root collection object (handles both top-level { info, item } and wrapped { collection: { info, item } })
  const root = (
    parsed.collection && typeof parsed.collection === 'object'
      ? parsed.collection
      : parsed
  ) as {
    info?: { name?: string; description?: string }
    name?: string
    description?: string
    item?: unknown[]
    auth?: unknown
  }

  const collectionId = createId()
  const collectionName =
    root.info?.name?.trim() ||
    root.name?.trim() ||
    'Imported Postman Collection'
  const collectionDescription =
    root.info?.description || root.description || ''

  const collection: CollectionItem = {
    id: collectionId,
    name: collectionName,
    description: collectionDescription,
  }

  const folders: FolderItem[] = []
  const requests: SavedRequestItem[] = []

  // Top-level collection auth if configured
  const rootAuth = parsePostmanAuth(root.auth)

  /**
   * Recursively traverses Postman item hierarchy
   */
  function processItemNode(
    node: unknown,
    parentFolderId: string | null = null,
    inheritedAuth: AuthConfig | null = null,
  ) {
    if (!node || typeof node !== 'object') return
    const item = node as Record<string, unknown>

    // Node auth
    const nodeAuth = parsePostmanAuth(item.auth) || inheritedAuth

    // Case 1: Folder node containing `item` array
    if (Array.isArray(item.item)) {
      const folderId = createId()
      const folderName = String(item.name || 'Untitled Folder').trim() || 'Untitled Folder'

      folders.push({
        id: folderId,
        collectionId,
        parentId: parentFolderId,
        name: folderName,
      })

      // Recursively process all children in this folder
      item.item.forEach((child) => processItemNode(child, folderId, nodeAuth))
      return
    }

    // Case 2: Request node containing `request` (or is a request endpoint)
    if (item.request || typeof item.name === 'string') {
      const req = parsePostmanRequest(item, collectionId, parentFolderId, nodeAuth)
      requests.push(req)
    }
  }

  if (Array.isArray(root.item)) {
    root.item.forEach((itemNode) => processItemNode(itemNode, null, rootAuth))
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
