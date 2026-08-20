import { useEffect, useMemo, useRef, useState } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import type {
  AppSettings,
  CollectionItem,
  EnvironmentItem,
  EnvironmentVariable,
  FolderItem,
  GraphExplorerState,
  GraphField,
  HistoryItem,
  HttpRequestOptions,
  MobileView,
  Mode,
  PersistedWorkspace,
  RequestItem,
  ResponseState,
  SavedRequestItem,
  SplitLayout,
} from './types'
import { DEFAULT_APP_SETTINGS } from './types/settings.types'
import {
  createId,
  formatJsonSafely,
  parseJsonObject,
} from './utils/formatters'
import {
  injectAuthToHeaders,
  injectAuthToUrl,
  resolveHeadersList,
  resolveTemplates,
  shouldWarnDomainMismatch,
} from './services/templateService'
import { sendHttpRequest } from './services/httpService'
import {
  createDefaultEnvironment,
  createDefaultRequest,
  readPersistedWorkspace,
  reviveRequest,
  savePersistedWorkspace,
  stripSecretValues,
  stripTransientRequest,
} from './services/storageService'
import {
  buildGraphOperationFromFields,
  fetchGraphQLSchema,
  getGraphFieldKey,
} from './services/graphqlService'
import { parseUrlToQueryParams } from './utils/urlHelper'
import { parseCurlCommand } from './utils/curlHelper'
import { exportPostmanCollectionV2, importPostmanCollectionV2 } from './utils/postmanHelper'
import { runTestScript } from './utils/testRunner'
import { MobileNav } from './components/layout/MobileNav'
import { Sidebar } from './components/layout/Sidebar'
import { MainPanel } from './components/layout/MainPanel'
import { ExplorerPanel } from './components/layout/ExplorerPanel'
import { Modal } from './components/common/Modal'
import { SettingsModal } from './components/settings/SettingsModal'
import { CodeSnippetModal } from './components/common/CodeSnippetModal'

const MAX_HISTORY_ITEMS = 100

