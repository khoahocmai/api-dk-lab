export type EnvironmentVariable = {
  id: string
  key: string
  value: string
  enabled: boolean
  secret?: boolean
}

export type EnvironmentItem = {
  id: string
  name: string
  variables: EnvironmentVariable[]
}
