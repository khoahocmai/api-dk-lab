import { useEffect, useMemo, useRef, useState } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import type {
  AppSettings,
  CollectionItem,
  EnvironmentItem,
  EnvironmentVariable,
  FolderItem,
  GraphArg,
  GraphExplorerState,
  GraphField,
  GraphInputField,
  GraphOutputField,
  HistoryItem,
  HttpRequestOptions,
  MobileView,
  Mode,
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
  createDefaultAuth,
  createDefaultEnvironment,
  createDefaultRequest,
  loadAllWorkspaceData,
  reviveRequest,
  saveCollections,
  saveEnvironments,
  saveHistory,
  saveSettings,
  stripTransientRequest,
} from './services/storageService'
import {
  buildGraphOperationFromFields,
  deepMergePreserveVariables,
  fetchGraphQLSchema,
  getGraphArgKey,
  getGraphFieldKey,
  getGraphInputFieldKey,
  getGraphOutputFieldKey,
} from './services/graphqlService'
import { parseUrlToQueryParams } from './utils/urlHelper'
import { exportPostmanCollectionV2, importPostmanCollectionV2 } from './utils/postmanHelper'
import { moveFolderItem, moveRequestItem } from './utils/treeHelper'
import { runTestScript } from './utils/testRunner'
import { MobileNav } from './components/layout/MobileNav'
import { Sidebar } from './components/layout/Sidebar'
import { MainPanel } from './components/layout/MainPanel'
import { ExplorerPanel } from './components/layout/ExplorerPanel'
import { Modal } from './components/common/Modal'
import { CurlImportModal } from './components/request/CurlImportModal'
import { SettingsModal } from './components/settings/SettingsModal'
import { CodeSnippetModal } from './components/common/CodeSnippetModal'
import { SaveRequestModal } from './components/request/SaveRequestModal'
import { Toast, type ToastData } from './components/common/Toast'
import { useAppZoom } from './hooks/useAppZoom'

const MAX_HISTORY_ITEMS = 100

