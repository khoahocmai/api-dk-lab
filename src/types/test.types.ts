export interface TestResult {
  id: string
  name: string
  passed: boolean
  error?: string
}

export interface TestRunReport {
  total: number
  passed: number
  failed: number
  results: TestResult[]
  envMutations: Record<string, string>
}
