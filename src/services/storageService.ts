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
  const defaultHeaders = `{\n  "Content-Type": "application/json"\n}`
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
    headersList: parseHeadersTextToRows(defaultHeaders),
    headersText: defaultHeaders,
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
  }

  return {
    ...req,
    savedSnapshot: createRequestSnapshot(req),
  }
}

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
  }
}

export function reviveRequest(request: Partial<PersistedRequestItem>): RequestItem {
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

  const headersList: KeyValueRow[] = rawHeadersList.map((h: any) => ({
    id: h.id || createId(),
    key: h.key ?? '',
    value: h.value ?? '',
    enabled: (!h.key?.trim() && !h.value?.trim()) ? false : (h.enabled ?? true),
    description: h.description ?? '',
  }))

  const headersText =
    request.headersText !== undefined
      ? request.headersText
      : convertRowsToHeadersJson(headersList)

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
    bodyType: request.bodyType ?? 'json',
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
  }

  return {
    ...res,
    savedSnapshot: request.savedSnapshot || createRequestSnapshot(res),
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

    return {
      collections,
      folders: Array.isArray(data.folders) ? data.folders : [],
      savedRequests: Array.isArray(data.savedRequests) ? data.savedRequests : [],
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
  rejectUnauthorized?: boolean
  editorFontSize?: number
}

export async function loadSettings(): Promise<PersistedSettingsData> {
  const data = await readStorage<RawSettingsFile>(STORAGE_FILES.SETTINGS)
  if (data !== null && typeof data === 'object') {
    const settings: AppSettings =
      data.settings && typeof data.settings === 'object'
        ? {
            requestTimeout: data.settings.requestTimeout ?? DEFAULT_APP_SETTINGS.requestTimeout,
            rejectUnauthorized:
              data.settings.rejectUnauthorized ?? DEFAULT_APP_SETTINGS.rejectUnauthorized,
            editorFontSize: data.settings.editorFontSize ?? DEFAULT_APP_SETTINGS.editorFontSize,
          }
        : {
            requestTimeout: data.requestTimeout ?? DEFAULT_APP_SETTINGS.requestTimeout,
            rejectUnauthorized:
              data.rejectUnauthorized ?? DEFAULT_APP_SETTINGS.rejectUnauthorized,
            editorFontSize: data.editorFontSize ?? DEFAULT_APP_SETTINGS.editorFontSize,
          }

    return {
      settings,
      activeEnvironmentId: data.activeEnvironmentId,
      activeTabId: data.activeTabId,
      tabs: Array.isArray(data.tabs) ? data.tabs : [],
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
