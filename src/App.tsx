import { useEffect, useMemo, useRef, useState } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { parse } from 'graphql'
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
  SidebarTab,
  SplitLayout,
} from './types'
import { DEFAULT_APP_SETTINGS } from './types/settings.types'
import {
  createId,
  createRequestSnapshot,
  formatJsonSafely,
  isTabDirty,
  parseJsonObject,
} from './utils/formatters'
import {
  buildFinalHeaders,
  injectAuthToUrl,
  resolvePathVariables,
  resolveTemplates,
} from './services/templateService'
import { cancelHttpRequest, sendHttpRequest } from './services/httpService'
import {
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
  computeReverseSyncKeys,
  deepMergePreserveVariables,
  extractGraphQLRootInfo,
  extractOutputPathsFromQuery,
  fetchGraphQLSchema,
  getGraphArgKey,
  getGraphFieldKey,
  getGraphInputFieldKey,
  getGraphOutputFieldKey,
  getIntrospectionEndpointAndHeaders,
  parseRelaxedJSON,
} from './services/graphqlService'
import { isLocalhostUrl, parseUrlToQueryParams } from './utils/urlHelper'
import { exportPostmanCollectionV2, importPostmanCollectionV2 } from './utils/postmanHelper'
import { moveFolderItem, moveRequestItem } from './utils/treeHelper'
import { executeScript, type ScriptContext } from './services/scriptRunner'
import { MobileNav } from './components/layout/MobileNav'
import { Sidebar } from './components/layout/Sidebar'
import { MainPanel } from './components/layout/MainPanel'
import { ExplorerPanel } from './components/layout/ExplorerPanel'
import { Modal } from './components/common/Modal'
import { CurlImportModal } from './components/request/CurlImportModal'
import { SettingsModal } from './components/settings/SettingsModal'
import { CodeSnippetModal } from './components/common/CodeSnippetModal'
import { SaveRequestModal } from './components/request/SaveRequestModal'
import { UnsavedChangesModal } from './components/request/UnsavedChangesModal'
import { Toast, type ToastData } from './components/common/Toast'
import { useAppZoom } from './hooks/useAppZoom'

const MAX_HISTORY_ITEMS = 100

