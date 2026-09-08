import type {
  AuthConfig,
  CollectionItem,
  EnvironmentItem,
  FolderItem,
  HistoryItem,
  KeyValueRow,
  Mode,
  PersistedRequestItem,
  PersistedWorkspace,
  RequestItem,
  SavedRequestItem,
  SplitLayout,
} from '../types'
import { AppSettings, DEFAULT_APP_SETTINGS } from '../types/settings.types'
import { createId, createRequestSnapshot } from '../utils/formatters'
import {
  convertRowsToHeadersJson,
  parseHeadersTextToRows,
  parseUrlToQueryParams,
  syncPathVariables,
} from '../utils/urlHelper'

export const STORAGE_FILES = {
  ENVIRONMENTS: 'environments.json',
  COLLECTIONS: 'collections.json',
  HISTORY: 'history.json',
  SETTINGS: 'settings.json',
} as const

export const STORAGE_KEY = 'api-lab:v4'

export function createDefaultAuth(): AuthConfig {
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

export function createDefaultRequest(mode: Mode = 'REST'): RequestItem {
  const initialUrl = mode === 'GRAPHQL' ? '{{Domain}}/graphql' : ''

  const req: RequestItem = {
    id: createId(),
    name: mode === 'GRAPHQL' ? 'New GraphQL Request' : 'New Request',
    graphqlRootField: mode === 'GRAPHQL' ? 'health' : undefined,
    mode,
    method: mode === 'GRAPHQL' ? 'POST' : 'GET',
    url: initialUrl,
    params: parseUrlToQueryParams(initialUrl).params,
    pathVariables: syncPathVariables(initialUrl, []),
    headersList: [],
    headersText: '{}',
    auth: createDefaultAuth(),
    bodyType: 'none',
    restBody: '',
    rawText: '',
    formData: [],
    urlencoded: [],
    gqlQuery: mode === 'GRAPHQL' ? `query Health {\n  health {\n    message\n  }\n}` : '',
    gqlVariables: '{}',
    preRequestScript: '',
    testScript: '',
    testResults: null,
    editorTab: mode === 'GRAPHQL' ? 'BODY' : 'PARAMS',
    responseTab: 'PRETTY',
    response: null,
    loading: false,
    clientError: '',
    savedRequestId: undefined,
    collectionId: undefined,
    folderId: undefined,
    presets: [],
    activePresetId: undefined,
  }

  return {
    ...req,
    savedSnapshot: createRequestSnapshot(req),
  }
}

export const createDefaultTab = createDefaultRequest

export function createDefaultEnvironment(name: string, domain: string): EnvironmentItem {
  return {
    id: createId(),
    name,
    variables: [
      { id: createId(), key: 'Domain', value: domain, enabled: true },
      { id: createId(), key: 'token', value: '', enabled: true, secret: true },
      { id: createId(), key: 'tenantId', value: '', enabled: true },
    ],
  }
}

export function stripTransientRequest(request: RequestItem): PersistedRequestItem {
  const headersList = Array.isArray(request.headersList) ? request.headersList : []
  const headersText = request.headersText || convertRowsToHeadersJson(headersList)

  return {
    id: request.id,
    savedRequestId: request.savedRequestId,
    collectionId: request.collectionId,
    folderId: request.folderId,
    name: request.name,
    graphqlRootField: request.graphqlRootField,
    mode: request.mode,
    method: request.method,
    url: request.url,
    params: Array.isArray(request.params) ? request.params : [],
    headersList,
    headersText,
    auth: request.auth,
    bodyType: request.bodyType,
    restBody: request.restBody,
    rawText: request.rawText,
    formData: Array.isArray(request.formData) ? request.formData : [],
    urlencoded: Array.isArray(request.urlencoded) ? request.urlencoded : [],
    gqlQuery: request.gqlQuery,
    gqlVariables: request.gqlVariables,
    preRequestScript: request.preRequestScript || '',
    testScript: request.testScript || '',
    editorTab: request.editorTab,
    responseTab: request.responseTab,
    savedSnapshot: request.savedSnapshot,
    presets: Array.isArray(request.presets) ? request.presets : [],
    activePresetId: request.activePresetId,
  }
}

/**
 * Strips redundant auto-generated 'Content-Type: application/json' header from user headers
 * if mode is GRAPHQL or REST body is JSON.
 * Preserves custom Content-Type headers (e.g. 'text/plain', 'application/xml', etc.).
 */
export function stripRedundantContentTypeHeader<T extends Partial<PersistedRequestItem>>(request: T): T {
  if (!request) return request

  const mode = request.mode ?? 'REST'
  const bodyType = request.bodyType ?? (mode === 'GRAPHQL' ? 'none' : 'none')
  const isGraphQL = mode === 'GRAPHQL'
  const isJsonBody = !isGraphQL && bodyType === 'json'

  if (!isGraphQL && !isJsonBody) {
    return request
  }

  let modified = false

  let newHeadersList = request.headersList
  if (Array.isArray(newHeadersList)) {
    const filtered = newHeadersList.filter((h) => {
      const isContentType = h.key?.trim().toLowerCase() === 'content-type'
      const isAppJson = h.value?.trim().toLowerCase() === 'application/json'
      if (isContentType && isAppJson) {
        modified = true
        return false
      }
      return true
    })
    if (modified) {
      newHeadersList = filtered
    }
  }

  let newHeadersText = request.headersText
  if (request.headersText && request.headersText.trim() && request.headersText !== '{}') {
    try {
      const parsed = JSON.parse(request.headersText)
      let textModified = false
      if (typeof parsed === 'object' && parsed !== null) {
        for (const key of Object.keys(parsed)) {
          if (
            key.trim().toLowerCase() === 'content-type' &&
            String(parsed[key]).trim().toLowerCase() === 'application/json'
          ) {
            delete parsed[key]
            textModified = true
          }
        }
      }
      if (textModified) {
        newHeadersText = JSON.stringify(parsed, null, 2)
        modified = true
      }
    } catch {
      // not valid json, ignore
    }
  }

  if (!modified) {
    return request
  }

  const updated: T = {
    ...request,
    headersList: newHeadersList,
    headersText:
      newHeadersText !== undefined
        ? newHeadersText
        : (newHeadersList && newHeadersList.length > 0 ? convertRowsToHeadersJson(newHeadersList) : '{}'),
  }

  if (updated.savedSnapshot) {
    updated.savedSnapshot = createRequestSnapshot(updated as any)
  }

  return updated
}

export function reviveRequest(rawRequest: Partial<PersistedRequestItem>): RequestItem {
  const request = stripRedundantContentTypeHeader(rawRequest)
  const mode = request.mode ?? 'GRAPHQL'
  const def = createDefaultRequest(mode)

  const url = request.url ?? def.url

  // Robustly extract headersList:
  // 1. If request.headersList is defined and an array (even if empty or contains custom headers)
  // 2. Or if request.headers is defined (legacy or Postman format)
  // 3. Or if request.headersText is non-empty
  // 4. Fallback to default headersList
  const rawHeadersList: any[] =
    Array.isArray(request.headersList)
      ? request.headersList
      : Array.isArray((request as any).headers)
      ? (request as any).headers
      : request.headersText && request.headersText.trim() && request.headersText !== '{}'
      ? parseHeadersTextToRows(request.headersText)
      : def.headersList

  let headersList: KeyValueRow[] = rawHeadersList.map((h: any) => ({
    id: h.id || createId(),
    key: h.key ?? '',
    value: h.value ?? '',
    enabled: (!h.key?.trim() && !h.value?.trim()) ? false : (h.enabled ?? true),
    description: h.description ?? '',
  }))

  const bodyType = request.bodyType ?? (mode === 'GRAPHQL' ? 'none' : 'none')
  const isGraphQL = mode === 'GRAPHQL'
  const isJsonBody = !isGraphQL && bodyType === 'json'

  // Migration: Strip redundant Content-Type: application/json from User Headers
  // if request is GraphQL or REST with JSON body
  if (isGraphQL || isJsonBody) {
    headersList = headersList.filter(
      (h) =>
        !(
          h.key?.trim().toLowerCase() === 'content-type' &&
          h.value?.trim().toLowerCase() === 'application/json'
        ),
    )
  }

  const headersText =
    headersList.length > 0
      ? convertRowsToHeadersJson(headersList)
      : '{}'

  const res: RequestItem = {
    ...def,
    ...request,
    graphqlRootField: request.graphqlRootField ?? (mode === 'GRAPHQL' ? def.graphqlRootField : undefined),
    savedRequestId: request.savedRequestId,
    collectionId: request.collectionId,
    folderId: request.folderId,
    url,
    params: Array.isArray(request.params) ? request.params : parseUrlToQueryParams(url).params,
    pathVariables: syncPathVariables(
      url,
      Array.isArray(request.pathVariables) ? request.pathVariables : [],
    ),
    headersList,
    headersText,
    auth: request.auth ?? createDefaultAuth(),
    bodyType,
    formData: Array.isArray(request.formData) ? request.formData : [],
    urlencoded: Array.isArray(request.urlencoded) ? request.urlencoded : [],
    rawText: request.rawText ?? '',
    preRequestScript: request.preRequestScript ?? def.preRequestScript ?? '',
    testScript: request.testScript ?? def.testScript,
    testResults: null,
    editorTab: request.editorTab ?? (mode === 'GRAPHQL' ? 'BODY' : 'PARAMS'),
    responseTab: request.responseTab ?? 'PRETTY',
    response: null,
    loading: false,
    clientError: '',
    presets: Array.isArray(request.presets) ? request.presets : [],
    activePresetId: request.activePresetId,
  }

  // Handle savedSnapshot: if request was not modified before migration, keep it clean
  const cleanSnapshot = createRequestSnapshot(res)
  let savedSnapshot = request.savedSnapshot
  if (!savedSnapshot) {
    savedSnapshot = cleanSnapshot
  } else {
    // If previous snapshot matches rawRequest (up to redundant header stripping), update to cleanSnapshot
    const rawSnapshot = createRequestSnapshot(rawRequest as any)
    if (savedSnapshot === rawSnapshot) {
      savedSnapshot = cleanSnapshot
    }
  }

  return {
    ...res,
    savedSnapshot,
  }
}

export function stripSecretValues(environments: EnvironmentItem[]): EnvironmentItem[] {
  return environments
}

// ----------------------------------------------------------------------
// Core JSON File Storage API (Desktop IPC with Web localStorage Fallback)
// ----------------------------------------------------------------------

export async function readStorage<T = unknown>(fileName: string): Promise<T | null> {
  // 1. Electron Desktop IPC
  if (window.desktopApi?.readStorage) {
    try {
      const data = await window.desktopApi.readStorage<T>(fileName)
      return data ?? null
    } catch (error) {
      console.error(`[Storage] Failed to read ${fileName} via desktopApi:`, error)
      return null
    }
  }

  // 2. Web browser fallback (localStorage)
  try {
    const raw = localStorage.getItem(`api-lab:${fileName}`)
    if (raw && raw.trim()) {
      return JSON.parse(raw) as T
    }

    // Check legacy v4 storage for migration in web mode
    const legacyRaw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('dk-api-tester:v4')
    if (legacyRaw) {
      const parsedLegacy = JSON.parse(legacyRaw) as Record<string, unknown>
      if (fileName === STORAGE_FILES.ENVIRONMENTS && Array.isArray(parsedLegacy.environments)) {
        return parsedLegacy.environments as unknown as T
      }
      if (fileName === STORAGE_FILES.COLLECTIONS && Array.isArray(parsedLegacy.collections)) {
        return {
          collections: parsedLegacy.collections,
          folders: parsedLegacy.folders || [],
          savedRequests: parsedLegacy.savedRequests || [],
          expandedCollectionIds: parsedLegacy.expandedCollectionIds || [],
          expandedFolderIds: parsedLegacy.expandedFolderIds || [],
        } as unknown as T
      }
      if (fileName === STORAGE_FILES.HISTORY && Array.isArray(parsedLegacy.history)) {
        return parsedLegacy.history as unknown as T
      }
      if (fileName === STORAGE_FILES.SETTINGS) {
        return {
          settings: parsedLegacy.settings || DEFAULT_APP_SETTINGS,
          activeEnvironmentId: parsedLegacy.activeEnvironmentId,
          activeTabId: parsedLegacy.activeTabId,
          tabs: parsedLegacy.tabs,
          splitLayout: parsedLegacy.splitLayout,
          isSidebarCollapsed: parsedLegacy.isSidebarCollapsed,
          isExplorerOpen: parsedLegacy.isExplorerOpen,
        } as unknown as T
      }
    }
    return null
  } catch (error) {
    console.error(`[Storage] Failed to read ${fileName} from localStorage fallback:`, error)
    return null
  }
}

export async function writeStorage<T = unknown>(fileName: string, data: T): Promise<boolean> {
  if (data === undefined) {
    return false
  }

  // 1. Electron Desktop IPC
  if (window.desktopApi?.writeStorage) {
    try {
      return await window.desktopApi.writeStorage(fileName, data)
    } catch (error) {
      console.error(`[Storage] Failed to write ${fileName} via desktopApi:`, error)
      return false
    }
  }

  // 2. Web browser fallback (localStorage)
  try {
    localStorage.setItem(`api-lab:${fileName}`, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error(`[Storage] Failed to write ${fileName} to localStorage fallback:`, error)
    return false
  }
}

// ----------------------------------------------------------------------
// Domain Specific Loaders & Savers
// ----------------------------------------------------------------------

export async function loadEnvironments(): Promise<{ environments: EnvironmentItem[]; isNew: boolean }> {
  const data = await readStorage<EnvironmentItem[]>(STORAGE_FILES.ENVIRONMENTS)
  if (data !== null && Array.isArray(data) && data.length > 0) {
    return { environments: data, isNew: false }
  }

  // File does not exist yet (first launch) -> return defaults in memory without eager write
  const defaultEnvs: EnvironmentItem[] = [
    createDefaultEnvironment('Local', 'http://localhost:3030'),
    createDefaultEnvironment('Dev', 'https://dev.example.com'),
  ]
  return { environments: defaultEnvs, isNew: true }
}

export async function saveEnvironments(environments: EnvironmentItem[]): Promise<boolean> {
  return await writeStorage(STORAGE_FILES.ENVIRONMENTS, environments)
}

export interface PersistedCollectionsData {
  collections: CollectionItem[]
  folders?: FolderItem[]
  savedRequests?: SavedRequestItem[]
  expandedCollectionIds?: string[]
  expandedFolderIds?: string[]
}

export async function loadCollections(): Promise<PersistedCollectionsData> {
  const data = await readStorage<PersistedCollectionsData | CollectionItem[]>(STORAGE_FILES.COLLECTIONS)
  if (data !== null) {
    if (Array.isArray(data)) {
      return {
        collections: data.length > 0 ? data : [{ id: createId(), name: 'Default Collection' }],
        folders: [],
        savedRequests: [],
        expandedCollectionIds: data[0] ? [data[0].id] : [],
        expandedFolderIds: [],
      }
    }
    const collections =
      Array.isArray(data.collections) && data.collections.length > 0
        ? data.collections
        : [{ id: createId(), name: 'Default Collection' }]

    const rawSavedRequests = Array.isArray(data.savedRequests) ? data.savedRequests : []
    const savedRequests = rawSavedRequests.map((sr) => {
      if (sr && sr.request) {
        return {
          ...sr,
          request: stripRedundantContentTypeHeader(sr.request),
        }
      }
      return sr
    })

    return {
      collections,
      folders: Array.isArray(data.folders) ? data.folders : [],
      savedRequests,
      expandedCollectionIds:
        Array.isArray(data.expandedCollectionIds) && data.expandedCollectionIds.length > 0
          ? data.expandedCollectionIds
          : [collections[0].id],
      expandedFolderIds: Array.isArray(data.expandedFolderIds) ? data.expandedFolderIds : [],
    }
  }

  // First launch or missing file -> return default collection in memory WITHOUT overwriting disk
  const defaultId = createId()
  return {
    collections: [{ id: defaultId, name: 'Default Collection' }],
    folders: [],
    savedRequests: [],
    expandedCollectionIds: [defaultId],
    expandedFolderIds: [],
  }
}

export async function saveCollections(data: PersistedCollectionsData): Promise<boolean> {
  return await writeStorage(STORAGE_FILES.COLLECTIONS, data)
}

export async function loadHistory(): Promise<HistoryItem[]> {
  const data = await readStorage<HistoryItem[]>(STORAGE_FILES.HISTORY)
  if (data !== null && Array.isArray(data)) {
    return data
  }
  return []
}

export async function saveHistory(history: HistoryItem[]): Promise<boolean> {
  return await writeStorage(STORAGE_FILES.HISTORY, history)
}

export interface PersistedSettingsData {
  settings: AppSettings
  activeEnvironmentId?: string
  activeTabId?: string
  tabs?: PersistedRequestItem[]
  splitLayout?: SplitLayout
  isSidebarCollapsed?: boolean
  isExplorerOpen?: boolean
}

type RawSettingsFile = Partial<PersistedSettingsData> & {
  requestTimeout?: number
  disableLocalhostTimeout?: boolean
  rejectUnauthorized?: boolean
  editorFontSize?: number
}

export async function loadSettings(): Promise<PersistedSettingsData> {
  const data = await readStorage<RawSettingsFile>(STORAGE_FILES.SETTINGS)
  if (data !== null && typeof data === 'object') {
    const settings: AppSettings =
      data.settings && typeof data.settings === 'object'
        ? {
            requestTimeout:
              data.settings.requestTimeout !== undefined
                ? Number(data.settings.requestTimeout)
                : DEFAULT_APP_SETTINGS.requestTimeout,
            disableLocalhostTimeout:
              data.settings.disableLocalhostTimeout ??
              DEFAULT_APP_SETTINGS.disableLocalhostTimeout,
            rejectUnauthorized:
              data.settings.rejectUnauthorized ?? DEFAULT_APP_SETTINGS.rejectUnauthorized,
            editorFontSize: data.settings.editorFontSize ?? DEFAULT_APP_SETTINGS.editorFontSize,
          }
        : {
            requestTimeout:
              data.requestTimeout !== undefined
                ? Number(data.requestTimeout)
                : DEFAULT_APP_SETTINGS.requestTimeout,
            disableLocalhostTimeout:
              data.disableLocalhostTimeout ??
              DEFAULT_APP_SETTINGS.disableLocalhostTimeout,
            rejectUnauthorized:
              data.rejectUnauthorized ?? DEFAULT_APP_SETTINGS.rejectUnauthorized,
            editorFontSize: data.editorFontSize ?? DEFAULT_APP_SETTINGS.editorFontSize,
          }

    return {
      settings,
      activeEnvironmentId: data.activeEnvironmentId,
      activeTabId: data.activeTabId,
      tabs: Array.isArray(data.tabs) ? data.tabs.map((tab) => stripRedundantContentTypeHeader(tab)) : [],
      splitLayout: data.splitLayout,
      isSidebarCollapsed: data.isSidebarCollapsed,
      isExplorerOpen: data.isExplorerOpen,
    }
  }

  return {
    settings: DEFAULT_APP_SETTINGS,
    activeEnvironmentId: '',
    activeTabId: '',
    tabs: [],
    splitLayout: 'horizontal',
    isSidebarCollapsed: false,
    isExplorerOpen: false,
  }
}

export async function saveSettings(data: PersistedSettingsData): Promise<boolean> {
  return await writeStorage(STORAGE_FILES.SETTINGS, data)
}

export async function loadAllWorkspaceData(): Promise<{
  environments: EnvironmentItem[]
  collectionsData: PersistedCollectionsData
  history: HistoryItem[]
  settingsData: PersistedSettingsData
}> {
  const [envRes, collectionsData, history, settingsData] = await Promise.all([
    loadEnvironments(),
    loadCollections(),
    loadHistory(),
    loadSettings(),
  ])

  return {
    environments: envRes.environments,
    collectionsData,
    history,
    settingsData,
  }
}

// Deprecated legacy helpers for backwards compatibility
export function readPersistedWorkspace(): Partial<PersistedWorkspace> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('dk-api-tester:v4')
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedWorkspace>
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.settings) {
      parsed.settings = DEFAULT_APP_SETTINGS
    }
    return parsed
  } catch {
    return null
  }
}

export function savePersistedWorkspace(workspace: PersistedWorkspace): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
  } catch (error) {
    console.error('Failed to save workspace to localStorage', error)
  }
}
