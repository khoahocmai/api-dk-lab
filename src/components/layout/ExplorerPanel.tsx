import React from 'react'
import type {
  GraphArg,
  GraphExplorerState,
  GraphField,
  GraphInputField,
  RequestItem,
} from '../../types'
import { Explorer } from '../graphql/Explorer'

interface ExplorerPanelProps {
  isMobileActive: boolean
  activeTab: RequestItem | undefined
  graphExplorer: GraphExplorerState
  setGraphExplorer: React.Dispatch<React.SetStateAction<GraphExplorerState>>
  selectedGraphFieldKeys: string[]
  onLoadSchema: () => Promise<void>
  onCloseMobile: () => void
  onToggleField: (field: GraphField, checked: boolean) => void
  onToggleArg: (field: GraphField, arg: GraphArg, checked: boolean) => void
  onToggleInputField?: (field: GraphField, arg: GraphArg, inputField: GraphInputField, checked: boolean) => void
  onToggleOutputField?: (field: GraphField, path: string, checked: boolean) => void
  onQuickInsert: (field: GraphField) => void
  onApplySelected: () => void
  onClearSelection: () => void
  onCloseExplorer?: () => void
}

export function ExplorerPanel({
  isMobileActive,
  activeTab,
  graphExplorer,
  setGraphExplorer,
  selectedGraphFieldKeys,
  onLoadSchema,
  onCloseMobile,
  onToggleField,
  onToggleArg,
  onToggleInputField,
  onToggleOutputField,
  onQuickInsert,
  onApplySelected,
  onClearSelection,
  onCloseExplorer,
}: ExplorerPanelProps) {
  return (
    <aside
      className={`panel explorer-panel ${isMobileActive ? 'is-mobile-active' : ''}`}
      style={{ height: '100%', maxHeight: '100%', width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
    >
      <Explorer
        activeTab={activeTab}
        graphExplorer={graphExplorer}
        setGraphExplorer={setGraphExplorer}
        selectedGraphFieldKeys={selectedGraphFieldKeys}
        onLoadSchema={onLoadSchema}
        onCloseMobile={onCloseMobile}
        onToggleField={onToggleField}
        onToggleArg={onToggleArg}
        onToggleInputField={onToggleInputField}
        onToggleOutputField={onToggleOutputField}
        onQuickInsert={onQuickInsert}
        onApplySelected={onApplySelected}
        onClearSelection={onClearSelection}
        onCloseExplorer={onCloseExplorer}
      />
    </aside>
  )
}
