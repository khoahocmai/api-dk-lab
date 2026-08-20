import type {
  AuthConfig,
  EnvironmentItem,
  Mode,
  PersistedRequestItem,
  PersistedWorkspace,
  RequestItem,
} from '../types'
import { DEFAULT_APP_SETTINGS } from '../types/settings.types'
import { createId } from '../utils/formatters'
import { parseHeadersTextToRows, parseUrlToQueryParams } from '../utils/urlHelper'

export const STORAGE_KEY = 'dk-api-tester:v4'

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
    restBody: `{\n  "name": "DKAPI User"\n}`,
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

export function readPersistedWorkspace(): Partial<PersistedWorkspace> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
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
