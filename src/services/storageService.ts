import type {
  AuthConfig,
  CollectionItem,
  EnvironmentItem,
  FolderItem,
  HistoryItem,
  Mode,
  PersistedRequestItem,
  PersistedWorkspace,
  RequestItem,
  SavedRequestItem,
  SplitLayout,
} from '../types'
import { AppSettings, DEFAULT_APP_SETTINGS } from '../types/settings.types'
import { createId } from '../utils/formatters'
import { parseHeadersTextToRows, parseUrlToQueryParams } from '../utils/urlHelper'

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

export function createDefaultRequest(mode: Mode = 'GRAPHQL'): RequestItem {
  const defaultHeaders = `{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer {{token}}"\n}`
  const initialUrl = mode === 'GRAPHQL' ? '{{Domain}}/graphql' : '{{Domain}}/api'

  return {
    id: createId(),
    name: mode === 'GRAPHQL' ? 'New GraphQL' : 'New REST Request',
    mode,
    method: mode === 'GRAPHQL' ? 'POST' : 'GET',
    url: initialUrl,
    params: parseUrlToQueryParams(initialUrl).params,
    headersList: parseHeadersTextToRows(defaultHeaders),
    headersText: defaultHeaders,
    auth: createDefaultAuth(),
    bodyType: 'json',
    restBody: `{\n  "name": "API Lab User"\n}`,
    rawText: '',
    formData: [],
    urlencoded: [],
    gqlQuery: `query Health {\n  health {\n    message\n  }\n}`,
    gqlVariables: '{}',
    testScript: `pm.test("Status code is 200", function () {\n    pm.response.to.have.status(200);\n});`,
    testResults: null,
    editorTab: mode === 'GRAPHQL' ? 'BODY' : 'PARAMS',
    responseTab: 'PRETTY',
    response: null,
    loading: false,
    clientError: '',
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
  return {
    id: request.id,
    name: request.name,
    mode: request.mode,
    method: request.method,
    url: request.url,
    params: request.params,
    headersList: request.headersList,
    headersText: request.headersText,
    auth: request.auth,
    bodyType: request.bodyType,
    restBody: request.restBody,
    rawText: request.rawText,
    formData: request.formData,
    urlencoded: request.urlencoded,
    gqlQuery: request.gqlQuery,
    gqlVariables: request.gqlVariables,
    testScript: request.testScript,
    editorTab: request.editorTab,
    responseTab: request.responseTab,
  }
}

export function reviveRequest(request: Partial<PersistedRequestItem>): RequestItem {
  const mode = request.mode ?? 'GRAPHQL'
  const def = createDefaultRequest(mode)

  const url = request.url ?? def.url
  const headersText = request.headersText ?? def.headersText

  return {
    ...def,
    ...request,
    url,
    params: request.params ?? parseUrlToQueryParams(url).params,
    headersList:
      request.headersList && request.headersList.length > 0
        ? request.headersList
        : parseHeadersTextToRows(headersText),
    headersText,
    auth: request.auth ?? createDefaultAuth(),
    bodyType: request.bodyType ?? 'json',
    formData: request.formData ?? [],
    urlencoded: request.urlencoded ?? [],
    rawText: request.rawText ?? '',
    testScript: request.testScript ?? def.testScript,
    testResults: null,
    editorTab: request.editorTab ?? (mode === 'GRAPHQL' ? 'BODY' : 'PARAMS'),
    responseTab: request.responseTab ?? 'PRETTY',
    response: null,
    loading: false,
    clientError: '',
  }
}

export function stripSecretValues(environments: EnvironmentItem[]): EnvironmentItem[] {
  return environments.map((env) => ({
    ...env,
    variables: env.variables.map((item) => ({
      ...item,
      value: item.secret ? '' : item.value,
    })),
  }))
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
    if (raw) {
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
    localStorage.setItem(`api-lab:${fileName}`, JSON.stringify(data))
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
  if (data !== null && Array.isArray(data)) {
    return { environments: data, isNew: false }
  }

  // File does not exist yet (first launch) -> initialize defaults and create file
  const defaultEnvs: EnvironmentItem[] = [
    createDefaultEnvironment('Local', 'http://localhost:3030'),
    createDefaultEnvironment('Dev', 'https://dev.example.com'),
  ]
  await writeStorage(STORAGE_FILES.ENVIRONMENTS, stripSecretValues(defaultEnvs))
  return { environments: defaultEnvs, isNew: true }
}

export async function saveEnvironments(environments: EnvironmentItem[]): Promise<boolean> {
  return await writeStorage(STORAGE_FILES.ENVIRONMENTS, stripSecretValues(environments))
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
        collections: data,
        folders: [],
        savedRequests: [],
        expandedCollectionIds: data[0] ? [data[0].id] : [],
        expandedFolderIds: [],
      }
    }
    return {
      collections: Array.isArray(data.collections) ? data.collections : [],
      folders: Array.isArray(data.folders) ? data.folders : [],
      savedRequests: Array.isArray(data.savedRequests) ? data.savedRequests : [],
      expandedCollectionIds: Array.isArray(data.expandedCollectionIds) ? data.expandedCollectionIds : [],
      expandedFolderIds: Array.isArray(data.expandedFolderIds) ? data.expandedFolderIds : [],
    }
  }

  // File does not exist yet -> initialize default collection and create file
  const defaultCollections: PersistedCollectionsData = {
    collections: [{ id: createId(), name: 'Default Collection' }],
    folders: [],
    savedRequests: [],
    expandedCollectionIds: [],
    expandedFolderIds: [],
  }
  defaultCollections.expandedCollectionIds = [defaultCollections.collections[0].id]
  await writeStorage(STORAGE_FILES.COLLECTIONS, defaultCollections)
  return defaultCollections
}