function App() {
  useAppZoom()

  const [tabs, setTabs] = useState<RequestItem[]>([createDefaultRequest('GRAPHQL')])
  const [activeTabId, setActiveTabId] = useState('')
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [savedRequests, setSavedRequests] = useState<SavedRequestItem[]>([])
  const [expandedCollectionIds, setExpandedCollectionIds] = useState<string[]>([])
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([])
  const [environments, setEnvironments] = useState<EnvironmentItem[]>([])
  const [activeEnvironmentId, setActiveEnvironmentId] = useState('')
  const [mobileView, setMobileView] = useState<MobileView>('REQUEST')
  const [splitLayout, setSplitLayout] = useState<SplitLayout>('horizontal')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isExplorerOpen, setIsExplorerOpen] = useState(false)

  // Modal & Toast States
  const [importCurlModalOpen, setImportCurlModalOpen] = useState(false)
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
  const [saveRequestModalOpen, setSaveRequestModalOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [codeSnippetModalOpen, setCodeSnippetModalOpen] = useState(false)
  const [toast, setToast] = useState<ToastData | null>(null)

  const showToast = (
    message: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'success',
  ) => {
    setToast({ id: createId(), message, type })
  }

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
  const [isHydrated, setIsHydrated] = useState(false)

  const activeTab = useMemo(
    () => tabs.find((item) => item.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId],
  )

  const activeEnvironment = useMemo(() => {
    if (activeEnvironmentId === 'NO_ENV') return null
    if (!activeEnvironmentId) return environments[0] ?? null
    return (
      environments.find((item) => item.id === activeEnvironmentId) ??
      environments[0] ??
      null
    )
  }, [environments, activeEnvironmentId])

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

  // Hydrate workspace from JSON storage files on startup
  useEffect(() => {
    let isMounted = true

    async function hydrate() {
      try {
        const {
          environments: loadedEnvs,
          collectionsData,
          history: loadedHistory,
          settingsData,
        } = await loadAllWorkspaceData()

        if (!isMounted) return

        setEnvironments(loadedEnvs)

        setCollections(collectionsData.collections)
        setFolders(collectionsData.folders || [])
        setSavedRequests(collectionsData.savedRequests || [])
        setExpandedCollectionIds(
          collectionsData.expandedCollectionIds && collectionsData.expandedCollectionIds.length > 0
            ? collectionsData.expandedCollectionIds
            : collectionsData.collections[0]
              ? [collectionsData.collections[0].id]
              : [],
        )
        setExpandedFolderIds(collectionsData.expandedFolderIds || [])

        setHistory(loadedHistory)

        setSettings(settingsData.settings)

        if (settingsData.tabs && settingsData.tabs.length > 0) {
          const revivedTabs = settingsData.tabs.map(reviveRequest)
          setTabs(revivedTabs)
          const targetTabId =
            settingsData.activeTabId && revivedTabs.some((t) => t.id === settingsData.activeTabId)
              ? settingsData.activeTabId
              : revivedTabs[0].id
          setActiveTabId(targetTabId)
        }

        if (settingsData.activeEnvironmentId === 'NO_ENV') {
          setActiveEnvironmentId('NO_ENV')
        } else if (
          settingsData.activeEnvironmentId &&
          loadedEnvs.some((e) => e.id === settingsData.activeEnvironmentId)
        ) {
          setActiveEnvironmentId(settingsData.activeEnvironmentId)
        } else if (loadedEnvs[0]) {
          setActiveEnvironmentId(loadedEnvs[0].id)
        }

        if (settingsData.splitLayout) setSplitLayout(settingsData.splitLayout)
        if (settingsData.isSidebarCollapsed !== undefined) {
          setIsSidebarCollapsed(settingsData.isSidebarCollapsed)
        }
        if (settingsData.isExplorerOpen !== undefined) {
          setIsExplorerOpen(settingsData.isExplorerOpen)
        }

        // Mark as fully hydrated only after successfully loading data
        setIsHydrated(true)
      } catch (error) {
        console.error('Failed to load workspace data:', error)
      }
    }

    void hydrate()

    return () => {
      isMounted = false
    }
  }, [])

  // Keep active selections valid (only after workspace is hydrated)
  useEffect(() => {
    if (!isHydrated) return

    if (!activeTabId && tabs[0]) {
      setActiveTabId(tabs[0].id)
    }
    if (!activeEnvironmentId && activeEnvironmentId !== 'NO_ENV' && environments[0]) {
      setActiveEnvironmentId(environments[0].id)
    }
  }, [
    isHydrated,
    tabs,
    activeTabId,
    environments,
    activeEnvironmentId,
  ])

  // Realtime Save: Environments (data/environments.json)
  useEffect(() => {
    if (!isHydrated) return

    const timer = window.setTimeout(() => {
      void saveEnvironments(environments)
    }, 150)

    return () => window.clearTimeout(timer)
  }, [environments, isHydrated])

  // Realtime Save: Collections & Folders & Saved Requests (data/collections.json)
  useEffect(() => {
    if (!isHydrated) return

    const timer = window.setTimeout(() => {
      void saveCollections({
        collections,
        folders,
        savedRequests,
        expandedCollectionIds,
        expandedFolderIds,
      })
    }, 150)

    return () => window.clearTimeout(timer)
  }, [collections, folders, savedRequests, expandedCollectionIds, expandedFolderIds, isHydrated])

  // Realtime Save: History (data/history.json)
  useEffect(() => {
    if (!isHydrated) return

    const timer = window.setTimeout(() => {
      void saveHistory(history)
    }, 200)

    return () => window.clearTimeout(timer)
  }, [history, isHydrated])

  // Realtime Save: Settings & UI Workspace State (data/settings.json)
  useEffect(() => {
    if (!isHydrated) return

    const timeout = window.setTimeout(() => {
      void saveSettings({
        settings,
        activeEnvironmentId,
        activeTabId,
        tabs: tabs.map(stripTransientRequest),
        splitLayout,
        isSidebarCollapsed,
        isExplorerOpen,
      })
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [
    settings,
    activeEnvironmentId,
    activeTabId,
    tabs,
    splitLayout,
    isSidebarCollapsed,
    isExplorerOpen,
    isHydrated,
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

      if (event.key.toLowerCase() === 't' || event.key.toLowerCase() === 'n') {
        event.preventDefault()
        addTab('REST')
        return
      }

      if (event.key.toLowerCase() === 'w') {
        event.preventDefault()
        if (activeTabId) {
          closeTab(activeTabId)
        }
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
    const currentIndex = tabs.findIndex((item) => item.id === tabId)
    const nextTabs = tabs.filter((item) => item.id !== tabId)

    setTabs(nextTabs)
    if (nextTabs.length === 0) {
      setActiveTabId('')
      return
    }

    if (activeTabId === tabId) {
      setActiveTabId(nextTabs[Math.max(0, currentIndex - 1)]?.id || nextTabs[0].id)
    }
  }

  const duplicateTab = (source: RequestItem = activeTab) => {
    if (!source) return
    const duplicate: RequestItem = {
      ...source,
      id: createId(),
      savedRequestId: undefined,
      collectionId: undefined,
      folderId: undefined,
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
    if (!activeTab) return

    // Case 1: Tab is linked to an existing saved request in collections
    if (activeTab.savedRequestId && savedRequests.some((r) => r.id === activeTab.savedRequestId)) {
      const payload = stripTransientRequest(activeTab)
      setSavedRequests((current) =>
        current.map((item) =>
          item.id === activeTab.savedRequestId
            ? {
                ...item,
                name: activeTab.name,
                request: payload,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      )
      showToast('Request updated successfully')
      return
    }

    // Case 2: Unsaved / new request -> open Save Request modal
    setSaveRequestModalOpen(true)
  }

  const handleSaveNewRequest = (
    targetName: string,
    targetCollectionId: string,
    targetFolderId: string | null,
  ) => {
    if (!activeTab) return

    const newSavedId = createId()
    const updatedTabItem: RequestItem = {
      ...activeTab,
      name: targetName,
      savedRequestId: newSavedId,
      collectionId: targetCollectionId,
      folderId: targetFolderId,
    }
    const payload = stripTransientRequest(updatedTabItem)

    const newSavedRequest: SavedRequestItem = {
      id: newSavedId,
      collectionId: targetCollectionId,
      folderId: targetFolderId,
      name: targetName,
      request: payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setSavedRequests((current) => [...current, newSavedRequest])
    updateActiveTab({
      name: targetName,
      savedRequestId: newSavedId,
      collectionId: targetCollectionId,
      folderId: targetFolderId,
    })

    if (!expandedCollectionIds.includes(targetCollectionId)) {
      setExpandedCollectionIds((current) => [...current, targetCollectionId])
    }
    if (targetFolderId && !expandedFolderIds.includes(targetFolderId)) {
      setExpandedFolderIds((current) => [...current, targetFolderId])
    }

    setSaveRequestModalOpen(false)
    showToast('Request saved successfully')
  }

  const openSavedRequest = (saved: SavedRequestItem) => {
    const existingTab = tabs.find((item) => item.savedRequestId === saved.id)
    if (existingTab) {
      setActiveTabId(existingTab.id)
      setMobileView('REQUEST')
      return
    }

    const opened = reviveRequest({
      ...saved.request,
      id: createId(),
      savedRequestId: saved.id,
      collectionId: saved.collectionId,
      folderId: saved.folderId,
      name: saved.name,
    })
    setTabs((current) => [...current, opened])
    setActiveTabId(opened.id)
    setMobileView('REQUEST')
  }

  const removeSavedRequest = (savedId: string) => {
    setSavedRequests((current) => current.filter((item) => item.id !== savedId))
    setTabs((current) =>
      current.map((t) =>
        t.savedRequestId === savedId
          ? { ...t, savedRequestId: undefined, collectionId: undefined, folderId: undefined }
          : t,
      ),
    )
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
    const deletedRequestIds = new Set(
      savedRequests.filter((r) => r.collectionId === collectionId).map((r) => r.id),
    )
    setCollections((prev) => prev.filter((c) => c.id !== collectionId))
    setFolders((prev) => prev.filter((f) => f.collectionId !== collectionId))
    setSavedRequests((prev) => prev.filter((r) => r.collectionId !== collectionId))
    setTabs((prev) =>
      prev.map((t) =>
        t.savedRequestId && deletedRequestIds.has(t.savedRequestId)
          ? { ...t, savedRequestId: undefined, collectionId: undefined, folderId: undefined }
          : t,
      ),
    )
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

    const deletedRequestIds = new Set(
      savedRequests
        .filter((r) => r.folderId && folderIdsToDelete.has(r.folderId))
        .map((r) => r.id),
    )

    setFolders((prev) => prev.filter((f) => !folderIdsToDelete.has(f.id)))
    setSavedRequests((prev) =>
      prev.filter((r) => !r.folderId || !folderIdsToDelete.has(r.folderId)),
    )
    setTabs((prev) =>
      prev.map((t) =>
        t.savedRequestId && deletedRequestIds.has(t.savedRequestId)
          ? { ...t, savedRequestId: undefined, collectionId: undefined, folderId: undefined }
          : t,
      ),
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

  const handleRenameRequest = (requestId: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed) return

    setSavedRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              name: trimmed,
              request: { ...r.request, name: trimmed },
              updatedAt: new Date().toISOString(),
            }
          : r,
      ),
    )

    setTabs((prev) =>
      prev.map((t) => (t.savedRequestId === requestId ? { ...t, name: trimmed } : t)),
    )

    showToast('Request renamed successfully')
  }

  const handleMoveRequest = (
    requestId: string,
    targetCollectionId: string,
    targetFolderId: string | null,
    targetRequestId?: string,
    position?: 'before' | 'after',
  ) => {
    setSavedRequests((prev) =>
      moveRequestItem(
        prev,
        requestId,
        targetCollectionId,
        targetFolderId,
        targetRequestId,
        position,
      ),
    )
    setTabs((prev) =>
      prev.map((t) =>
        t.savedRequestId === requestId
          ? { ...t, collectionId: targetCollectionId, folderId: targetFolderId }
          : t,
      ),
    )
    if (targetFolderId) {
      setExpandedFolderIds((prev) =>
        prev.includes(targetFolderId) ? prev : [...prev, targetFolderId],
      )
    }
    setExpandedCollectionIds((prev) =>
      prev.includes(targetCollectionId) ? prev : [...prev, targetCollectionId],
    )
  }

  const handleMoveFolder = (
    folderId: string,
    targetCollectionId: string,
    targetParentFolderId: string | null,
    targetFolderId?: string,
    position?: 'before' | 'after',
  ) => {
    const result = moveFolderItem(
      folders,
      savedRequests,
      folderId,
      targetCollectionId,
      targetParentFolderId,
      targetFolderId,
      position,
    )
    setFolders(result.folders)
    setSavedRequests(result.requests)
    setTabs((prev) =>
      prev.map((t) => {
        if (!t.savedRequestId) return t
        const matchingSaved = result.requests.find((r) => r.id === t.savedRequestId)
        if (matchingSaved && matchingSaved.collectionId !== t.collectionId) {
          return {
            ...t,
            collectionId: matchingSaved.collectionId,
            folderId: matchingSaved.folderId,
          }
        }
        return t
      }),
    )
    if (targetParentFolderId) {
      setExpandedFolderIds((prev) =>
        prev.includes(targetParentFolderId) ? prev : [...prev, targetParentFolderId],
      )
    }
    setExpandedCollectionIds((prev) =>
      prev.includes(targetCollectionId) ? prev : [...prev, targetCollectionId],
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
    // 1. Determine rawUrl according to priority:
    // Priority 1: URL from activeTab (if present and non-empty)
    let rawUrl = activeTab?.url?.trim()

    // Priority 2: When no active tab or activeTab.url is empty, get from activeEnvironment 'Domain' variable
    if (!rawUrl) {
      const domainVar = activeEnvironment?.variables.find(
        (v) => v.enabled && v.key.trim().toLowerCase() === 'domain',
      )?.value?.trim()

      if (domainVar) {
        rawUrl = `${domainVar.replace(/\/+$/, '')}/graphql`
      } else {
        rawUrl = '{{Domain}}/graphql'
      }
    }

    // Resolve templates like {{Domain}} with activeEnvironment
    let finalUrl = resolveTemplates(rawUrl, activeEnvironment).trim()

    // Check if unresolved template remains or URL is empty
    if (!finalUrl || finalUrl.includes('{{Domain}}') || finalUrl === '/graphql') {
      const msg = 'Vui lòng cấu hình biến {{Domain}} trong Environment để tải Schema.'
      showToast(msg)
      setGraphExplorer((current) => ({
        ...current,
        loading: false,
        error: msg,
      }))
      return
    }

    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `http://${finalUrl}`
    }

    setGraphExplorer((current) => ({ ...current, loading: true, error: '' }))

    try {
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (activeTab) {
        const rawHeaders = resolveHeadersList(
          activeTab.headersList || [],
          activeTab.headersText || '{}',
          activeEnvironment,
        )
        headers = injectAuthToHeaders(
          { ...headers, ...rawHeaders },
          activeTab.auth || createDefaultAuth(),
          activeEnvironment,
        )
      } else {
        // Fallback: check if activeEnvironment has 'token' or 'Authorization' variable
        const tokenVar = activeEnvironment?.variables.find(
          (v) =>
            v.enabled &&
            (v.key.trim().toLowerCase() === 'token' ||
              v.key.trim().toLowerCase() === 'authorization' ||
              v.key.trim().toLowerCase() === 'bearer'),
        )?.value?.trim()

        if (tokenVar) {
          headers['Authorization'] = tokenVar.startsWith('Bearer ')
            ? tokenVar
            : `Bearer ${tokenVar}`
        }
      }

      const extracted = await fetchGraphQLSchema(finalUrl, headers)

      setGraphExplorer((current) => ({
        ...current,
        loading: false,
        error: '',
        queryFields: extracted.queryFields,
        mutationFields: extracted.mutationFields,
      }))
      setSelectedGraphFieldKeys([])
      showToast(
        `Đã tải Schema thành công (${extracted.queryFields.length} Queries, ${extracted.mutationFields.length} Mutations)`,
      )
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Load schema thất bại'
      setGraphExplorer((current) => ({
        ...current,
        loading: false,
        error: errorMsg,
      }))
    }
  }

  const createGraphRequestTab = (
    kind: 'query' | 'mutation',
    fields: GraphField[],
    keys?: string[],
  ) => {
    if (fields.length === 0) return

    const generated = buildGraphOperationFromFields(kind, fields, keys)
    const baseRequest = createDefaultRequest('GRAPHQL')
    const tabName =
      fields.length === 1
        ? fields[0].name
        : `${fields.length} ${kind} fields`

    // Inherit URL, headers, and auth from current active tab if available, else default
    const inheritedUrl =
      activeTab && activeTab.url.trim() ? activeTab.url.trim() : baseRequest.url
    const inheritedHeadersList =
      activeTab && activeTab.headersList && activeTab.headersList.length > 0
        ? activeTab.headersList
        : baseRequest.headersList
    const inheritedHeadersText =
      activeTab && activeTab.headersText
        ? activeTab.headersText
        : baseRequest.headersText
    const inheritedAuth =
      activeTab && activeTab.auth ? activeTab.auth : baseRequest.auth

    const newTab: RequestItem = {
      ...baseRequest,
      id: createId(),
      name: tabName,
      mode: 'GRAPHQL',
      method: 'POST',
      url: inheritedUrl,
      params: parseUrlToQueryParams(inheritedUrl).params,
      headersList: inheritedHeadersList,
      headersText: inheritedHeadersText,
      auth: inheritedAuth,
      editorTab: 'BODY',
      gqlQuery: generated.query,
      gqlVariables: JSON.stringify(generated.variables, null, 2),
      savedRequestId: undefined,
      collectionId: undefined,
      folderId: undefined,
    }

    setTabs((current) => [...current, newTab])
    setActiveTabId(newTab.id)
    setMobileView('REQUEST')
  }

  const syncExplorerToFieldTab = (
    field: GraphField,
    nextKeys: string[],
    kind: 'query' | 'mutation',
  ) => {
    const fields = kind === 'mutation' ? graphExplorer.mutationFields : graphExplorer.queryFields
    const selectedFields = fields.filter((f) =>
      nextKeys.includes(getGraphFieldKey(kind, f.name)),
    )

    if (selectedFields.length === 0) return

    const generated = buildGraphOperationFromFields(kind, selectedFields, nextKeys)

    // 1. Guard check: Is activeTab a valid unsaved matching scratch tab for this API?
    const isCurrentTabMatching =
      Boolean(activeTab) &&
      activeTab?.savedRequestId === undefined &&
      activeTab?.mode === 'GRAPHQL' &&
      (activeTab?.name === field.name ||
        activeTab?.name.startsWith('New ') ||
        activeTab?.name.startsWith('Untitled'))

    if (isCurrentTabMatching && activeTab) {
      // Parse current variables from activeTab to preserve user-entered values
      let currentVars: Record<string, unknown> = {}
      if (activeTab.gqlVariables?.trim()) {
        try {
          currentVars = JSON.parse(activeTab.gqlVariables)
        } catch {
          currentVars = {}
        }
      }

      const mergedVars = deepMergePreserveVariables(
        currentVars,
        generated.variables,
      ) as Record<string, unknown>
      const varJson =
        Object.keys(mergedVars).length > 0
          ? JSON.stringify(mergedVars, null, 2)
          : '{}'

      const patch: Partial<RequestItem> = {
        mode: 'GRAPHQL',
        method: 'POST',
        gqlQuery: generated.query,
        gqlVariables: varJson,
      }

      if (activeTab.name.startsWith('New ') || activeTab.name.startsWith('Untitled')) {
        patch.name = field.name
      }

      setTabs((current) =>
        current.map((t) => (t.id === activeTab.id ? { ...t, ...patch } : t)),
      )
      return
    }

    // 2. Active tab is NOT matching (e.g. Health from Collection, REST request, or different API tab)
    // Check if an unsaved tab for this API is already open on the Tabbar:
    const existingMatchingTab = tabs.find(
      (t) =>
        t.name === field.name &&
        t.savedRequestId === undefined &&
        t.mode === 'GRAPHQL',
    )

    if (existingMatchingTab) {
      let currentVars: Record<string, unknown> = {}
      if (existingMatchingTab.gqlVariables?.trim()) {
        try {
          currentVars = JSON.parse(existingMatchingTab.gqlVariables)
        } catch {
          currentVars = {}
        }
      }

      const mergedVars = deepMergePreserveVariables(
        currentVars,
        generated.variables,
      ) as Record<string, unknown>
      const varJson =
        Object.keys(mergedVars).length > 0
          ? JSON.stringify(mergedVars, null, 2)
          : '{}'

      setTabs((current) =>
        current.map((t) =>
          t.id === existingMatchingTab.id
            ? {
                ...t,
                mode: 'GRAPHQL',
                method: 'POST',
                gqlQuery: generated.query,
                gqlVariables: varJson,
              }
            : t,
        ),
      )
      setActiveTabId(existingMatchingTab.id)
      setMobileView('REQUEST')
      return
    }

    // 3. Otherwise: Create a brand new tab for this field to protect the current active tab!
    const baseRequest = createDefaultRequest('GRAPHQL')
    const inheritedUrl =
      activeTab && activeTab.url.trim() ? activeTab.url.trim() : baseRequest.url
    const inheritedHeadersList =
      activeTab && activeTab.headersList && activeTab.headersList.length > 0
        ? activeTab.headersList
        : baseRequest.headersList
    const inheritedHeadersText =
      activeTab && activeTab.headersText
        ? activeTab.headersText
        : baseRequest.headersText
    const inheritedAuth =
      activeTab && activeTab.auth ? activeTab.auth : baseRequest.auth

    const newTab: RequestItem = {
      ...baseRequest,
      id: createId(),
      name: field.name,
      mode: 'GRAPHQL',
      method: 'POST',
      url: inheritedUrl,
      params: parseUrlToQueryParams(inheritedUrl).params,
      headersList: inheritedHeadersList,
      headersText: inheritedHeadersText,
      auth: inheritedAuth,
      editorTab: 'BODY',
      gqlQuery: generated.query,
      gqlVariables: JSON.stringify(generated.variables, null, 2),
      savedRequestId: undefined,
      collectionId: undefined,
      folderId: undefined,
    }

    setTabs((current) => [...current, newTab])
    setActiveTabId(newTab.id)
    setMobileView('REQUEST')
  }

  const insertGraphField = (field: GraphField) => {
    const key = getGraphFieldKey(currentGraphOperationKind, field.name)
    setSelectedGraphFieldKeys([key])
    createGraphRequestTab(currentGraphOperationKind, [field])
  }

  const toggleGraphField = (field: GraphField, checked: boolean) => {
    const fieldKey = getGraphFieldKey(currentGraphOperationKind, field.name)
    let nextKeys = new Set(selectedGraphFieldKeys)

    if (checked) {
      nextKeys.add(fieldKey)
      // For primary args (like 'params'): auto-select at most 2 basic fields (e.g. page, pageSize)
      field.args.forEach((arg) => {
        const isFilter =
          arg.name.toLowerCase().includes('filter') ||
          arg.name.toLowerCase().includes('where')
        if (isFilter) return // Do not auto-select bulky filters

        if (arg.inputFields.length > 0) {
          const preferredFields = ['page', 'pageSize', 'limit', 'offset', 'skip', 'take']
          const sortedFields = [...arg.inputFields].sort((a, b) => {
            const aIndex = preferredFields.indexOf(a.name)
            const bIndex = preferredFields.indexOf(b.name)
            if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex
            if (aIndex >= 0) return -1
            if (bIndex >= 0) return 1
            return 0
          })
          const top2 = sortedFields.slice(0, 2)
          top2.forEach((inf) => {
            nextKeys.add(
              getGraphInputFieldKey(
                currentGraphOperationKind,
                field.name,
                arg.name,
                inf.name,
              ),
            )
          })
        }
      })

      // For output fields: auto-select top 2 scalar return fields
      if (field.outputFields && field.outputFields.length > 0) {
        const topScalars = field.outputFields.filter((f) => f.isScalar).slice(0, 2)
        topScalars.forEach((f) => {
          nextKeys.add(
            getGraphOutputFieldKey(currentGraphOperationKind, field.name, f.name),
          )
        })
      }
    } else {
      // Remove this field and all its argument/input/output keys
      const prefix = `${fieldKey}:`
      nextKeys = new Set(
        Array.from(nextKeys).filter(
          (item) => item !== fieldKey && !item.startsWith(prefix),
        ),
      )
    }

    const nextKeysArr = Array.from(nextKeys)
    setSelectedGraphFieldKeys(nextKeysArr)
    syncExplorerToFieldTab(field, nextKeysArr, currentGraphOperationKind)
  }

  const toggleGraphArg = (field: GraphField, arg: GraphArg, checked: boolean) => {
    const fieldKey = getGraphFieldKey(currentGraphOperationKind, field.name)
    const argKey = getGraphArgKey(currentGraphOperationKind, field.name, arg.name)
    let nextKeys = new Set(selectedGraphFieldKeys)

    if (checked) {
      nextKeys.add(fieldKey)
      nextKeys.add(argKey)
      // If arg has child input fields, select ALL children
      if (arg.inputFields.length > 0) {
        arg.inputFields.forEach((inf) => {
          const infKey = getGraphInputFieldKey(
            currentGraphOperationKind,
            field.name,
            arg.name,
            inf.name,
          )
          nextKeys.add(infKey)
        })
      }
    } else {
      // Unselect this argument and ALL its child input fields
      nextKeys.delete(argKey)
      if (arg.inputFields.length > 0) {
        arg.inputFields.forEach((inf) => {
          const infKey = getGraphInputFieldKey(
            currentGraphOperationKind,
            field.name,
            arg.name,
            inf.name,
          )
          nextKeys.delete(infKey)
        })
      }
    }

    const nextKeysArr = Array.from(nextKeys)
    setSelectedGraphFieldKeys(nextKeysArr)
    syncExplorerToFieldTab(field, nextKeysArr, currentGraphOperationKind)
  }

  const toggleGraphInputField = (
    field: GraphField,
    arg: GraphArg,
    inputField: GraphInputField,
    checked: boolean,
  ) => {
    const fieldKey = getGraphFieldKey(currentGraphOperationKind, field.name)
    const argKey = getGraphArgKey(currentGraphOperationKind, field.name, arg.name)
    const inputKey = getGraphInputFieldKey(
      currentGraphOperationKind,
      field.name,
      arg.name,
      inputField.name,
    )
    let nextKeys = new Set(selectedGraphFieldKeys)

    if (checked) {
      nextKeys.add(fieldKey)
      nextKeys.add(inputKey)

      // If all sibling input fields are now selected, mark parent argKey as checked
      const allSiblingsSelected = arg.inputFields.every((inf) =>
        inf.name === inputField.name
          ? true
          : nextKeys.has(
              getGraphInputFieldKey(
                currentGraphOperationKind,
                field.name,
                arg.name,
                inf.name,
              ),
            ),
      )
      if (allSiblingsSelected) {
        nextKeys.add(argKey)
      }
    } else {
      nextKeys.delete(inputKey)
      // Since at least one child is unchecked, parent is not 100% checked
      nextKeys.delete(argKey)
    }

    const nextKeysArr = Array.from(nextKeys)
    setSelectedGraphFieldKeys(nextKeysArr)
    syncExplorerToFieldTab(field, nextKeysArr, currentGraphOperationKind)
  }

  const toggleGraphOutputField = (
    field: GraphField,
    path: string,
    checked: boolean,
  ) => {
    const fieldKey = getGraphFieldKey(currentGraphOperationKind, field.name)
    const outKey = getGraphOutputFieldKey(currentGraphOperationKind, field.name, path)
    let nextKeys = new Set(selectedGraphFieldKeys)

    if (checked) {
      nextKeys.add(fieldKey)
      nextKeys.add(outKey)

      // Find the output field in the tree to check if it's an object with child fields
      const findFieldByPath = (
        fields: GraphOutputField[],
        parts: string[],
      ): GraphOutputField | undefined => {
        if (parts.length === 0) return undefined
        const current = fields.find((f) => f.name === parts[0])
        if (!current) return undefined
        if (parts.length === 1) return current
        return current.fields ? findFieldByPath(current.fields, parts.slice(1)) : undefined
      }

      const targetOutField = field.outputFields
        ? findFieldByPath(field.outputFields, path.split('.'))
        : undefined
      if (targetOutField && targetOutField.fields && targetOutField.fields.length > 0) {
        // Auto-select at most 2 basic scalar child fields if none selected
        const topScalarChildren = targetOutField.fields.filter((f) => f.isScalar).slice(0, 2)
        topScalarChildren.forEach((child) => {
          nextKeys.add(
            getGraphOutputFieldKey(
              currentGraphOperationKind,
              field.name,
              `${path}.${child.name}`,
            ),
          )
        })
      }
    } else {
      // Remove this output field key and all descendant sub-keys
      const prefix = `${outKey}.`
      nextKeys = new Set(
        Array.from(nextKeys).filter(
          (item) => item !== outKey && !item.startsWith(prefix),
        ),
      )
    }

    const nextKeysArr = Array.from(nextKeys)
    setSelectedGraphFieldKeys(nextKeysArr)
    syncExplorerToFieldTab(field, nextKeysArr, currentGraphOperationKind)
  }

  const clearGraphSelection = () => {
    setSelectedGraphFieldKeys((current) =>
      current.filter((key) => !key.startsWith(`${currentGraphOperationKind}:`)),
    )
  }

  return (
    <div className="app-shell">
      <MobileNav mobileView={mobileView} onChangeView={setMobileView} />

      <Group
        orientation="horizontal"
        id="api-lab-main-layout-horizontal"
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
              style={{ height: '100%', maxHeight: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}
            >
              <div style={{ height: '100%', maxHeight: '100%', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
                  onToggleArg={toggleGraphArg}
                  onToggleInputField={toggleGraphInputField}
                  onToggleOutputField={toggleGraphOutputField}
                  onQuickInsert={insertGraphField}
                  onApplySelected={() =>
                    createGraphRequestTab(
                      currentGraphOperationKind,
                      selectedExplorerFields,
                      selectedGraphFieldKeys,
                    )
                  }
                  onClearSelection={clearGraphSelection}
                />
              </div>
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
            environments={environments}
            activeEnvironmentId={activeEnvironmentId}
            activeEnvironment={activeEnvironment}
            previewUrl={previewUrl}
            domainWarning={domainWarning}
            splitLayout={splitLayout}
            editorFontSize={settings.editorFontSize}
            isSidebarCollapsed={isSidebarCollapsed}
            isExplorerOpen={isExplorerOpen}
            onSelectEnvironment={setActiveEnvironmentId}
            onAddEnvironment={addEnvironment}
            onOpenManageEnvironments={() => setIsSidebarCollapsed(false)}
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
            onOpenImportCurlModal={() => setImportCurlModalOpen(true)}
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
                onRenameRequest={handleRenameRequest}
                onImportPostman={() => setImportPostmanModalOpen(true)}
                onImportCurl={() => setImportCurlModalOpen(true)}
                onExportCollection={handleExportPostmanCollection}
                onMoveRequest={handleMoveRequest}
                onMoveFolder={handleMoveFolder}
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
      <CurlImportModal
        isOpen={importCurlModalOpen}
        onClose={() => setImportCurlModalOpen(false)}
        onImport={updateActiveTab}
      />

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

      {/* Modal: Save Request */}
      {activeTab && (
        <SaveRequestModal
          isOpen={saveRequestModalOpen}
          onClose={() => setSaveRequestModalOpen(false)}
          initialName={activeTab.name}
          collections={collections}
          folders={folders}
          defaultCollectionId={activeTab.collectionId || collections[0]?.id}
          defaultFolderId={activeTab.folderId}
          onSave={handleSaveNewRequest}
        />
      )}

      {/* Toast Notifications */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}

export default App
