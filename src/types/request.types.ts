import type { AuthConfig } from './auth.types'
import type { EnvironmentItem } from './env.types'
import type { HistoryItem } from './history.types'
import type { AppSettings } from './settings.types'
import type { TestRunReport } from './test.types'

export type Mode = 'REST' | 'GRAPHQL'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type RequestEditorTab = 'PARAMS' | 'HEADERS' | 'AUTH' | 'BODY' | 'VARIABLES' | 'TESTS' | 'SCRIPTS'
export type ResponseViewTab = 'PRETTY' | 'HEADERS' | 'TESTS'
export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw'
export type MobileView = 'COLLECTIONS' | 'REQUEST' | 'EXPLORER'
export type SplitLayout = 'horizontal' | 'vertical'
export type SidebarTab = 'COLLECTIONS' | 'ENVIRONMENTS'

export interface KeyValueRow {
  id: string
  key: string
  value: string
  enabled: boolean
  description?: string
  type?: 'text' | 'file'
  fileName?: string
}

export type ResponseState = {
  status?: number
  statusText?: string
  time?: string
  size?: string
  data?: unknown
  error?: string
  details?: unknown
  headers?: Record<string, string | string[]>
  previewTruncated?: boolean
  isNetworkError?: boolean
}

export type RequestItem = {
  id: string
  savedRequestId?: string
  collectionId?: string
  folderId?: string | null
  name: string
  graphqlRootField?: string
  mode: Mode
  method: HttpMethod
  url: string
  params: KeyValueRow[]
  pathVariables?: KeyValueRow[]
  headersList: KeyValueRow[]
  headersText: string
  auth: AuthConfig
  bodyType: BodyType
  restBody: string
  rawText: string
  formData: KeyValueRow[]
  urlencoded: KeyValueRow[]
  gqlQuery: string
  gqlVariables: string
  preRequestScript?: string
  testScript: string
  testResults: TestRunReport | null
  editorTab: RequestEditorTab
  responseTab: ResponseViewTab
  response: ResponseState | null
  loading: boolean
  clientError: string
  savedSnapshot?: string
  isDirty?: boolean
}

export type PersistedRequestItem = Omit<
  RequestItem,
  'response' | 'loading' | 'clientError' | 'testResults'
>

export type CollectionItem = {
  id: string
  name: string
  description?: string
}

export type FolderItem = {
  id: string
  collectionId: string
  parentId?: string | null
  name: string
}

export type SavedRequestItem = {
  id: string
  collectionId: string
  folderId?: string | null
  name: string
  request: PersistedRequestItem
  createdAt: string
  updatedAt: string
}

export type PersistedWorkspace = {
  version: 4
  tabs: PersistedRequestItem[]
  activeTabId: string
  collections: CollectionItem[]
  folders?: FolderItem[]
  savedRequests: SavedRequestItem[]
  expandedCollectionIds: string[]
  expandedFolderIds?: string[]
  environments: EnvironmentItem[]
  activeEnvironmentId: string
  splitLayout?: SplitLayout
  history?: HistoryItem[]
  settings?: AppSettings
  isSidebarCollapsed?: boolean
  isExplorerOpen?: boolean
}

export interface HttpRequestOptions {
  method?: string
  url: string
  headers?: Record<string, string>
  data?: unknown
  timeout?: number
  rejectUnauthorized?: boolean
}

export interface HttpResponseData {
  status?: number
  statusText?: string
  headers?: Record<string, string | string[]>
  data?: unknown
  duration?: number
  size?: string
  error?: string
  details?: unknown
  isNetworkError?: boolean
}
