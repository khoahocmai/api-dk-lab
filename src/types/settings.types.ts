export interface AppSettings {
  requestTimeout: number
  disableLocalhostTimeout: boolean
  rejectUnauthorized: boolean
  editorFontSize: number
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  requestTimeout: 30000,
  disableLocalhostTimeout: false,
  rejectUnauthorized: true,
  editorFontSize: 13,
}
