import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import type { GraphArg, GraphField, GraphInputField, GraphOutputField } from '../../types'
import { GraphTypeBadge } from './GraphTypeBadge'
import {
  getGraphArgKey,
  getGraphInputFieldKey,
  getGraphOutputFieldKey,
} from '../../services/graphqlService'

interface IndeterminateCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  indeterminate?: boolean
}

function IndeterminateCheckbox({ indeterminate, checked, className, ...rest }: IndeterminateCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = Boolean(indeterminate)
    }
  }, [indeterminate])

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      className={className}
      {...rest}
    />
  )
}

interface GraphArgNodeProps {
  kind: 'query' | 'mutation'
  fieldName: string
  arg: GraphArg
  selectedKeys: string[]
  onToggleArg: (arg: GraphArg, checked: boolean) => void
  onToggleInputField?: (arg: GraphArg, inputField: GraphInputField, checked: boolean) => void
}

function GraphArgNode({
  kind,
  fieldName,
  arg,
  selectedKeys,
  onToggleArg,
  onToggleInputField,
}: GraphArgNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const argKey = getGraphArgKey(kind, fieldName, arg.name)
  const hasInputFields = arg.inputFields && arg.inputFields.length > 0

  let isChecked = false
  let isIndeterminate = false

  if (!hasInputFields) {
    // Scalar argument
    isChecked = selectedKeys.includes(argKey)
  } else {
    // Object argument with child input fields
    const childKeys = arg.inputFields.map((inf) =>
      getGraphInputFieldKey(kind, fieldName, arg.name, inf.name),
    )
    const selectedChildCount = childKeys.filter((k) =>
      selectedKeys.includes(k),
    ).length
    const totalChildCount = arg.inputFields.length

    isChecked = selectedChildCount === totalChildCount && totalChildCount > 0
    isIndeterminate = selectedChildCount > 0 && selectedChildCount < totalChildCount
  }

  return (
    <div className="graph-tree-node">
      <div
        className="graph-tree-row cursor-pointer"
        onClick={() => hasInputFields && setIsExpanded((prev) => !prev)}
      >
        {hasInputFields ? (
          <button
            type="button"
            className="icon-button icon-button-sm graph-tree-chevron"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded((prev) => !prev)
            }}
            title={isExpanded ? 'Collapse' : 'Expand input fields'}
          >
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <div className="graph-tree-spacer" />
        )}

        <IndeterminateCheckbox
          checked={isChecked}
          indeterminate={isIndeterminate}
          onChange={(e) => {
            e.stopPropagation()
            onToggleArg(arg, e.target.checked)
          }}
          onClick={(e) => e.stopPropagation()}
          className="graph-card-checkbox cursor-pointer"
          aria-label={`Toggle argument ${arg.name}`}
        />

        <span className="graph-arg-badge">ARG</span>
        <span className="graph-arg-name font-mono font-medium text-slate-200">{arg.name}</span>
        <span className="graph-colon text-slate-500">:</span>
        <GraphTypeBadge typeLabel={arg.typeLabel} />
      </div>

      {/* Expanded Input Fields */}
      {isExpanded && hasInputFields && (
        <div className="graph-tree-children">
          {arg.inputFields.map((inputField) => {
            const inputKey = getGraphInputFieldKey(
              kind,
              fieldName,
              arg.name,
              inputField.name,
            )
            const isChildChecked = selectedKeys.includes(inputKey)

            return (
              <label
                key={inputField.name}
                className="graph-tree-row graph-tree-leaf cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="graph-tree-spacer" />
                <input
                  type="checkbox"
                  checked={isChildChecked}
                  onChange={(e) =>
                    onToggleInputField?.(arg, inputField, e.target.checked)
                  }
                  className="graph-card-checkbox cursor-pointer"
                  style={{ transform: 'scale(0.85)' }}
                  aria-label={`Toggle input field ${inputField.name}`}
                />
                <span className="graph-leaf-name font-mono text-slate-300">{inputField.name}</span>
                <span className="graph-colon text-slate-500">:</span>
                <GraphTypeBadge typeLabel={inputField.typeLabel} />
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface GraphOutputFieldNodeProps {
  kind: 'query' | 'mutation'
  fieldName: string
  item: GraphOutputField
  parentPath?: string
  selectedKeys: string[]
  onToggleOutputField?: (path: string, checked: boolean) => void
}

function GraphOutputFieldNode({
  kind,
  fieldName,
  item,
  parentPath,
  selectedKeys,
  onToggleOutputField,
}: GraphOutputFieldNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const fullPath = parentPath ? `${parentPath}.${item.name}` : item.name
  const outKey = getGraphOutputFieldKey(kind, fieldName, fullPath)

  const hasChildren = Boolean(item.fields && item.fields.length > 0)

  if (!hasChildren) {
    // Leaf / Scalar Output Field
    const isChecked = selectedKeys.includes(outKey)

    return (
      <label
        className="graph-tree-row graph-tree-leaf cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="graph-tree-spacer" />
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => onToggleOutputField?.(fullPath, e.target.checked)}
          className="graph-card-checkbox cursor-pointer"
          style={{ transform: 'scale(0.85)' }}
          aria-label={`Toggle return field ${fullPath}`}
        />
        <span className="graph-leaf-name font-mono text-slate-300">{item.name}</span>
        <span className="graph-colon text-slate-500">:</span>
        <GraphTypeBadge typeLabel={item.typeLabel} />
      </label>
    )
  }

  // Nested Object / Array of Objects
  const prefix = `${outKey}.`
  const selectedChildren = selectedKeys.filter((k) => k.startsWith(prefix))
  const isAnyChildSelected = selectedChildren.length > 0
  const isChecked = selectedKeys.includes(outKey) || isAnyChildSelected

  return (
    <div className="graph-tree-node">
      <div
        className="graph-tree-row cursor-pointer"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <button
          type="button"
          className="icon-button icon-button-sm graph-tree-chevron"
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded((prev) => !prev)
          }}
          title={isExpanded ? 'Collapse' : 'Expand return fields'}
        >
          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        <IndeterminateCheckbox
          checked={isChecked}
          indeterminate={isAnyChildSelected && !selectedKeys.includes(outKey)}
          onChange={(e) => {
            e.stopPropagation()
            onToggleOutputField?.(fullPath, e.target.checked)
          }}
          onClick={(e) => e.stopPropagation()}
          className="graph-card-checkbox cursor-pointer"
          style={{ transform: 'scale(0.85)' }}
          aria-label={`Toggle return object ${fullPath}`}
        />

        <span className="graph-obj-name font-mono font-semibold text-sky-400">{item.name}</span>
        <span className="graph-colon text-slate-500">:</span>
        <GraphTypeBadge typeLabel={item.typeLabel} />
      </div>

      {isExpanded && item.fields && (
        <div className="graph-tree-children">
          {item.fields.map((child) => (
            <GraphOutputFieldNode
              key={child.name}
              kind={kind}
              fieldName={fieldName}
              item={child}
              parentPath={fullPath}
              selectedKeys={selectedKeys}
              onToggleOutputField={onToggleOutputField}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface GraphFieldCardProps {
  kind: 'query' | 'mutation'
  field: GraphField
  selectedKeys: string[]
  onOpenInTab: () => void
  onToggleArg: (arg: GraphArg, checked: boolean) => void
  onToggleInputField?: (arg: GraphArg, inputField: GraphInputField, checked: boolean) => void
  onToggleOutputField?: (path: string, checked: boolean) => void
}

export function GraphFieldCard({
  kind,
  field,
  selectedKeys,
  onOpenInTab,
  onToggleArg,
  onToggleInputField,
  onToggleOutputField,
}: GraphFieldCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Safely resolve output fields list with fallback to selectionFields
  const outputFields =
    field.outputFields && field.outputFields.length > 0
      ? field.outputFields
      : field.selectionFields && field.selectionFields.length > 0
      ? field.selectionFields.map((name) => ({
          name,
          typeLabel: 'String',
          isScalar: true,
          isList: false,
        }))
      : []

  const hasArgs = field.args && field.args.length > 0
  const hasDetails = hasArgs || outputFields.length > 0 || Boolean(field.typeLabel)

  return (
    <div className="graph-field-card">
      {/* Header Row - Full Row Clickable Accordion with Quick Open Action */}
      <div
        className="graph-card-header"
        onClick={() => hasDetails && setIsExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        style={{ cursor: hasDetails ? 'pointer' : 'default' }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (hasDetails) setIsExpanded((prev) => !prev)
          }
        }}
      >
        {/* 1. Nút '+' ở đầu dòng (Tạo Tab mới) */}
        <button
          type="button"
          className="graph-open-tab-btn"
          onClick={(event) => {
            event.stopPropagation()
            onOpenInTab()
          }}
          title="Open in new tab"
          aria-label={`Open ${field.name} in new tab`}
        >
          <Plus size={14} />
        </button>

        {/* 2. Tên API */}
        <span
          className="graph-field-name"
          title={`API: ${field.name}\nReturn Type: ${field.typeLabel || 'Unknown'}`}
        >
          {field.name}
        </span>
      </div>

      {/* Expanded Details: Arguments & Return Fields */}
      {isExpanded && (
        <div className="graph-args-container">
          {/* Return Type Info Line */}
          {field.typeLabel && (
            <div className="graph-return-type-row">
              <span className="text-[10px] uppercase font-bold text-slate-400">Returns:</span>
              <GraphTypeBadge typeLabel={field.typeLabel} />
            </div>
          )}

          {/* Section 1: Arguments (Inputs) */}
          {hasArgs && (
            <>
              <div className="graph-args-header">
                <span>ARGUMENTS ({field.args.length})</span>
              </div>

              <div className="graph-args-list">
                {field.args.map((arg) => (
                  <GraphArgNode
                    key={arg.name}
                    kind={kind}
                    fieldName={field.name}
                    arg={arg}
                    selectedKeys={selectedKeys}
                    onToggleArg={onToggleArg}
                    onToggleInputField={onToggleInputField}
                  />
                ))}
              </div>
            </>
          )}

          {/* Section 2: Return Output Fields Selection Tree - BẮT BUỘC RENDER */}
          <div className="graph-section-divider" />
          <div className="graph-args-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>RETURN FIELDS ({outputFields.length})</span>
          </div>

          {outputFields.length === 0 ? (
            <div className="text-[11px] text-slate-500 italic pl-2 py-1">No selection fields</div>
          ) : (
            <div className="graph-args-list">
              {outputFields.map((outField) => (
                <GraphOutputFieldNode
                  key={outField.name}
                  kind={kind}
                  fieldName={field.name}
                  item={outField}
                  selectedKeys={selectedKeys}
                  onToggleOutputField={onToggleOutputField}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
