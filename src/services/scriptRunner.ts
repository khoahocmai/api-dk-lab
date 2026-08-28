import type { EnvironmentItem, TestResult, TestRunReport } from '../types'
import { createId } from '../utils/formatters'

export interface ScriptContext {
  environment: Record<string, string>
  request: {
    url: string
    method: string
    headers: Record<string, string>
    body?: any
  }
  response?: {
    status: number
    headers: Record<string, string | string[]>
    body: string
    json: () => any
    responseTime?: number
  }
}

export interface ScriptExecutionResult {
  testResults: Array<{ id: string; name: string; passed: boolean; error?: string }>
  envMutations: Record<string, string>
}

export interface ExpectChain {
  to: {
    equal: (expected: unknown) => void
    eql: (expected: unknown) => void
    deep: { equal: (expected: unknown) => void }
    be: {
      equal: (expected: unknown) => void
      below: (val: number) => void
      above: (val: number) => void
      lessThan: (val: number) => void
      greaterThan: (val: number) => void
      true: boolean
      false: boolean
      null: boolean
      undefined: boolean
      ok: boolean
      a: (type: string) => void
      an: (type: string) => void
    }
    have: {
      property: (prop: string, val?: unknown) => void
      status: (code: number) => void
      header: (name: string, val?: unknown) => void
      length: (len: number) => void
      string: (str: string) => void
    }
    include: (item: unknown) => void
    not: {
      equal: (expected: unknown) => void
      be: {
        below: (val: number) => void
        above: (val: number) => void
        null: boolean
        undefined: boolean
        ok: boolean
      }
      have: {
        property: (prop: string) => void
        header: (name: string) => void
      }
      include: (item: unknown) => void
    }
  }
}

