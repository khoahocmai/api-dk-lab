export interface AppSettings {
  requestTimeout: number
  rejectUnauthorized: boolean
  editorFontSize: number
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  requestTimeout: 30000,
  rejectUnauthorized: true,
  editorFontSize: 13,
}
