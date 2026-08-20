export type AuthType = 'none' | 'bearer' | 'basic' | 'apiKey'
export type ApiKeyAddTo = 'header' | 'query'

export interface AuthConfig {
  type: AuthType
  bearerToken: string
  basicUsername: string
  basicPassword: string
  apiKeyName: string
  apiKeyValue: string
  apiKeyAddTo: ApiKeyAddTo
}
