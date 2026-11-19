export type EnvironmentVariable = {
  id: string
  key: string
  value: string
  enabled: boolean
  secret?: boolean
  /** Runtime-only flag: variable comes from the environment group, not the environment itself. */
  inherited?: boolean
}

export type EnvironmentItem = {
  id: string
  name: string
  /** Project (group) this environment belongs to. Empty/undefined = Ungrouped. */
  groupId?: string | null
  variables: EnvironmentVariable[]
}

/** A project that owns several environments and shares common variables between them. */
export type EnvironmentGroup = {
  id: string
  name: string
  variables: EnvironmentVariable[]
}