export async function saveCollections(data: PersistedCollectionsData): Promise<boolean> {
  return await writeStorage(STORAGE_FILES.COLLECTIONS, data)
}

export async function loadHistory(): Promise<HistoryItem[]> {
  const data = await readStorage<HistoryItem[]>(STORAGE_FILES.HISTORY)
  if (data !== null && Array.isArray(data)) {
    return data
  }

  const defaultHistory: HistoryItem[] = []
  await writeStorage(STORAGE_FILES.HISTORY, defaultHistory)
  return defaultHistory
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
    const settings: AppSettings = data.settings && typeof data.settings === 'object'
      ? {
          requestTimeout: data.settings.requestTimeout ?? DEFAULT_APP_SETTINGS.requestTimeout,
          rejectUnauthorized: data.settings.rejectUnauthorized ?? DEFAULT_APP_SETTINGS.rejectUnauthorized,
          editorFontSize: data.settings.editorFontSize ?? DEFAULT_APP_SETTINGS.editorFontSize,
        }
      : {
          requestTimeout: data.requestTimeout ?? DEFAULT_APP_SETTINGS.requestTimeout,
          rejectUnauthorized: data.rejectUnauthorized ?? DEFAULT_APP_SETTINGS.rejectUnauthorized,
          editorFontSize: data.editorFontSize ?? DEFAULT_APP_SETTINGS.editorFontSize,
        }

    return {
      settings,
      activeEnvironmentId: data.activeEnvironmentId,
      activeTabId: data.activeTabId,
      tabs: Array.isArray(data.tabs) ? data.tabs : undefined,
      splitLayout: data.splitLayout,
      isSidebarCollapsed: data.isSidebarCollapsed,
      isExplorerOpen: data.isExplorerOpen,
    }
  }

  const defaultTabs = [stripTransientRequest(createDefaultRequest('GRAPHQL'))]
  const defaultSettingsData: PersistedSettingsData = {
    settings: DEFAULT_APP_SETTINGS,
    activeEnvironmentId: '',
    activeTabId: defaultTabs[0].id,
    tabs: defaultTabs,
    splitLayout: 'horizontal',
    isSidebarCollapsed: false,
    isExplorerOpen: false,
  }
  await writeStorage(STORAGE_FILES.SETTINGS, defaultSettingsData)
  return defaultSettingsData
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
