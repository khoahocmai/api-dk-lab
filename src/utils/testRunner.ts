import type { EnvironmentItem, TestResult, TestRunReport } from '../types'
import { createId } from './formatters'

interface ExpectChain {
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
      a: (type: string) => void
      an: (type: string) => void
    }
    have: {
      property: (prop: string, val?: unknown) => void
      status: (code: number) => void
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
      }
      have: {
        property: (prop: string) => void
      }
      include: (item: unknown) => void
    }
  }
}

function createExpect(actual: unknown): ExpectChain {
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
        },
        have: {
          property: (prop: string) => {
            assert(
              Boolean(!actual || typeof actual !== 'object' || !(prop in (actual as Record<string, unknown>))),
              `Expected object to not have property '${prop}'`,
            )
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
 * Runs test script in sandbox with simulated Postman (pm) environment.
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
  const results: TestResult[] = []
  const envMutations: Record<string, string> = {}

  if (!script.trim()) {
    return { total: 0, passed: 0, failed: 0, results: [], envMutations: {} }
  }

  const pm = {
    test: (name: string, fn: () => void) => {
      try {
        fn()
        results.push({
          id: createId(),
          name,
          passed: true,
        })
      } catch (error) {
        results.push({
          id: createId(),
          name,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    },
    expect: createExpect,
    response: {
      code: response.status ?? 0,
      status: response.statusText ?? '',
      responseTime: response.duration ?? 0,
      headers: response.headers ?? {},
      json: () => {
        if (typeof response.data === 'string') {
          return JSON.parse(response.data)
        }
        return response.data ?? {}
      },
      text: () => {
        if (typeof response.data === 'string') return response.data
        return JSON.stringify(response.data ?? '')
      },
      to: {
        have: {
          status: (code: number) => {
            if (response.status !== code) {
              throw new Error(`Expected response status code ${code} but got ${response.status ?? 'undefined'}`)
            }
          },
        },
      },
    },
    environment: {
      set: (key: string, value: unknown) => {
        if (key && typeof key === 'string') {
          const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
          envMutations[key] = strVal
        }
      },
      get: (key: string): string => {
        if (key in envMutations) return envMutations[key]
        return environment?.variables.find((v) => v.enabled && v.key === key)?.value ?? ''
      },
      has: (key: string): boolean => {
        if (key in envMutations) return true
        return Boolean(environment?.variables.some((v) => v.enabled && v.key === key))
      },
    },
  }

  try {
    const runFn = new Function('pm', script)
    runFn(pm)
  } catch (error) {
    results.push({
      id: createId(),
      name: 'Script Compilation / Execution',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length

  return {
    total: results.length,
    passed,
    failed,
    results,
    envMutations,
  }
}