export function createExpect(actual: unknown): ExpectChain {
  const assert = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message)
  }

  return {
    to: {
      equal: (expected: unknown) => {
        assert(actual === expected, `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`)
      },
      eql: (expected: unknown) => {
        assert(
          JSON.stringify(actual) === JSON.stringify(expected),
          `Expected ${JSON.stringify(actual)} to deeply equal ${JSON.stringify(expected)}`,
        )
      },
      deep: {
        equal: (expected: unknown) => {
          assert(
            JSON.stringify(actual) === JSON.stringify(expected),
            `Expected ${JSON.stringify(actual)} to deeply equal ${JSON.stringify(expected)}`,
          )
        },
      },
      be: {
        equal: (expected: unknown) => {
          assert(actual === expected, `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`)
        },
        below: (val: number) => {
          assert(
            typeof actual === 'number' && actual < val,
            `Expected ${Number(actual)} to be below ${val}`,
          )
        },
        above: (val: number) => {
          assert(
            typeof actual === 'number' && actual > val,
            `Expected ${Number(actual)} to be above ${val}`,
          )
        },
        lessThan: (val: number) => {
          assert(
            typeof actual === 'number' && actual < val,
            `Expected ${Number(actual)} to be less than ${val}`,
          )
        },
        greaterThan: (val: number) => {
          assert(
            typeof actual === 'number' && actual > val,
            `Expected ${Number(actual)} to be greater than ${val}`,
          )
        },
        get true() {
          assert(actual === true, `Expected ${JSON.stringify(actual)} to be true`)
          return true
        },
        get false() {
          assert(actual === false, `Expected ${JSON.stringify(actual)} to be false`)
          return false
        },
        get null() {
          assert(actual === null, `Expected ${JSON.stringify(actual)} to be null`)
          return true
        },
        get undefined() {
          assert(actual === undefined, `Expected ${JSON.stringify(actual)} to be undefined`)
          return true
        },
        get ok() {
          assert(Boolean(actual), `Expected ${JSON.stringify(actual)} to be truthy (ok)`)
          return true
        },
        a: (type: string) => {
          assert(typeof actual === type, `Expected ${JSON.stringify(actual)} to be of type ${type}`)
        },
        an: (type: string) => {
          assert(typeof actual === type, `Expected ${JSON.stringify(actual)} to be of type ${type}`)
        },
      },
      have: {
        property: (prop: string, val?: unknown) => {
          assert(
            Boolean(actual && typeof actual === 'object' && prop in (actual as Record<string, unknown>)),
            `Expected object to have property '${prop}'`,
          )
          if (val !== undefined) {
            const propVal = (actual as Record<string, unknown>)[prop]
            assert(
              propVal === val,
              `Expected property '${prop}' to equal ${JSON.stringify(val)}, got ${JSON.stringify(propVal)}`,
            )
          }
        },
        status: (code: number) => {
          assert(actual === code, `Expected status code to be ${code}, got ${Number(actual)}`)
        },
        header: (name: string, val?: unknown) => {
          assert(
            Boolean(actual && typeof actual === 'object'),
            `Expected headers to be an object`,
          )
          const headers = actual as Record<string, unknown>
          const foundKey = Object.keys(headers).find(
            (k) => k.toLowerCase() === name.toLowerCase(),
          )
          assert(Boolean(foundKey), `Expected header '${name}' to be present`)
          if (val !== undefined && foundKey) {
            assert(
              headers[foundKey] === val,
              `Expected header '${name}' to equal ${JSON.stringify(val)}, got ${JSON.stringify(headers[foundKey])}`,
            )
          }
        },
        length: (len: number) => {
          const actualLen = (actual as { length?: number })?.length
          assert(actualLen === len, `Expected length to be ${len}, got ${Number(actualLen)}`)
        },
        string: (str: string) => {
          assert(
            typeof actual === 'string' && actual.includes(str),
            `Expected '${String(actual)}' to contain '${str}'`,
          )
        },
      },
      include: (item: unknown) => {
        if (typeof actual === 'string') {
          assert(actual.includes(String(item)), `Expected '${actual}' to include '${String(item)}'`)
        } else if (Array.isArray(actual)) {
          assert(actual.includes(item), `Expected array to include ${JSON.stringify(item)}`)
        } else if (actual && typeof actual === 'object') {
          assert(String(item) in actual, `Expected object to include key '${String(item)}'`)
        } else {
          throw new Error(`Cannot call include on ${typeof actual}`)
        }
      },
      not: {
        equal: (expected: unknown) => {
          assert(actual !== expected, `Expected ${JSON.stringify(actual)} to not equal ${JSON.stringify(expected)}`)
        },
        be: {
          below: (val: number) => {
            assert(
              typeof actual === 'number' && actual >= val,
              `Expected ${Number(actual)} to not be below ${val}`,
            )
          },
          above: (val: number) => {
            assert(
              typeof actual === 'number' && actual <= val,
              `Expected ${Number(actual)} to not be above ${val}`,
            )
          },
          get null() {
            assert(actual !== null, `Expected value to not be null`)
            return true
          },
          get undefined() {
            assert(actual !== undefined, `Expected value to not be undefined`)
            return true
          },
          get ok() {
            assert(!actual, `Expected value to be falsy`)
            return true
          },
        },
        have: {
          property: (prop: string) => {
            assert(
              Boolean(!actual || typeof actual !== 'object' || !(prop in (actual as Record<string, unknown>))),
              `Expected object to not have property '${prop}'`,
            )
          },
          header: (name: string) => {
            if (actual && typeof actual === 'object') {
              const headers = actual as Record<string, unknown>
              const foundKey = Object.keys(headers).find(
                (k) => k.toLowerCase() === name.toLowerCase(),
              )
              assert(!foundKey, `Expected header '${name}' to not be present`)
            }
          },
        },
        include: (item: unknown) => {
          if (typeof actual === 'string') {
            assert(!actual.includes(String(item)), `Expected '${actual}' to not include '${String(item)}'`)
          } else if (Array.isArray(actual)) {
            assert(!actual.includes(item), `Expected array to not include ${JSON.stringify(item)}`)
          }
        },
      },
    },
  }
}

/**
 * Executes a JavaScript script in a safe function sandbox with simulated Postman (pm) context.
 */