function App() {
  useAppZoom()

  const [tabs, setTabs] = useState<RequestItem[]>([])
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
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('COLLECTIONS')
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
  const [pendingCloseTab, setPendingCloseTab] = useState<RequestItem | null>(null)
  const [closeQueue, setCloseQueue] = useState<RequestItem[]>([])
  const [batchPostCloseActiveId, setBatchPostCloseActiveId] = useState<string | null>(null)
  const [isSaveModalFromClose, setIsSaveModalFromClose] = useState(false)
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
  const [highlightedField, setHighlightedField] = useState<{ name: string; trigger: number } | null>(null)
  const isUpdatingFromExplorerRef = useRef(false)

  const isSendingRef = useRef(false)
  const activeAbortControllersRef = useRef<
    Map<string, { controller: AbortController; requestId: string }>
  >(new Map())
  const [isHydrated, setIsHydrated] = useState(false)

  const activeTab = useMemo(
    () => (activeTabId ? tabs.find((item) => item.id === activeTabId) : undefined) ?? (tabs.length > 0 ? tabs[0] : undefined),
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

  const currentGraphOperationKind =
    graphExplorer.activeTab === 'MUTATION' ? 'mutation' : 'query'

  const previewUrl = useMemo(() => {
    if (!activeTab) return ''
    const urlWithPathVars = resolvePathVariables(
      activeTab.url,
      activeTab.pathVariables,
      activeEnvironment,
    )
    return resolveTemplates(urlWithPathVars, activeEnvironment)
  }, [activeTab, activeEnvironment])

  // Reverse Sync: Tab (gqlQuery & gqlVariables) -> GraphQL Explorer (Checkboxes) with 300ms Debounce
  useEffect(() => {
    if (!activeTab || activeTab.mode !== 'GRAPHQL') {
      setSelectedGraphFieldKeys([])
      setHighlightedField(null)
      if (!activeTab) {
        setGraphExplorer((prev) => (prev.search ? { ...prev, search: '' } : prev))
      }
      return
    }

    // If change was triggered by user clicking in Explorer, skip reverse sync to prevent loop
    if (isUpdatingFromExplorerRef.current) {
      isUpdatingFromExplorerRef.current = false
      return
    }

    if (!graphExplorer.queryFields.length && !graphExplorer.mutationFields.length) return

    const timer = setTimeout(() => {
      setSelectedGraphFieldKeys((prevKeys) => {
        return computeReverseSyncKeys(
          prevKeys,
          activeTab.gqlQuery || '',
          activeTab.gqlVariables || '',
          {
            queryFields: graphExplorer.queryFields,
            mutationFields: graphExplorer.mutationFields,
          },
          activeTab.graphqlRootField,
        )
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [
    activeTab?.id,
    activeTab?.mode,
    activeTab?.gqlQuery,
    activeTab?.gqlVariables,
    activeTab?.graphqlRootField,
    graphExplorer.queryFields,
    graphExplorer.mutationFields,
  ])

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
        } else {
          setTabs([])
          setActiveTabId('')
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

    if (tabs.length === 0) {
      if (activeTabId !== '') {
        setActiveTabId('')
      }
    } else if (!activeTabId || !tabs.some((t) => t.id === activeTabId)) {
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
          handleRequestCloseTab(activeTabId)
        }
        return
      }

      if (!activeTab) return

      if (event.key === 'Enter') {
        event.preventDefault()
        if (activeTab.loading) {
          handleCancelRequest()
        } else {
          void handleSend()
        }
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

  const updateTab = (tabId: string, patch: Partial<RequestItem>) => {
    setTabs((current) =>
      current.map((item) => (item.id === tabId ? { ...item, ...patch } : item)),
    )
  }

  const updateActiveTab = (patch: Partial<RequestItem>) => {
    if (!activeTab) return
    updateTab(activeTab.id, patch)
  }

  const handleImportCurl = (parsed: Partial<RequestItem>) => {
    const mode = parsed.mode || 'REST'
    const newReq: RequestItem = {
      ...createDefaultRequest(mode),
      ...parsed,
      id: createId(),
      savedRequestId: undefined,
      collectionId: undefined,
      folderId: undefined,
    }
    newReq.savedSnapshot = createRequestSnapshot(newReq)
    setTabs((current) => [...current, newReq])
    setActiveTabId(newReq.id)
    setMobileView('REQUEST')
    showToast(`Đã import cURL thành công (${newReq.name})`, 'success')
  }

  const addTab = (mode: Mode = 'GRAPHQL') => {
    const next = createDefaultRequest(mode)
    setTabs((current) => [...current, next])
    setActiveTabId(next.id)
    setMobileView('REQUEST')
  }

  const closeTab = (tabId: string, customNextActiveId?: string | null) => {
    const active = activeAbortControllersRef.current.get(tabId)
    if (active) {
      active.controller.abort()
      void cancelHttpRequest(active.requestId)
      activeAbortControllersRef.current.delete(tabId)
    }

    const currentIndex = tabs.findIndex((item) => item.id === tabId)
    const nextTabs = tabs.filter((item) => item.id !== tabId)

    setTabs(nextTabs)
    if (nextTabs.length === 0) {
      setActiveTabId('')
      setSelectedGraphFieldKeys([])
      setHighlightedField(null)
      setGraphExplorer((prev) => ({ ...prev, search: '' }))
      return
    }

    if (customNextActiveId !== undefined) {
      if (customNextActiveId && nextTabs.some((t) => t.id === customNextActiveId)) {
        setActiveTabId(customNextActiveId)
        const targetTab = nextTabs.find((t) => t.id === customNextActiveId)
        if (targetTab && targetTab.mode !== 'GRAPHQL') {
          setSelectedGraphFieldKeys([])
          setHighlightedField(null)
          setGraphExplorer((prev) => ({ ...prev, search: '' }))
        }
      } else if (customNextActiveId === '') {
        setActiveTabId('')
      }
    } else if (activeTabId === tabId) {
      const nextTab = nextTabs[Math.max(0, currentIndex - 1)] || nextTabs[0]
      setActiveTabId(nextTab.id)
      if (nextTab.mode !== 'GRAPHQL') {
        setSelectedGraphFieldKeys([])
        setHighlightedField(null)
        setGraphExplorer((prev) => ({ ...prev, search: '' }))
      }
    }
  }

  const advanceCloseQueue = (closedTabId: string) => {
    const nextQueue = closeQueue.filter((t) => t.id !== closedTabId)
    if (nextQueue.length > 0) {
      const nextTab = nextQueue[0]
      closeTab(closedTabId, nextTab.id)
      setPendingCloseTab(nextTab)
      setCloseQueue(nextQueue.slice(1))
      setActiveTabId(nextTab.id)
    } else {
      closeTab(closedTabId, batchPostCloseActiveId)
      setPendingCloseTab(null)
      setCloseQueue([])
      setBatchPostCloseActiveId(null)
      setIsSaveModalFromClose(false)
    }
  }

  const handleRequestCloseTab = (tabId: string) => {
    const target = tabs.find((t) => t.id === tabId)
    if (!target) return

    if (isTabDirty(target)) {
      setBatchPostCloseActiveId(null)
      setCloseQueue([])
      setPendingCloseTab(target)
      setActiveTabId(target.id)
    } else {
      closeTab(tabId)
    }
  }

  const handleCloseOthers = (tabId: string) => {
    const targetTab = tabs.find((t) => t.id === tabId)
    if (!targetTab) return

    const candidateTabs = tabs.filter((t) => t.id !== tabId)
    if (candidateTabs.length === 0) return

    const cleanTabs = candidateTabs.filter((t) => !isTabDirty(t))
    const dirtyTabs = candidateTabs.filter((t) => isTabDirty(t))

    if (dirtyTabs.length === 0) {
      setTabs([targetTab])
      setActiveTabId(targetTab.id)
      if (targetTab.mode !== 'GRAPHQL') {
        setSelectedGraphFieldKeys([])
        setHighlightedField(null)
        setGraphExplorer((prev) => ({ ...prev, search: '' }))
      }
      return
    }

    // Clean tabs close immediately
    const remainingTabs = tabs.filter((t) => !cleanTabs.some((c) => c.id === t.id))
    setTabs(remainingTabs)

    setBatchPostCloseActiveId(targetTab.id)
    setPendingCloseTab(dirtyTabs[0])
    setCloseQueue(dirtyTabs.slice(1))
    setActiveTabId(dirtyTabs[0].id)
  }

  const handleCloseToRight = (tabId: string) => {
    const targetIndex = tabs.findIndex((t) => t.id === tabId)
    if (targetIndex === -1 || targetIndex >= tabs.length - 1) return

    const candidateTabs = tabs.slice(targetIndex + 1)
    if (candidateTabs.length === 0) return

    const cleanTabs = candidateTabs.filter((t) => !isTabDirty(t))
    const dirtyTabs = candidateTabs.filter((t) => isTabDirty(t))

    const activeIsClosing = candidateTabs.some((t) => t.id === activeTabId)
    const targetActive = activeIsClosing ? tabId : activeTabId

    if (dirtyTabs.length === 0) {
      const nextTabs = tabs.slice(0, targetIndex + 1)
      setTabs(nextTabs)
      if (activeIsClosing) {
        setActiveTabId(tabId)
        const targetTab = tabs[targetIndex]
        if (targetTab && targetTab.mode !== 'GRAPHQL') {
          setSelectedGraphFieldKeys([])
          setHighlightedField(null)
          setGraphExplorer((prev) => ({ ...prev, search: '' }))
        }
      }
      return
    }

    const remainingTabs = tabs.filter((t) => !cleanTabs.some((c) => c.id === t.id))
    setTabs(remainingTabs)

    setBatchPostCloseActiveId(targetActive)
    setPendingCloseTab(dirtyTabs[0])
    setCloseQueue(dirtyTabs.slice(1))
    setActiveTabId(dirtyTabs[0].id)
  }

  const handleCloseAll = () => {
    if (tabs.length === 0) return

    const cleanTabs = tabs.filter((t) => !isTabDirty(t))
    const dirtyTabs = tabs.filter((t) => isTabDirty(t))

    if (dirtyTabs.length === 0) {
      setTabs([])
      setActiveTabId('')
      setSelectedGraphFieldKeys([])
      setHighlightedField(null)
      setGraphExplorer((prev) => ({ ...prev, search: '' }))
      return
    }

    const remainingTabs = tabs.filter((t) => !cleanTabs.some((c) => c.id === t.id))
    setTabs(remainingTabs)

    setBatchPostCloseActiveId('')
    setPendingCloseTab(dirtyTabs[0])
    setCloseQueue(dirtyTabs.slice(1))
    setActiveTabId(dirtyTabs[0].id)
  }

  const handleConfirmSaveAndClose = () => {
    if (!pendingCloseTab) return

    // If tab is linked to collection: save directly and advance queue
    if (
      pendingCloseTab.savedRequestId &&
      savedRequests.some((r) => r.id === pendingCloseTab.savedRequestId)
    ) {
      const payload = stripTransientRequest(pendingCloseTab)
      setSavedRequests((current) =>
        current.map((item) =>
          item.id === pendingCloseTab.savedRequestId
            ? {
                ...item,
                name: pendingCloseTab.name,
                request: payload,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      )
      const idToClose = pendingCloseTab.id
      showToast('Request saved successfully')
      advanceCloseQueue(idToClose)
      return
    }

    // Unsaved request: focus it, close unsaved modal and open Save Request modal
    setActiveTabId(pendingCloseTab.id)
    setIsSaveModalFromClose(true)
    setSaveRequestModalOpen(true)
  }

  const handleDiscardAndClose = () => {
    if (!pendingCloseTab) return
    const idToClose = pendingCloseTab.id
    advanceCloseQueue(idToClose)
  }

  const handleCancelClose = () => {
    setPendingCloseTab(null)
    setCloseQueue([])
    setBatchPostCloseActiveId(null)
    setIsSaveModalFromClose(false)
  }

  const duplicateTab = (source?: RequestItem) => {
    const target = source || activeTab
    if (!target) return
    const duplicate: RequestItem = {
      ...target,
      id: createId(),
      savedRequestId: undefined,
      collectionId: undefined,
      folderId: undefined,
      name: `${target.name} Copy`,
      response: null,
      loading: false,
      clientError: '',
      testResults: null,
    }
    duplicate.savedSnapshot = createRequestSnapshot(duplicate)
    setTabs((current) => [...current, duplicate])
    setActiveTabId(duplicate.id)
  }

  const saveCurrentRequest = () => {
    if (!activeTab) return

    // Case 1: Tab is linked to an existing saved request in collections
    if (activeTab.savedRequestId && savedRequests.some((r) => r.id === activeTab.savedRequestId)) {
      const payload = stripTransientRequest(activeTab)
      const newSnapshot = createRequestSnapshot(activeTab)

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
      setTabs((current) =>
        current.map((item) =>
          item.id === activeTab.id
            ? { ...item, savedSnapshot: newSnapshot }
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
    const newSnapshot = createRequestSnapshot(updatedTabItem)

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

    if (!expandedCollectionIds.includes(targetCollectionId)) {
      setExpandedCollectionIds((current) => [...current, targetCollectionId])
    }
    if (targetFolderId && !expandedFolderIds.includes(targetFolderId)) {
      setExpandedFolderIds((current) => [...current, targetFolderId])
    }

    setSaveRequestModalOpen(false)
    showToast('Request saved successfully')

    if (isSaveModalFromClose && pendingCloseTab) {
      const idToClose = pendingCloseTab.id
      setIsSaveModalFromClose(false)
      advanceCloseQueue(idToClose)
    } else {
      setTabs((current) =>
        current.map((item) =>
          item.id === activeTab.id
            ? {
                ...item,
                name: targetName,
                savedRequestId: newSavedId,
                collectionId: targetCollectionId,
                folderId: targetFolderId,
                savedSnapshot: newSnapshot,
              }
            : item,
        ),
      )
    }
  }

  const handleCancelSaveRequest = () => {
    setSaveRequestModalOpen(false)
    if (isSaveModalFromClose) {
      setIsSaveModalFromClose(false)
      setPendingCloseTab(null)
      setCloseQueue([])
      setBatchPostCloseActiveId(null)
    }
  }

  const openSavedRequest = (saved: SavedRequestItem) => {
    const existingTab = tabs.find((item) => item.savedRequestId === saved.id)
    if (existingTab) {
      setActiveTabId(existingTab.id)
      setMobileView('REQUEST')
    } else {
      const initialSnapshot = createRequestSnapshot(saved.request)
      const opened = reviveRequest({
        ...saved.request,
        id: createId(),
        savedRequestId: saved.id,
        collectionId: saved.collectionId,
        folderId: saved.folderId,
        name: saved.name,
        savedSnapshot: initialSnapshot,
      })
      opened.savedSnapshot = initialSnapshot
      setTabs((current) => [...current, opened])
      setActiveTabId(opened.id)
      setMobileView('REQUEST')
    }

    // Auto-locate & Reveal API in GraphQL Explorer
    if (saved.request.mode === 'GRAPHQL') {
      const { rootFieldName, kind } = extractGraphQLRootInfo(saved.request)

      // 1. Auto-open Explorer Panel if closed
      if (!isExplorerOpen) {
        setIsExplorerOpen(true)
      }

      // 2. Compute reverse sync keys immediately if schema is loaded
      if (graphExplorer.queryFields.length > 0 || graphExplorer.mutationFields.length > 0) {
        const syncKeys = computeReverseSyncKeys(
          [],
          saved.request.gqlQuery || '',
          saved.request.gqlVariables || '',
          {
            queryFields: graphExplorer.queryFields,
            mutationFields: graphExplorer.mutationFields,
          },
          saved.request.graphqlRootField,
        )
        setSelectedGraphFieldKeys(syncKeys)
      }

      // 3. Set search term & active tab in Explorer
      if (rootFieldName) {
        setGraphExplorer((prev) => ({
          ...prev,
          search: rootFieldName,
          activeTab: kind,
        }))

        // 4. Trigger highlight & reveal in Explorer
        setHighlightedField({
          name: rootFieldName,
          trigger: Date.now(),
        })
      } else {
        setGraphExplorer((prev) => ({
          ...prev,
          activeTab: kind,
        }))
      }

      // 4. If schema not loaded yet, attempt auto-load
      if (
        graphExplorer.queryFields.length === 0 &&
        graphExplorer.mutationFields.length === 0 &&
        !graphExplorer.loading
      ) {
        void loadGraphSchema()
      }
    }
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

  const handleCreateFolderDirectly = (collectionId: string, parentId: string | null, name: string): string => {
    const newFolder: FolderItem = {
      id: createId(),
      collectionId,
      parentId,
      name: name.trim(),
    }
    setFolders((prev) => [...prev, newFolder])
    setExpandedFolderIds((prev) => [...prev, newFolder.id])
    return newFolder.id
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
      setExpandedFolderIds((prev) => [
        ...prev,
        ...result.folders.map((f) => f.id),
      ])
      setImportPostmanText('')
      setImportPostmanModalOpen(false)
      showToast(
        `Đã import thành công "${result.collection.name}" (${result.requests.length} requests, ${result.folders.length} folders)`,
        'success',
      )
    } catch {
      alert('Postman Collection JSON không hợp lệ. Vui lòng kiểm tra lại.')
    }
  }



  const addEnvironment = () => {
    const env = createDefaultEnvironment(
      `Env ${environments.length + 1}`,
      'http://localhost:3030',
    )
    setEnvironments((current) => [...current, env])
    setActiveEnvironmentId(env.id)
  }

  const handleDuplicateEnvironment = (envId: string) => {
    const source = environments.find((e) => e.id === envId)
    if (!source) return
    const duplicated: EnvironmentItem = {
      ...source,
      id: createId(),
      name: `${source.name} (Copy)`,
      variables: source.variables.map((v) => ({
        ...v,
        id: createId(),
      })),
    }
    setEnvironments((current) => [...current, duplicated])
    setActiveEnvironmentId(duplicated.id)
    showToast(`Đã nhân bản môi trường "${source.name}"`, 'success')
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

  const addEnvironmentVariable = (targetEnvId?: string) => {
    const envId = targetEnvId || activeEnvironment?.id || environments[0]?.id
    if (!envId) return
    setEnvironments((current) =>
      current.map((env) =>
        env.id !== envId
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
      else if (activeTab.editorTab === 'TESTS' || activeTab.editorTab === 'SCRIPTS') updateActiveTab({ preRequestScript: '', testScript: '' })
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
    } else if (activeTab.editorTab === 'TESTS' || activeTab.editorTab === 'SCRIPTS') {
      updateActiveTab({ preRequestScript: '', testScript: '' })
    }
  }

  const handleSyncToExplorer = (): { success: boolean; error?: string } => {
    if (!activeTab || activeTab.mode !== 'GRAPHQL') {
      showToast('Chỉ hỗ trợ đồng bộ ở chế độ GraphQL', 'warning')
      return { success: false, error: 'Not in GraphQL mode' }
    }

    let parsedVariablesObj: unknown = null

    // Check JSON syntax if variables has text using relaxed parse (stripping trailing commas)
    if (
      activeTab.gqlVariables &&
      activeTab.gqlVariables.trim() &&
      activeTab.gqlVariables.trim() !== '{}'
    ) {
      try {
        parsedVariablesObj = parseRelaxedJSON(activeTab.gqlVariables)
      } catch {
        showToast('Cú pháp JSON Variables không hợp lệ, không thể đồng bộ', 'error')
        return { success: false, error: 'Invalid JSON variables' }
      }
    }

    // Check Query syntax if query has text
    if (activeTab.gqlQuery && activeTab.gqlQuery.trim()) {
      try {
        parse(activeTab.gqlQuery)
      } catch {
        showToast('Cú pháp Query không hợp lệ, không thể đồng bộ', 'error')
        return { success: false, error: 'Invalid GraphQL Query' }
      }
    }

    // Auto-clean trailing commas in Editor by setting formatted clean JSON back to activeTab
    if (parsedVariablesObj !== null && typeof parsedVariablesObj === 'object') {
      const cleanJson = JSON.stringify(parsedVariablesObj, null, 2)
      if (cleanJson !== activeTab.gqlVariables) {
        updateActiveTab({ gqlVariables: cleanJson })
      }
    }

    const nextKeys = computeReverseSyncKeys(
      selectedGraphFieldKeys,
      activeTab.gqlQuery || '',
      activeTab.gqlVariables || '',
      {
        queryFields: graphExplorer.queryFields,
        mutationFields: graphExplorer.mutationFields,
      },
      activeTab.graphqlRootField,
    )

    setSelectedGraphFieldKeys(nextKeys)

    const { rootFieldName, kind } = extractGraphQLRootInfo(activeTab)
    if (!isExplorerOpen) {
      setIsExplorerOpen(true)
    }
    if (rootFieldName) {
      setGraphExplorer((prev) => ({
        ...prev,
        search: rootFieldName,
        activeTab: kind,
      }))
      setHighlightedField({
        name: rootFieldName,
        trigger: Date.now(),
      })
    }

    showToast('Đã đồng bộ sang Explorer thành công', 'success')
    return { success: true }
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

  const handleCancelRequest = (targetTabId?: string) => {
    const tabId = targetTabId || activeTab?.id
    if (!tabId) return

    const active = activeAbortControllersRef.current.get(tabId)
    if (active) {
      active.controller.abort()
      void cancelHttpRequest(active.requestId)
      activeAbortControllersRef.current.delete(tabId)
    }

    isSendingRef.current = false
    updateTab(tabId, {
      loading: false,
      clientError: 'Request đã bị huỷ bởi người dùng',
      response: {
        status: 0,
        statusText: 'Canceled',
        time: '-',
        size: '0 B',
        error: 'Request đã bị huỷ bởi người dùng',
        data: null,
        isNetworkError: true,
        isCanceled: true,
      },
    })
  }

  const handleSend = async () => {
    if (!activeTab || activeTab.loading) return
    const tabId = activeTab.id

    // Abort previous in-flight request on this tab if any
    const existing = activeAbortControllersRef.current.get(tabId)
    if (existing) {
      existing.controller.abort()
      void cancelHttpRequest(existing.requestId)
      activeAbortControllersRef.current.delete(tabId)
    }

    const abortController = new AbortController()
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    activeAbortControllersRef.current.set(tabId, { controller: abortController, requestId })

    updateTab(tabId, { loading: true, clientError: '', response: null, testResults: null })
    isSendingRef.current = true

    try {
      // 1. Prepare Environment & Run Pre-request Script (if any)
      let effectiveEnvironment: EnvironmentItem | null = activeEnvironment
        ? {
            ...activeEnvironment,
            variables: activeEnvironment.variables.map((v) => ({ ...v })),
          }
        : null

      const currentEnvDict: Record<string, string> = {}
      if (effectiveEnvironment?.variables) {
        effectiveEnvironment.variables
          .filter((v) => v.enabled)
          .forEach((v) => {
            currentEnvDict[v.key] = v.value
          })
      }

      const preTestResults: Array<{ id: string; name: string; passed: boolean; error?: string }> = []
      const preEnvMutations: Record<string, string> = {}

      if (activeTab.preRequestScript && activeTab.preRequestScript.trim()) {
        const rawHeaders: Record<string, string> = {}
        ;(activeTab.headersList || [])
          .filter((h) => h.enabled && h.key.trim())
          .forEach((h) => {
            rawHeaders[h.key.trim()] = h.value
          })

        const preContext: ScriptContext = {
          environment: currentEnvDict,
          request: {
            url: activeTab.url,
            method: activeTab.mode === 'GRAPHQL' ? 'POST' : activeTab.method,
            headers: rawHeaders,
            body:
              activeTab.mode === 'GRAPHQL'
                ? activeTab.gqlQuery
                : activeTab.bodyType === 'json'
                ? activeTab.restBody
                : activeTab.rawText,
          },
        }

        const preExec = executeScript(
          activeTab.preRequestScript,
          preContext,
          (key: string, val: string) => {
            preEnvMutations[key] = val
          },
        )

        preTestResults.push(...preExec.testResults)

        // Apply pre-request environment mutations immediately before resolving request parameters
        if (Object.keys(preEnvMutations).length > 0) {
          if (effectiveEnvironment) {
            const updatedVars = [...effectiveEnvironment.variables]
            Object.entries(preEnvMutations).forEach(([k, v]) => {
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
            effectiveEnvironment = { ...effectiveEnvironment, variables: updatedVars }

            // Update React environment state & persist
            setEnvironments((envs) => {
              const nextEnvs = envs.map((env) =>
                env.id === effectiveEnvironment!.id ? effectiveEnvironment! : env,
              )
              void saveEnvironments(nextEnvs)
              return nextEnvs
            })
          }
        }
      }

      // 2. Resolve URL, Auth, Headers and Body using the updated effectiveEnvironment
      const urlWithPathVars = resolvePathVariables(
        activeTab.url.trim(),
        activeTab.pathVariables,
        effectiveEnvironment,
      )
      let finalUrl = resolveTemplates(urlWithPathVars, effectiveEnvironment)

      if (!finalUrl) throw new Error('URL không được để trống')
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `http://${finalUrl}`
      }

      // Inject API Key query param if configured
      finalUrl = injectAuthToUrl(finalUrl, activeTab.auth, effectiveEnvironment)

      // Build unified headers (Auto-generated + User headers with highest priority, deduplicated)
      const headers = buildFinalHeaders(activeTab, effectiveEnvironment)

      const isLocal = isLocalhostUrl(finalUrl)
      const effectiveTimeout =
        settings.disableLocalhostTimeout && isLocal
          ? 0
          : (settings.requestTimeout ?? 30000)

      const requestOptions: HttpRequestOptions = {
        method: activeTab.mode === 'GRAPHQL' ? 'POST' : activeTab.method,
        url: finalUrl,
        headers,
        timeout: effectiveTimeout,
        rejectUnauthorized: settings.rejectUnauthorized ?? true,
        disableLocalhostTimeout: settings.disableLocalhostTimeout,
        requestId,
        signal: abortController.signal,
      }

      if (activeTab.mode === 'GRAPHQL') {
        let parsedVariables: Record<string, unknown> = {}
        try {
          parsedVariables = activeTab.gqlVariables.trim()
            ? parseJsonObject(
                resolveTemplates(activeTab.gqlVariables, effectiveEnvironment),
                'GraphQL variables',
              )
            : {}
        } catch {
          throw new Error('GraphQL variables phải là JSON object hợp lệ')
        }

        requestOptions.data = {
          query: resolveTemplates(activeTab.gqlQuery, effectiveEnvironment),
          variables: parsedVariables,
        }
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json'
        }
      } else {
        const hasContentType = Boolean(headers['Content-Type'] || headers['content-type'])

        if (activeTab.bodyType === 'json') {
          if (activeTab.restBody && activeTab.restBody.trim()) {
            const resolvedBody = resolveTemplates(activeTab.restBody, effectiveEnvironment)
            try {
              requestOptions.data = JSON.parse(resolvedBody)
            } catch {
              requestOptions.data = resolvedBody
            }
            if (!hasContentType) {
              headers['Content-Type'] = 'application/json'
            }
          }
        } else if (activeTab.bodyType === 'raw') {
          if (activeTab.rawText && activeTab.rawText.trim()) {
            requestOptions.data = resolveTemplates(activeTab.rawText, effectiveEnvironment)
            if (!hasContentType) {
              headers['Content-Type'] = 'text/plain'
            }
          }
        } else if (activeTab.bodyType === 'x-www-form-urlencoded') {
          const urlSearchParams = new URLSearchParams()
          activeTab.urlencoded
            .filter((r) => r.enabled && r.key.trim())
            .forEach((r) => {
              urlSearchParams.append(
                resolveTemplates(r.key.trim(), effectiveEnvironment),
                resolveTemplates(r.value, effectiveEnvironment),
              )
            })
          const dataStr = urlSearchParams.toString()
          if (dataStr) {
            requestOptions.data = dataStr
            if (!hasContentType) {
              headers['Content-Type'] = 'application/x-www-form-urlencoded'
            }
          }
        } else if (activeTab.bodyType === 'form-data') {
          const formObject: Record<string, string> = {}
          activeTab.formData
            .filter((r) => r.enabled && r.key.trim())
            .forEach((r) => {
              formObject[resolveTemplates(r.key.trim(), effectiveEnvironment)] =
                resolveTemplates(r.value, effectiveEnvironment)
            })
          requestOptions.data = formObject
          if (!hasContentType) {
            headers['Content-Type'] = 'multipart/form-data'
          }
        }
      }

      // 3. Send HTTP Request
      const result = await sendHttpRequest(requestOptions)

      if (abortController.signal.aborted || result.isCanceled || !isSendingRef.current) {
        return // cancelled
      }

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

      // 4. Run Post-response / Tests Script (if any)
      const postEnvMutations: Record<string, string> = {}
      const postTestResults: Array<{ id: string; name: string; passed: boolean; error?: string }> = []

      const responseBodyStr =
        typeof result.data === 'string'
          ? result.data
          : JSON.stringify(result.data ?? result.details ?? '')

      const jsonFn = () => {
        if (typeof result.data === 'object' && result.data !== null) return result.data
        if (typeof result.data === 'string') {
          try {
            return JSON.parse(result.data)
          } catch {
            return result.data
          }
        }
        return result.data ?? {}
      }

      if (activeTab.testScript && activeTab.testScript.trim()) {
        const postContext: ScriptContext = {
          environment: currentEnvDict,
          request: {
            url: finalUrl,
            method: activeTab.mode === 'GRAPHQL' ? 'POST' : activeTab.method,
            headers: (requestOptions.headers || {}) as Record<string, string>,
            body: requestOptions.data,
          },
          response: {
            status: result.status ?? 0,
            headers: result.headers || {},
            body: responseBodyStr,
            json: jsonFn,
            responseTime: result.duration ?? 0,
          },
        }

        const postExec = executeScript(
          activeTab.testScript,
          postContext,
          (key: string, val: string) => {
            postEnvMutations[key] = val
          },
        )

        postTestResults.push(...postExec.testResults)

        // Apply post-response environment mutations to active environment & persist
        if (Object.keys(postEnvMutations).length > 0) {
          if (effectiveEnvironment) {
            const updatedVars = [...effectiveEnvironment.variables]
            Object.entries(postEnvMutations).forEach(([k, v]) => {
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
            effectiveEnvironment = { ...effectiveEnvironment, variables: updatedVars }

            setEnvironments((envs) => {
              const nextEnvs = envs.map((env) =>
                env.id === effectiveEnvironment!.id ? effectiveEnvironment! : env,
              )
              void saveEnvironments(nextEnvs)
              return nextEnvs
            })
          }
        }
      }

      // Combine test results & environment mutations
      const allResults = [...preTestResults, ...postTestResults]
      const allEnvMutations = { ...preEnvMutations, ...postEnvMutations }
      const testReport = {
        total: allResults.length,
        passed: allResults.filter((r) => r.passed).length,
        failed: allResults.filter((r) => !r.passed).length,
        results: allResults,
        envMutations: allEnvMutations,
      }

      if (result.error && !result.status) {
        updateTab(tabId, {
          clientError: result.error,
          response: responseState,
          testResults: testReport,
        })
      } else {
        updateTab(tabId, {
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
      if (abortController.signal.aborted || !isSendingRef.current) return
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown client error'

      updateTab(tabId, {
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
      activeAbortControllersRef.current.delete(tabId)
      isSendingRef.current = false
      updateTab(tabId, { loading: false })
    }
  }

  const loadGraphSchema = async () => {
    // 1. Luôn lấy Endpoint & Headers tải Schema từ Environment (Single Source of Truth, độc lập hoàn toàn khỏi activeTab)
    const { resolvedUrl, headers } = getIntrospectionEndpointAndHeaders(activeEnvironment)

    // Kiểm tra nếu chưa có URL hoặc còn dính template unresolved
    if (!resolvedUrl || resolvedUrl.includes('{{Domain}}') || resolvedUrl === '/graphql') {
      const msg = 'Vui lòng cấu hình biến {{Domain}} trong Environment để tải Schema.'
      showToast(msg)
      setGraphExplorer((current) => ({
        ...current,
        loading: false,
        error: msg,
      }))
      return
    }

    setGraphExplorer((current) => ({ ...current, loading: true, error: '' }))

    try {
      const extracted = await fetchGraphQLSchema(resolvedUrl, headers)

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

  const isTabMatchingGraphQLApi = (
    tab: RequestItem | undefined | null,
    targetApiName: string,
  ): boolean => {
    if (!tab || tab.mode !== 'GRAPHQL') return false
    const target = targetApiName.trim().toLowerCase()

    // 1. Priority 1: Match by dedicated permanent graphqlRootField
    if (tab.graphqlRootField && tab.graphqlRootField.trim().toLowerCase() === target) {
      return true
    }

    // 2. Priority 2: Match by AST root field name
    if (tab.gqlQuery && tab.gqlQuery.trim()) {
      const queryInfo = extractOutputPathsFromQuery(tab.gqlQuery)
      if (queryInfo?.fieldName && queryInfo.fieldName.trim().toLowerCase() === target) {
        return true
      }
    }

    // 3. Fallback: Match by tab.name or unsaved default name
    const name = tab.name.trim().toLowerCase()
    if (name === target) return true
    if (tab.name.startsWith('New ') || tab.name.startsWith('Untitled')) return true

    return false
  }

  const createGraphRequestTab = (
    kind: 'query' | 'mutation',
    fields: GraphField[],
    keys?: string[],
  ) => {
    if (fields.length === 0) return

    const primaryField = fields[0]
    const fieldKey = getGraphFieldKey(kind, primaryField.name)
    const fieldPrefix = `${kind}:${primaryField.name}:`
    const scopedKeys = keys
      ? keys.filter((k) => k === fieldKey || k.startsWith(fieldPrefix))
      : undefined

    const generated = buildGraphOperationFromFields(kind, [primaryField], scopedKeys)
    const baseRequest = createDefaultRequest('GRAPHQL')
    const tabName = primaryField.name
    const primaryRootField = primaryField.name

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
      graphqlRootField: primaryRootField,
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
    newTab.savedSnapshot = createRequestSnapshot(newTab)

    setTabs((current) => [...current, newTab])
    setActiveTabId(newTab.id)
    setMobileView('REQUEST')
  }

  const syncExplorerToFieldTab = (
    field: GraphField,
    nextKeys: string[],
    kind: 'query' | 'mutation',
  ) => {
    const fieldKey = getGraphFieldKey(kind, field.name)
    const fieldPrefix = `${kind}:${field.name}:`
    const scopedKeys = nextKeys.filter((k) => k === fieldKey || k.startsWith(fieldPrefix))

    // Always generate operation strictly for ONLY this single field
    const generated = buildGraphOperationFromFields(kind, [field], scopedKeys)

    // 1. Guard check: Is activeTab currently matching this API (regardless of name or savedRequestId)?
    const isCurrentTabMatching = isTabMatchingGraphQLApi(activeTab, field.name)

    if (isCurrentTabMatching && activeTab) {
      // Parse current variables from activeTab to preserve user-entered values
      let currentVars: Record<string, unknown> = {}
      if (activeTab.gqlVariables?.trim()) {
        try {
          currentVars = parseRelaxedJSON(activeTab.gqlVariables) as Record<string, unknown>
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
        graphqlRootField: activeTab.graphqlRootField || field.name,
        gqlQuery: generated.query,
        gqlVariables: varJson,
      }

      if (activeTab.name.startsWith('New ') || activeTab.name.startsWith('Untitled')) {
        patch.name = field.name
      }

      isUpdatingFromExplorerRef.current = true
      setTabs((current) =>
        current.map((t) => (t.id === activeTab.id ? { ...t, ...patch } : t)),
      )
      return
    }

    // 2. Active tab is NOT matching (e.g. user is on a different API tab or REST tab)
    // Check if a matching tab for this API is already open on the Tabbar:
    const existingMatchingTab = tabs.find((t) => isTabMatchingGraphQLApi(t, field.name))

    if (existingMatchingTab) {
      let currentVars: Record<string, unknown> = {}
      if (existingMatchingTab.gqlVariables?.trim()) {
        try {
          currentVars = parseRelaxedJSON(existingMatchingTab.gqlVariables) as Record<string, unknown>
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

      isUpdatingFromExplorerRef.current = true
      setTabs((current) =>
        current.map((t) =>
          t.id === existingMatchingTab.id
            ? {
                ...t,
                mode: 'GRAPHQL',
                method: 'POST',
                graphqlRootField: existingMatchingTab.graphqlRootField || field.name,
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
      graphqlRootField: field.name,
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
    newTab.savedSnapshot = createRequestSnapshot(newTab)

    isUpdatingFromExplorerRef.current = true
    setTabs((current) => [...current, newTab])
    setActiveTabId(newTab.id)
    setMobileView('REQUEST')
  }

  const handleOpenGraphFieldInTab = (field: GraphField) => {
    const fieldKey = getGraphFieldKey(currentGraphOperationKind, field.name)
    const nextKeys = new Set<string>()

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

    const nextKeysArr = Array.from(nextKeys)
    setSelectedGraphFieldKeys(nextKeysArr)

    // Instantly create and activate exactly 1 new Request Tab for this API
    isUpdatingFromExplorerRef.current = true
    createGraphRequestTab(currentGraphOperationKind, [field], nextKeysArr)
  }

  const toggleGraphArg = (field: GraphField, arg: GraphArg, checked: boolean) => {
    const fieldKey = getGraphFieldKey(currentGraphOperationKind, field.name)
    const argKey = getGraphArgKey(currentGraphOperationKind, field.name, arg.name)
    const fieldPrefix = `${currentGraphOperationKind}:${field.name}:`
    const baseKeys = selectedGraphFieldKeys.filter(
      (k) => k === fieldKey || k.startsWith(fieldPrefix),
    )
    let nextKeys = new Set(baseKeys)

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
    const fieldPrefix = `${currentGraphOperationKind}:${field.name}:`
    const baseKeys = selectedGraphFieldKeys.filter(
      (k) => k === fieldKey || k.startsWith(fieldPrefix),
    )
    let nextKeys = new Set(baseKeys)

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
    const fieldPrefix = `${currentGraphOperationKind}:${field.name}:`
    const baseKeys = selectedGraphFieldKeys.filter(
      (k) => k === fieldKey || k.startsWith(fieldPrefix),
    )
    let nextKeys = new Set(baseKeys)

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
                  highlightedField={highlightedField}
                  onLoadSchema={loadGraphSchema}
                  onCloseMobile={() => setMobileView('REQUEST')}
                  onCloseExplorer={() => setIsExplorerOpen(false)}
                  onClearSearch={() => setHighlightedField(null)}
                  onOpenInTab={handleOpenGraphFieldInTab}
                  onToggleArg={toggleGraphArg}
                  onToggleInputField={toggleGraphInputField}
                  onToggleOutputField={toggleGraphOutputField}
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
            splitLayout={splitLayout}
            editorFontSize={settings.editorFontSize}
            isSidebarCollapsed={isSidebarCollapsed}
            isExplorerOpen={isExplorerOpen}
            onSelectEnvironment={setActiveEnvironmentId}
            onAddEnvironment={addEnvironment}
            onOpenManageEnvironments={() => {
              setIsSidebarCollapsed(false)
              setSidebarTab('ENVIRONMENTS')
            }}
            onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
            onToggleExplorer={() => setIsExplorerOpen((prev) => !prev)}
            onToggleSplitLayout={() =>
              setSplitLayout((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'))
            }
            onSelectTab={setActiveTabId}
            onDuplicateTab={duplicateTab}
            onCloseTab={handleRequestCloseTab}
            onCloseOthers={handleCloseOthers}
            onCloseToRight={handleCloseToRight}
            onCloseAll={handleCloseAll}
            onAddTab={addTab}
            onUpdateActiveTab={updateActiveTab}
            onSend={handleSend}
            onCancel={handleCancelRequest}
            onSave={saveCurrentRequest}
            onFormat={handleFormat}
            onClear={handleClear}
            onSyncToExplorer={handleSyncToExplorer}
            onCopyResponse={handleCopyResponse}
            onImportCurl={handleImportCurl}
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
                activeSidebarTab={sidebarTab}
                onSelectSidebarTab={setSidebarTab}
                environments={environments}
                activeEnvironmentId={activeEnvironmentId}
                activeEnvironment={activeEnvironment}
                collections={collections}
                folders={folders}
                savedRequests={savedRequests}
                expandedCollectionIds={expandedCollectionIds}
                expandedFolderIds={expandedFolderIds}
                onAddTab={() => addTab('GRAPHQL')}
                onAddEnvironment={addEnvironment}
                onDuplicateEnvironment={handleDuplicateEnvironment}
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
                onExportCollection={handleExportPostmanCollection}
                onMoveRequest={handleMoveRequest}
                onMoveFolder={handleMoveFolder}
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
        onImport={handleImportCurl}
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
          onClose={handleCancelSaveRequest}
          initialName={activeTab.name}
          collections={collections}
          folders={folders}
          defaultCollectionId={activeTab.collectionId || collections[0]?.id}
          defaultFolderId={activeTab.folderId}
          onSave={handleSaveNewRequest}
          onCreateFolder={handleCreateFolderDirectly}
        />
      )}

      {/* Modal: Unsaved Changes Confirmation */}
      <UnsavedChangesModal
        isOpen={Boolean(pendingCloseTab)}
        tabName={pendingCloseTab?.name || ''}
        onSave={handleConfirmSaveAndClose}
        onDiscard={handleDiscardAndClose}
        onCancel={handleCancelClose}
      />

      {/* Toast Notifications */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}

export default App
