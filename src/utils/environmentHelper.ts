import type { EnvironmentGroup, EnvironmentItem, EnvironmentVariable } from '../types'

export const NO_ENV = 'NO_ENV'

/**
 * Merge group variables into an environment. Environment variables win over
 * group variables with the same key. Group-sourced variables are flagged `inherited`.
 */
export function mergeEnvironmentWithGroup(
  env: EnvironmentItem | null,
  group: EnvironmentGroup | null | undefined,
): EnvironmentItem | null {
  if (!env) return null
  if (!group || group.variables.length === 0) return env

  const envKeys = new Set(
    env.variables.filter((v) => v.enabled && v.key.trim()).map((v) => v.key.trim()),
  )
  const inherited: EnvironmentVariable[] = group.variables
    .filter((v) => v.key.trim() && !envKeys.has(v.key.trim()))
    .map((v) => ({ ...v, inherited: true }))

  return { ...env, variables: [...env.variables, ...inherited] }
}

/**
 * Reverse of mergeEnvironmentWithGroup, used when scripts mutate variables.
 * Inherited variables are dropped unless a script changed their value, in which
 * case they become an environment-level override.
 */
export function stripInheritedVariables(
  env: EnvironmentItem,
  group: EnvironmentGroup | null | undefined,
): EnvironmentItem {
  const variables = env.variables
    .filter((v) => {
      if (!v.inherited) return true
      const original = group?.variables.find((g) => g.key === v.key)
      return !original || original.value !== v.value
    })
    .map((v) => {
      if (!v.inherited) return v
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { inherited, ...rest } = v
      return rest
    })
  return { ...env, variables }
}

/** Environment id that should be active for a collection's group (or the global one). */
export function resolveEffectiveEnvironmentId(
  environments: EnvironmentItem[],
  groupId: string | null | undefined,
  activeEnvByGroup: Record<string, string>,
  globalActiveId: string,
): string {
  if (groupId) {
    const stored = activeEnvByGroup[groupId]
    if (stored === NO_ENV) return NO_ENV
    const inGroup = environments.filter((e) => e.groupId === groupId)
    if (stored && inGroup.some((e) => e.id === stored)) return stored
    return inGroup[0]?.id ?? NO_ENV
  }
  return globalActiveId
}