export function executeScript(
  code: string,
  context: ScriptContext,
  onSetEnvironmentVariable: (key: string, value: string) => void,
): ScriptExecutionResult {
  const testResults: Array<{ id: string; name: string; passed: boolean; error?: string }> = []
  const envMutations: Record<string, string> = {}

  if (!code || !code.trim()) {
    return { testResults, envMutations }
  }

  const setEnvValue = (key: string, value: unknown) => {
    if (!key || typeof key !== 'string') return
    const strVal = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '')
    envMutations[key] = strVal
    context.environment[key] = strVal
    onSetEnvironmentVariable(key, strVal)
  }

  const getEnvValue = (key: string): string => {
    if (key in envMutations) return envMutations[key]
    return context.environment[key] ?? ''
  }

  const hasEnvValue = (key: string): boolean => {
    return key in envMutations || key in context.environment
  }

  const unsetEnvValue = (key: string) => {
    delete envMutations[key]
    delete context.environment[key]
    onSetEnvironmentVariable(key, '')
  }

  const pm = {
    environment: {
      get: getEnvValue,
      set: setEnvValue,
      has: hasEnvValue,
      unset: unsetEnvValue,
      toObject: () => ({ ...context.environment, ...envMutations }),
    },
    variables: {
      get: getEnvValue,
      set: setEnvValue,
      has: hasEnvValue,
      unset: unsetEnvValue,
      toObject: () => ({ ...context.environment, ...envMutations }),
    },
    globals: {
      get: getEnvValue,
      set: setEnvValue,
      has: hasEnvValue,
      unset: unsetEnvValue,
      toObject: () => ({ ...context.environment, ...envMutations }),
    },
    request: {
      url: context.request.url,
      method: context.request.method,
      headers: {
        ...(context.request.headers || {}),
        get: (headerName: string) => {
          const lower = headerName.toLowerCase()
          const entry = Object.entries(context.request.headers || {}).find(
            ([k]) => k.toLowerCase() === lower,
          )
          return entry ? entry[1] : undefined
        },
        set: (headerName: string, headerValue: string) => {
          if (context.request.headers) {
            context.request.headers[headerName] = headerValue
          }
        },
        add: (header: { key: string; value: string }) => {
          if (header?.key && context.request.headers) {
            context.request.headers[header.key] = header.value
          }
        },
        has: (headerName: string) => {
          const lower = headerName.toLowerCase()
          return Object.keys(context.request.headers || {}).some((k) => k.toLowerCase() === lower)
        },
      },
      body: context.request.body,
    },
    response: context.response
      ? {
          code: context.response.status,
          status: context.response.status,
          responseTime: context.response.responseTime ?? 0,
          headers: context.response.headers ?? {},
          json: () => context.response!.json(),
          text: () => context.response!.body,
          to: {
            have: {
              status: (code: number) => {
                if (context.response!.status !== code) {
                  throw new Error(
                    `Expected response status code ${code} but got ${context.response!.status}`,
                  )
                }
              },
              header: (name: string, val?: unknown) => {
                const hdrs = context.response!.headers || {}
                const foundKey = Object.keys(hdrs).find(
                  (k) => k.toLowerCase() === name.toLowerCase(),
                )
                if (!foundKey) {
                  throw new Error(`Expected response header '${name}' to be present`)
                }
                if (val !== undefined && hdrs[foundKey] !== val) {
                  throw new Error(
                    `Expected header '${name}' to equal ${JSON.stringify(val)}, got ${JSON.stringify(hdrs[foundKey])}`,
                  )
                }
              },
            },
          },
        }
      : undefined,
    expect: createExpect,
    test: (testName: string, fn: () => void) => {
      try {
        fn()
        testResults.push({ id: createId(), name: testName, passed: true })
      } catch (err: any) {
        testResults.push({
          id: createId(),
          name: testName,
          passed: false,
          error: err?.message || String(err),
        })
      }
    },
    info: {
      eventName: context.response ? 'test' : 'prerequest',
      iteration: 0,
    },
  }

  try {
    const runner = new Function('pm', 'responseBody', 'jsonData', code)
    let resJson: any = null
    if (context.response) {
      try {
        resJson = context.response.json()
      } catch {
        resJson = null
      }
    }
    runner(pm, context.response?.body || '', resJson)
  } catch (e: any) {
    console.error('Script Execution Error:', e)
    testResults.push({
      id: createId(),
      name: context.response ? 'Test Script Execution' : 'Pre-request Script Execution',
      passed: false,
      error: e?.message || String(e),
    })
  }

  return { testResults, envMutations }
}

/**
 * Backwards-compatible test runner for post-response tests
 */
export function runTestScript(
  script: string,
  response: {
    status?: number
    statusText?: string
    duration?: number
    size?: string
    data?: unknown
    headers?: Record<string, string | string[]>
  },
  environment?: EnvironmentItem | null,
): TestRunReport {
  const envDict: Record<string, string> = {}
  if (environment?.variables) {
    environment.variables.forEach((v) => {
      if (v.enabled) envDict[v.key] = v.value
    })
  }

  const responseBodyStr =
    typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data ?? '')

  const jsonFn = () => {
    if (typeof response.data === 'object' && response.data !== null) return response.data
    if (typeof response.data === 'string') {
      try {
        return JSON.parse(response.data)
      } catch {
        return response.data
      }
    }
    return response.data ?? {}
  }

  const context: ScriptContext = {
    environment: envDict,
    request: {
      url: '',
      method: 'GET',
      headers: {},
    },
    response: {
      status: response.status ?? 0,
      headers: response.headers ?? {},
      body: responseBodyStr,
      json: jsonFn,
      responseTime: response.duration ?? 0,
    },
  }

  const result = executeScript(script, context, () => {})

  const passed = result.testResults.filter((r) => r.passed).length
  const failed = result.testResults.filter((r) => !r.passed).length

  return {
    total: result.testResults.length,
    passed,
    failed,
    results: result.testResults as TestResult[],
    envMutations: result.envMutations,
  }
}