function App() {
  const [tabs, setTabs] = useState<RequestItem[]>([createDefaultRequest('GRAPHQL')])
  const [activeTabId, setActiveTabId] = useState('')
  const [collections, setCollections] = useState<CollectionItem[]>([
    { id: createId(), name: 'Default Collection' },
  ])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [savedRequests, setSavedRequests] = useState<SavedRequestItem[]>([])
  const [expandedCollectionIds, setExpandedCollectionIds] = useState<string[]>([])
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([])
  const [environments, setEnvironments] = useState<EnvironmentItem[]>([
    createDefaultEnvironment('Local', 'http://localhost:3030'),
    createDefaultEnvironment('Dev', 'https://dev.example.com'),
  ])
  const [activeEnvironmentId, setActiveEnvironmentId] = useState('')
  const [mobileView, setMobileView] = useState<MobileView>('REQUEST')
  const [splitLayout, setSplitLayout] = useState<SplitLayout>('horizontal')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isExplorerOpen, setIsExplorerOpen] = useState(false)

  // Modal States
  const [importCurlModalOpen, setImportCurlModalOpen] = useState(false)
  const [importCurlText, setImportCurlText] = useState('')
  const [importPostmanModalOpen, setImportPostmanModalOpen] = useState(false)
  const [importPostmanText, setImportPostmanText] = useState('')
  const [newCollectionModalOpen, setNewCollectionModalOpen] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [folderTarget, setFolderTarget] = useState<{ collectionId: string; parentId: string | null }>({
    collectionId: '',
    parentId: null,
  })
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [codeSnippetModalOpen, setCodeSnippetModalOpen] = useState(false)

  const [graphExplorer, setGraphExplorer] = useState<GraphExplorerState>({
    loading: false,
    error: '',
    search: '',
    activeTab: 'QUERY',
    queryFields: [],
    mutationFields: [],
  })
  const [selectedGraphFieldKeys, setSelectedGraphFieldKeys] = useState<string[]>([])

  const isSendingRef = useRef(false)
  const didHydrateRef = useRef(false)

  const activeTab = useMemo(
    () => tabs.find((item) => item.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId],
  )

  const activeEnvironment = useMemo(
    () =>
      environments.find((item) => item.id === activeEnvironmentId) ??
      environments[0] ??
      null,
    [environments, activeEnvironmentId],
  )

  const domainWarning = useMemo(
    () => shouldWarnDomainMismatch(activeTab, activeEnvironment),
    [activeTab, activeEnvironment],
  )

  const currentGraphOperationKind =
    graphExplorer.activeTab === 'MUTATION' ? 'mutation' : 'query'

  const currentExplorerFields = useMemo(
    () =>
      currentGraphOperationKind === 'mutation'
        ? graphExplorer.mutationFields
        : graphExplorer.queryFields,
    [currentGraphOperationKind, graphExplorer.mutationFields, graphExplorer.queryFields],
  )

  const selectedExplorerFields = useMemo(
    () =>
      currentExplorerFields.filter((field) =>
        selectedGraphFieldKeys.includes(
          getGraphFieldKey(currentGraphOperationKind, field.name),
        ),
      ),
    [currentExplorerFields, currentGraphOperationKind, selectedGraphFieldKeys],
  )

  const previewUrl = useMemo(() => {
    if (!activeTab) return ''
    return resolveTemplates(activeTab.url, activeEnvironment)
  }, [activeTab, activeEnvironment])

  useEffect(() => {
    const saved = readPersistedWorkspace()

    if (saved?.tabs?.length) {
      setTabs(saved.tabs.map(reviveRequest))
      setActiveTabId(saved.activeTabId || saved.tabs[0].id)
    }

    if (saved?.collections?.length) setCollections(saved.collections)
    if (saved?.folders?.length) setFolders(saved.folders)
    if (saved?.savedRequests) setSavedRequests(saved.savedRequests)
    if (saved?.expandedCollectionIds) setExpandedCollectionIds(saved.expandedCollectionIds)
    if (saved?.expandedFolderIds) setExpandedFolderIds(saved.expandedFolderIds)
    if (saved?.environments?.length) setEnvironments(saved.environments)
    if (saved?.activeEnvironmentId) setActiveEnvironmentId(saved.activeEnvironmentId)
    if (saved?.splitLayout) setSplitLayout(saved.splitLayout)
    if (saved?.history) setHistory(saved.history)
    if (saved?.settings) setSettings(saved.settings)
    if (saved?.isSidebarCollapsed !== undefined) setIsSidebarCollapsed(saved.isSidebarCollapsed)
    if (saved?.isExplorerOpen !== undefined) setIsExplorerOpen(saved.isExplorerOpen)

    didHydrateRef.current = true
  }, [])

  useEffect(() => {
    if (!activeTabId && tabs[0]) setActiveTabId(tabs[0].id)
    if (!activeEnvironmentId && environments[0]) setActiveEnvironmentId(environments[0].id)
    if (!expandedCollectionIds.length && collections[0]) {
      setExpandedCollectionIds([collections[0].id])
    }
  }, [
    tabs,
    activeTabId,
    environments,
    activeEnvironmentId,
    collections,
    expandedCollectionIds.length,
  ])

  useEffect(() => {
    if (!didHydrateRef.current) return

    const timeout = window.setTimeout(() => {
      const payload: PersistedWorkspace = {
        version: 4,
        tabs: tabs.map(stripTransientRequest),
        activeTabId,
        collections,
        folders,
        savedRequests,
        expandedCollectionIds,
        expandedFolderIds,
        environments: stripSecretValues(environments),
        activeEnvironmentId,
        splitLayout,
        history,
        settings,
        isSidebarCollapsed,
        isExplorerOpen,
      }

      savePersistedWorkspace(payload)
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [
    tabs,
    activeTabId,
    collections,
    folders,
    savedRequests,
    expandedCollectionIds,
    expandedFolderIds,
    environments,
    activeEnvironmentId,
    splitLayout,
    history,
    settings,
    isSidebarCollapsed,
    isExplorerOpen,
  ])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const cmdOrCtrl = event.metaKey || event.ctrlKey
      if (!cmdOrCtrl) return

      if (event.key.toLowerCase() === 'b') {
        event.preventDefault()
        setIsSidebarCollapsed((prev) => !prev)
        return
      }

      if (!activeTab) return

      if (event.key === 'Enter') {
        event.preventDefault()
        void handleSend()
      }

      if (event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveCurrentRequest()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeEnvironment, tabs, collections, savedRequests])

  const updateActiveTab = (patch: Partial<RequestItem>) => {
    if (!activeTab) return
    setTabs((current) =>
      current.map((item) => (item.id === activeTab.id ? { ...item, ...patch } : item)),
    )
  }

  const addTab = (mode: Mode = 'GRAPHQL') => {
    const next = createDefaultRequest(mode)
    setTabs((current) => [...current, next])
    setActiveTabId(next.id)
    setMobileView('REQUEST')
  }

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) return
    const currentIndex = tabs.findIndex((item) => item.id === tabId)
    const nextTabs = tabs.filter((item) => item.id !== tabId)
    setTabs(nextTabs)
    if (activeTabId === tabId) {
      setActiveTabId(nextTabs[Math.max(0, currentIndex - 1)]?.id || nextTabs[0].id)
    }
  }

  const duplicateTab = (source: RequestItem = activeTab) => {
    if (!source) return
    const duplicate: RequestItem = {
      ...source,
      id: createId(),
      name: `${source.name} Copy`,
      response: null,
      loading: false,
      clientError: '',
      testResults: null,
    }
    setTabs((current) => [...current, duplicate])
    setActiveTabId(duplicate.id)
  }

  const saveCurrentRequest = () => {
    if (!activeTab || !collections[0]) return

    const existing = savedRequests.find(
      (item) => item.name === activeTab.name && item.collectionId === collections[0].id,
    )
    const payload = stripTransientRequest(activeTab)

    if (existing) {
      setSavedRequests((current) =>
        current.map((item) =>
          item.id === existing.id
            ? { ...item, request: payload, updatedAt: new Date().toISOString() }
            : item,
        ),
      )
      return
    }

    setSavedRequests((current) => [
      ...current,
      {
        id: createId(),
        collectionId: collections[0].id,
        name: activeTab.name,
        request: payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])

    if (!expandedCollectionIds.includes(collections[0].id)) {
      setExpandedCollectionIds((current) => [...current, collections[0].id])
    }
  }

  const openSavedRequest = (saved: SavedRequestItem) => {
    const opened = reviveRequest({ ...saved.request, id: createId() })
    setTabs((current) => [...current, opened])
    setActiveTabId(opened.id)
    setMobileView('REQUEST')
  }

  const removeSavedRequest = (savedId: string) => {
    setSavedRequests((current) => current.filter((item) => item.id !== savedId))
  }

  const toggleCollection = (collectionId: string) => {
    setExpandedCollectionIds((current) =>
      current.includes(collectionId)
        ? current.filter((item) => item !== collectionId)
        : [...current, collectionId],
    )
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolderIds((current) =>
      current.includes(folderId)
        ? current.filter((item) => item !== folderId)
        : [...current, folderId],
    )
  }

  // Collection & Folder Handlers
  const handleAddCollection = () => {
    if (!newCollectionName.trim()) return
    const newCol: CollectionItem = {
      id: createId(),
      name: newCollectionName.trim(),
    }
    setCollections((prev) => [...prev, newCol])
    setExpandedCollectionIds((prev) => [...prev, newCol.id])
    setNewCollectionName('')
    setNewCollectionModalOpen(false)
  }

  const handleDeleteCollection = (collectionId: string) => {
    if (collections.length <= 1) return
    setCollections((prev) => prev.filter((c) => c.id !== collectionId))
    setFolders((prev) => prev.filter((f) => f.collectionId !== collectionId))
    setSavedRequests((prev) => prev.filter((r) => r.collectionId !== collectionId))
  }

  const handleOpenAddFolder = (collectionId: string, parentId: string | null = null) => {
    setFolderTarget({ collectionId, parentId })
    setNewFolderName('')
    setNewFolderModalOpen(true)
  }

  const handleAddFolder = () => {
    if (!newFolderName.trim() || !folderTarget.collectionId) return
    const newFolder: FolderItem = {
      id: createId(),
      collectionId: folderTarget.collectionId,
      parentId: folderTarget.parentId,
      name: newFolderName.trim(),
    }
    setFolders((prev) => [...prev, newFolder])
    setExpandedFolderIds((prev) => [...prev, newFolder.id])
    setNewFolderName('')
    setNewFolderModalOpen(false)
  }

  const handleDeleteFolder = (folderId: string) => {
    const folderIdsToDelete = new Set<string>([folderId])
    let added = true
    while (added) {
      added = false
      folders.forEach((f) => {
        if (f.parentId && folderIdsToDelete.has(f.parentId) && !folderIdsToDelete.has(f.id)) {
          folderIdsToDelete.add(f.id)
          added = true
        }
      })
    }

    setFolders((prev) => prev.filter((f) => !folderIdsToDelete.has(f.id)))
    setSavedRequests((prev) =>
      prev.filter((r) => !r.folderId || !folderIdsToDelete.has(r.folderId)),
    )
  }

  const handleRenameCollection = (collectionId: string, newName: string) => {
    setCollections((prev) =>
      prev.map((c) => (c.id === collectionId ? { ...c, name: newName.trim() || c.name } : c)),
    )
  }

  const handleRenameFolder = (folderId: string, newName: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, name: newName.trim() || f.name } : f)),
    )
  }

  const handleRenameEnvironment = (envId: string, newName: string) => {
    setEnvironments((prev) =>
      prev.map((env) => (env.id === envId ? { ...env, name: newName.trim() || env.name } : env)),
    )
  }

  const handleDeleteEnvironment = (envId: string) => {
    if (environments.length <= 1) return
    const target = environments.find((e) => e.id === envId)
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa môi trường "${target?.name || 'Environment'}"?`,
    )
    if (!confirmed) return

    const remaining = environments.filter((e) => e.id !== envId)
    setEnvironments(remaining)
    if (activeEnvironmentId === envId && remaining[0]) {
      setActiveEnvironmentId(remaining[0].id)
    }
  }

  // Export Postman Collection
  const handleExportPostmanCollection = (collection: CollectionItem) => {
    const jsonStr = exportPostmanCollectionV2(collection, folders, savedRequests)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${collection.name.replace(/\s+/g, '_')}.postman_collection.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Import Postman Collection
  const handleImportPostmanCollection = () => {
    if (!importPostmanText.trim()) return
    try {
      const result = importPostmanCollectionV2(importPostmanText)
      setCollections((prev) => [...prev, result.collection])
      setFolders((prev) => [...prev, ...result.folders])
      setSavedRequests((prev) => [...prev, ...result.requests])
      setExpandedCollectionIds((prev) => [...prev, result.collection.id])
      setImportPostmanText('')
      setImportPostmanModalOpen(false)
    } catch {
      alert('Postman Collection JSON không hợp lệ. Vui lòng kiểm tra lại.')
    }
  }

  // Import cURL
  const handleImportCurl = () => {
    if (!importCurlText.trim()) return
    const parsed = parseCurlCommand(importCurlText)
    if (parsed) {
      updateActiveTab(parsed)
      setImportCurlText('')
      setImportCurlModalOpen(false)
    } else {
      alert('Lệnh cURL không hợp lệ. Vui lòng kiểm tra lại.')
    }
  }

  // History Operations
  const handleRestoreHistory = (item: HistoryItem) => {
    const restored = reviveRequest({ ...item.request, id: createId() })
    setTabs((current) => [...current, restored])
    setActiveTabId(restored.id)
    setMobileView('REQUEST')
  }

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id))
  }

  const handleClearHistory = () => {
    setHistory([])
  }

  const addEnvironment = () => {
    const env = createDefaultEnvironment(
      `Env ${environments.length + 1}`,
      'http://localhost:3030',
    )
    setEnvironments((current) => [...current, env])
    setActiveEnvironmentId(env.id)
  }

  const updateEnvironmentVariable = (
    envId: string,
    varId: string,
    patch: Partial<EnvironmentVariable>,
  ) => {
    setEnvironments((current) =>
      current.map((env) =>
        env.id !== envId
          ? env
          : {
              ...env,
              variables: env.variables.map((item) =>
                item.id === varId ? { ...item, ...patch } : item,
              ),
            },
      ),
    )
  }

  const addEnvironmentVariable = () => {
    if (!activeEnvironment) return
    setEnvironments((current) =>
      current.map((env) =>
        env.id !== activeEnvironment.id
          ? env
          : {
              ...env,
              variables: [
                ...env.variables,
                { id: createId(), key: '', value: '', enabled: true },
              ],
            },
      ),
    )
  }

  const deleteEnvironmentVariable = (envId: string, varId: string) => {
    setEnvironments((current) =>
      current.map((env) =>
        env.id !== envId
          ? env
          : {
              ...env,
              variables: env.variables.filter((item) => item.id !== varId),
            },
      ),
    )
  }

  const handleFormat = () => {
    if (!activeTab) return
    updateActiveTab({ clientError: '' })

    if (activeTab.mode === 'GRAPHQL') {
      if (activeTab.editorTab === 'VARIABLES') {
        updateActiveTab({ gqlVariables: formatJsonSafely(activeTab.gqlVariables) })
      }
      return
    }

    if (activeTab.editorTab === 'BODY' && activeTab.bodyType === 'json') {
      updateActiveTab({ restBody: formatJsonSafely(activeTab.restBody) })
    }
  }

  const handleClear = () => {
    if (!activeTab) return
    updateActiveTab({ clientError: '' })

    if (activeTab.mode === 'GRAPHQL') {
      if (activeTab.editorTab === 'BODY') updateActiveTab({ gqlQuery: '' })
      else if (activeTab.editorTab === 'VARIABLES') updateActiveTab({ gqlVariables: '{}' })
      else if (activeTab.editorTab === 'HEADERS') updateActiveTab({ headersList: [], headersText: '{}' })
      else if (activeTab.editorTab === 'TESTS') updateActiveTab({ testScript: '' })
      return
    }

    if (activeTab.editorTab === 'BODY') {
      if (activeTab.bodyType === 'json') updateActiveTab({ restBody: '' })
      else if (activeTab.bodyType === 'raw') updateActiveTab({ rawText: '' })
      else if (activeTab.bodyType === 'form-data') updateActiveTab({ formData: [] })
      else if (activeTab.bodyType === 'x-www-form-urlencoded') updateActiveTab({ urlencoded: [] })
    } else if (activeTab.editorTab === 'HEADERS') {
      updateActiveTab({ headersList: [], headersText: '{}' })
    } else if (activeTab.editorTab === 'PARAMS') {
      const { baseUrl } = parseUrlToQueryParams(activeTab.url)
      updateActiveTab({ params: [], url: baseUrl })
    } else if (activeTab.editorTab === 'TESTS') {
      updateActiveTab({ testScript: '' })
    }
  }

  const handleCopyResponse = async () => {
    if (!activeTab?.response) return
    const content = JSON.stringify(
      activeTab.response.data ?? activeTab.response.details ?? activeTab.response,
      null,
      2,
    )
    await navigator.clipboard.writeText(content)
  }

  const handleCancelRequest = () => {
    isSendingRef.current = false
    updateActiveTab({ loading: false, clientError: 'Request đã bị huỷ bởi người dùng' })
  }

  const handleSend = async () => {
    if (!activeTab) return

    updateActiveTab({ loading: true, clientError: '', response: null, testResults: null })
    isSendingRef.current = true

    try {
      let finalUrl = resolveTemplates(activeTab.url.trim(), activeEnvironment)

      if (!finalUrl) throw new Error('URL không được để trống')
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `http://${finalUrl}`
      }

      // Inject API Key query param if configured
      finalUrl = injectAuthToUrl(finalUrl, activeTab.auth, activeEnvironment)

      // Resolve headers list
      const rawHeaders = resolveHeadersList(
        activeTab.headersList,
        activeTab.headersText,
        activeEnvironment,
      )

      // Inject Auth header
      const headers = injectAuthToHeaders(rawHeaders, activeTab.auth, activeEnvironment)

      const requestOptions: HttpRequestOptions = {
        method: activeTab.mode === 'GRAPHQL' ? 'POST' : activeTab.method,
        url: finalUrl,
        headers,
        timeout: settings.requestTimeout ?? 30000,
        rejectUnauthorized: settings.rejectUnauthorized ?? true,
      }

      if (activeTab.mode === 'GRAPHQL') {
        let parsedVariables: Record<string, unknown> = {}
        try {
          parsedVariables = activeTab.gqlVariables.trim()
            ? parseJsonObject(
                resolveTemplates(activeTab.gqlVariables, activeEnvironment),
                'GraphQL variables',
              )
            : {}
        } catch {
          throw new Error('GraphQL variables phải là JSON object hợp lệ')
        }

        requestOptions.data = {
          query: resolveTemplates(activeTab.gqlQuery, activeEnvironment),
          variables: parsedVariables,
        }
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'
      } else if (!['GET', 'DELETE'].includes(activeTab.method)) {
        if (activeTab.bodyType === 'json') {
          if (activeTab.restBody.trim()) {
            try {
              requestOptions.data = JSON.parse(
                resolveTemplates(activeTab.restBody, activeEnvironment),
              )
            } catch {
              throw new Error('REST body phải là JSON hợp lệ')
            }
          }
          if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'
        } else if (activeTab.bodyType === 'raw') {
          requestOptions.data = resolveTemplates(activeTab.rawText, activeEnvironment)
          if (!headers['Content-Type']) headers['Content-Type'] = 'text/plain'
        } else if (activeTab.bodyType === 'x-www-form-urlencoded') {
          const urlSearchParams = new URLSearchParams()
          activeTab.urlencoded
            .filter((r) => r.enabled && r.key.trim())
            .forEach((r) => {
              urlSearchParams.append(
                resolveTemplates(r.key.trim(), activeEnvironment),
                resolveTemplates(r.value, activeEnvironment),
              )
            })
          requestOptions.data = urlSearchParams.toString()
          headers['Content-Type'] = 'application/x-www-form-urlencoded'
        } else if (activeTab.bodyType === 'form-data') {
          const formObject: Record<string, string> = {}
          activeTab.formData
            .filter((r) => r.enabled && r.key.trim())
            .forEach((r) => {
              formObject[resolveTemplates(r.key.trim(), activeEnvironment)] =
                resolveTemplates(r.value, activeEnvironment)
            })
          requestOptions.data = formObject
          if (!headers['Content-Type']) headers['Content-Type'] = 'multipart/form-data'
        }
      }

      const result = await sendHttpRequest(requestOptions)

      if (!isSendingRef.current) return // cancelled

      const isNetworkError =
        result.isNetworkError ?? (result.status === 0 || (!result.status && Boolean(result.error)))

      const responseState: ResponseState = {
        status: result.status,
        statusText: result.statusText,
        time: result.duration !== undefined ? `${result.duration} ms` : '-',
        size: isNetworkError ? '0 B' : (result.size ?? '-'),
        data: result.data,
        error: result.error,
        details: result.details,
        headers: result.headers,
        isNetworkError,
      }

      // Execute Test Script
      const testReport = runTestScript(activeTab.testScript, responseState, activeEnvironment)

      // If test script mutated environment variables, apply them to active environment!
      if (activeEnvironment && Object.keys(testReport.envMutations).length > 0) {
        setEnvironments((envs) =>
          envs.map((env) => {
            if (env.id !== activeEnvironment.id) return env
            const updatedVars = [...env.variables]

            Object.entries(testReport.envMutations).forEach(([k, v]) => {
              const existing = updatedVars.find((item) => item.key === k)
              if (existing) {
                existing.value = v
              } else {
                updatedVars.push({
                  id: createId(),
                  key: k,
                  value: v,
                  enabled: true,
                })
              }
            })

            return { ...env, variables: updatedVars }
          }),
        )
      }

      if (result.error && !result.status) {
        updateActiveTab({
          clientError: result.error,
          response: responseState,
          testResults: testReport,
        })
      } else {
        updateActiveTab({
          response: responseState,
          testResults: testReport,
        })
      }

      // Record to History
      const historyItem: HistoryItem = {
        id: createId(),
        timestamp: new Date().toISOString(),
        method: activeTab.mode === 'GRAPHQL' ? 'GQL' : activeTab.method,
        mode: activeTab.mode,
        url: finalUrl,
        status: result.status,
        duration: result.duration,
        request: stripTransientRequest(activeTab),
        response: responseState,
      }

      setHistory((prev) => [historyItem, ...prev.slice(0, MAX_HISTORY_ITEMS - 1)])
    } catch (error) {
      if (!isSendingRef.current) return
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown client error'

      updateActiveTab({
        clientError: errorMessage,
        response: {
          status: 0,
          statusText: 'Could not connect to server',
          time: '-',
          size: '0 B',
          error: errorMessage,
          data: null,
          isNetworkError: true,
        },
      })
    } finally {
      isSendingRef.current = false
      updateActiveTab({ loading: false })
    }
  }

  const loadGraphSchema = async () => {
    if (!activeTab) return
    let finalUrl = resolveTemplates(activeTab.url.trim(), activeEnvironment)
    if (!finalUrl) return
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `http://${finalUrl}`
    }

    setGraphExplorer((current) => ({ ...current, loading: true, error: '' }))

    try {
      const rawHeaders = resolveHeadersList(
        activeTab.headersList,
        activeTab.headersText,
        activeEnvironment,
      )
      const headers = injectAuthToHeaders(rawHeaders, activeTab.auth, activeEnvironment)
      const extracted = await fetchGraphQLSchema(finalUrl, headers)

      setGraphExplorer((current) => ({
        ...current,
        loading: false,
        error: '',
        queryFields: extracted.queryFields,
        mutationFields: extracted.mutationFields,
      }))
      setSelectedGraphFieldKeys([])
    } catch (error) {
      setGraphExplorer((current) => ({
        ...current,
        loading: false,
        error:
          error instanceof Error ? error.message : 'Load schema thất bại',
      }))
    }
  }

  const applyGraphExplorerFields = (
    kind: 'query' | 'mutation',
    fields: GraphField[],
  ) => {
    if (!activeTab) return

    const generated = buildGraphOperationFromFields(kind, fields)
    updateActiveTab({
      mode: 'GRAPHQL',
      method: 'POST',
      editorTab: 'BODY',
      gqlQuery: generated.query,
      gqlVariables: JSON.stringify(generated.variables, null, 2),
      name:
        fields.length === 1
          ? fields[0].name
          : fields.length
            ? `${fields.length} ${kind} fields`
            : activeTab.name,
    })
  }

  const insertGraphField = (field: GraphField) => {
    const key = getGraphFieldKey(currentGraphOperationKind, field.name)
    setSelectedGraphFieldKeys([key])
    applyGraphExplorerFields(currentGraphOperationKind, [field])
    setMobileView('REQUEST')
  }

  const toggleGraphField = (field: GraphField, checked: boolean) => {
    const key = getGraphFieldKey(currentGraphOperationKind, field.name)
    const nextKeys = checked
      ? Array.from(new Set([...selectedGraphFieldKeys, key]))
      : selectedGraphFieldKeys.filter((item) => item !== key)

    setSelectedGraphFieldKeys(nextKeys)

    const nextFields = currentExplorerFields.filter((item) =>
      nextKeys.includes(getGraphFieldKey(currentGraphOperationKind, item.name)),
    )

    applyGraphExplorerFields(currentGraphOperationKind, nextFields)
  }

  const clearGraphSelection = () => {
    setSelectedGraphFieldKeys((current) =>
      current.filter((key) => !key.startsWith(`${currentGraphOperationKind}:`)),
    )
    applyGraphExplorerFields(currentGraphOperationKind, [])
  }

  return (
    <div className="app-shell">
      <MobileNav mobileView={mobileView} onChangeView={setMobileView} />

      <Group
        orientation="horizontal"
        id="dk-main-layout-horizontal"
        className="app-layout-panels"
      >
        {/* Left Panel: GraphQL Explorer */}
        {isExplorerOpen && (
          <>
            <Panel
              defaultSize="25%"
              minSize="15%"
              maxSize="40%"
              className="panel-resizable-item"
              id="left-explorer-panel"
            >
              <ExplorerPanel
                isMobileActive={mobileView === 'EXPLORER'}
                activeTab={activeTab}
                graphExplorer={graphExplorer}
                setGraphExplorer={setGraphExplorer}
                selectedGraphFieldKeys={selectedGraphFieldKeys}
                onLoadSchema={loadGraphSchema}
                onCloseMobile={() => setMobileView('REQUEST')}
                onCloseExplorer={() => setIsExplorerOpen(false)}
                onToggleField={toggleGraphField}
                onQuickInsert={insertGraphField}
                onApplySelected={() =>
                  applyGraphExplorerFields(
                    currentGraphOperationKind,
                    selectedExplorerFields,
                  )
                }
                onClearSelection={clearGraphSelection}
              />
            </Panel>

            <Separator className="resize-handle vertical-handle" />
          </>
        )}

        {/* Center Panel: Main Workspace */}
        <Panel
          defaultSize={!isExplorerOpen && isSidebarCollapsed ? '100%' : !isExplorerOpen || isSidebarCollapsed ? '78%' : '53%'}
          minSize="30%"
          className="panel-resizable-item"
          id="center-main-workspace"
        >
          <MainPanel
            isMobileActive={mobileView === 'REQUEST'}
            tabs={tabs}
            activeTabId={activeTabId}
            activeTab={activeTab}
            activeEnvironment={activeEnvironment}
            previewUrl={previewUrl}
            domainWarning={domainWarning}
            splitLayout={splitLayout}
            editorFontSize={settings.editorFontSize}
            isSidebarCollapsed={isSidebarCollapsed}
            isExplorerOpen={isExplorerOpen}
            onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
            onToggleExplorer={() => setIsExplorerOpen((prev) => !prev)}
            onToggleSplitLayout={() =>
              setSplitLayout((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'))
            }
            onSelectTab={setActiveTabId}
            onDuplicateTab={duplicateTab}
            onCloseTab={closeTab}
            onAddTab={addTab}
            onUpdateActiveTab={updateActiveTab}
            onSend={handleSend}
            onCancel={handleCancelRequest}
            onSave={saveCurrentRequest}
            onFormat={handleFormat}
            onClear={handleClear}
            onCopyResponse={handleCopyResponse}
            onOpenImportCurlModal={() => {
              setImportCurlText('')
              setImportCurlModalOpen(true)
            }}
            onOpenCodeSnippetModal={() => setCodeSnippetModalOpen(true)}
          />
        </Panel>

        {/* Right Panel: Main Sidebar (Collections & Env) */}
        {!isSidebarCollapsed && (
          <>
            <Separator className="resize-handle vertical-handle" />

            <Panel
              defaultSize="22%"
              minSize="15%"
              maxSize="35%"
              className="panel-resizable-item"
              id="right-sidebar-panel"
            >
              <Sidebar
                isMobileActive={mobileView === 'COLLECTIONS'}
                environments={environments}
                activeEnvironmentId={activeEnvironmentId}
                activeEnvironment={activeEnvironment}
                collections={collections}
                folders={folders}
                savedRequests={savedRequests}
                expandedCollectionIds={expandedCollectionIds}
                expandedFolderIds={expandedFolderIds}
                history={history}
                onAddTab={() => addTab('GRAPHQL')}
                onAddEnvironment={addEnvironment}
                onSelectEnvironment={setActiveEnvironmentId}
                onRenameEnvironment={handleRenameEnvironment}
                onDeleteEnvironment={handleDeleteEnvironment}
                onUpdateEnvironmentVariable={updateEnvironmentVariable}
                onDeleteEnvironmentVariable={deleteEnvironmentVariable}
                onAddEnvironmentVariable={addEnvironmentVariable}
                onToggleCollection={toggleCollection}
                onToggleFolder={toggleFolder}
                onOpenSavedRequest={openSavedRequest}
                onRemoveSavedRequest={removeSavedRequest}
                onAddCollection={() => setNewCollectionModalOpen(true)}
                onDeleteCollection={handleDeleteCollection}
                onRenameCollection={handleRenameCollection}
                onAddFolder={handleOpenAddFolder}
                onDeleteFolder={handleDeleteFolder}
                onRenameFolder={handleRenameFolder}
                onImportPostman={() => setImportPostmanModalOpen(true)}
                onExportCollection={handleExportPostmanCollection}
                onRestoreHistory={handleRestoreHistory}
                onDeleteHistoryItem={handleDeleteHistoryItem}
                onClearHistory={handleClearHistory}
                onOpenSettings={() => setSettingsModalOpen(true)}
                onToggleCollapseSidebar={() => setIsSidebarCollapsed(true)}
              />
            </Panel>
          </>
        )}
      </Group>

      {/* Modal: Import cURL */}
      <Modal
        isOpen={importCurlModalOpen}
        onClose={() => setImportCurlModalOpen(false)}
        title="Import cURL Command"
        maxWidth="620px"
      >
        <div className="stack">
          <div className="meta-text">
            Dán lệnh cURL của bạn vào ô dưới đây để tự động phân tích Method, URL, Headers và Body.
          </div>
          <textarea
            className="textarea"
            style={{ minHeight: 180 }}
            value={importCurlText}
            onChange={(e) => setImportCurlText(e.target.value)}
            placeholder="curl --location --request POST 'https://api.example.com/users' \
  --header 'Content-Type: application/json' \
  --data '{\&quot;name\&quot;: \&quot;John\&quot;}'"
          />
          <div className="modal-footer">
            <button className="button" onClick={() => setImportCurlModalOpen(false)}>
              Cancel
            </button>
            <button
              className="button button-primary"
              onClick={handleImportCurl}
              disabled={!importCurlText.trim()}
            >
              Import to Active Tab
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Import Postman Collection v2.1 */}
      <Modal
        isOpen={importPostmanModalOpen}
        onClose={() => setImportPostmanModalOpen(false)}
        title="Import Postman Collection (v2.1)"
        maxWidth="680px"
      >
        <div className="stack">
          <div className="meta-text">
            Dán nội dung JSON của file Postman Collection v2.1 hoặc tải file lên.
          </div>
          <textarea
            className="textarea"
            style={{ minHeight: 220 }}
            value={importPostmanText}
            onChange={(e) => setImportPostmanText(e.target.value)}
            placeholder="{ &quot;info&quot;: { &quot;name&quot;: &quot;My API Collection&quot; ... }, &quot;item&quot;: [ ... ] }"
          />
          <div className="modal-footer">
            <button className="button" onClick={() => setImportPostmanModalOpen(false)}>
              Cancel
            </button>
            <button
              className="button button-primary"
              onClick={handleImportPostmanCollection}
              disabled={!importPostmanText.trim()}
            >
              Import Collection
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: New Collection */}
      <Modal
        isOpen={newCollectionModalOpen}
        onClose={() => setNewCollectionModalOpen(false)}
        title="Create New Collection"
        maxWidth="440px"
      >
        <div className="stack">
          <div className="caps">Collection Name</div>
          <input
            className="input"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="e.g. Authentication Services"
            autoFocus
          />
          <div className="modal-footer">
            <button className="button" onClick={() => setNewCollectionModalOpen(false)}>
              Cancel
            </button>
            <button
              className="button button-primary"
              onClick={handleAddCollection}
              disabled={!newCollectionName.trim()}
            >
              Create Collection
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: New Folder */}
      <Modal
        isOpen={newFolderModalOpen}
        onClose={() => setNewFolderModalOpen(false)}
        title="Create New Folder"
        maxWidth="440px"
      >
        <div className="stack">
          <div className="caps">Folder Name</div>
          <input
            className="input"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="e.g. Users API"
            autoFocus
          />
          <div className="modal-footer">
            <button className="button" onClick={() => setNewFolderModalOpen(false)}>
              Cancel
            </button>
            <button
              className="button button-primary"
              onClick={handleAddFolder}
              disabled={!newFolderName.trim()}
            >
              Create Folder
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Application Settings */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={(nextSettings) => setSettings(nextSettings)}
      />

      {/* Modal: Code Snippet Generator */}
      {activeTab && (
        <CodeSnippetModal
          isOpen={codeSnippetModalOpen}
          onClose={() => setCodeSnippetModalOpen(false)}
          request={activeTab}
          environment={activeEnvironment}
        />
      )}
    </div>
  )
}

export default App
