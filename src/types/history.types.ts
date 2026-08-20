import type { HttpMethod, Mode, PersistedRequestItem, ResponseState } from './request.types'

export interface HistoryItem {
  id: string
  timestamp: string
  method: HttpMethod | 'GQL'
  mode: Mode
  url: string
  status?: number
  duration?: number
  request: PersistedRequestItem
  response?: ResponseState | null
}
