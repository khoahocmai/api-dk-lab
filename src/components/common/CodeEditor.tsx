import { useMemo } from 'react'
import CodeMirror, { EditorView, Extension } from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

export interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language?: 'json' | 'graphql' | 'text' | 'javascript'
  readOnly?: boolean
  placeholder?: string
  height?: string
  minHeight?: string
  maxHeight?: string
  fontSize?: number
  wrapLines?: boolean
}

export function CodeEditor({
  value,
  onChange,
  language = 'json',
  readOnly = false,
  placeholder,
  height = '100%',
  minHeight = '0px',
  maxHeight,
  fontSize,
  wrapLines = false,
}: CodeEditorProps) {
  const extensions = useMemo(() => {
    const ext: Extension[] = [oneDark]
    if (language === 'json') {
      ext.push(json())
    } else if (language === 'graphql' || language === 'javascript') {
      ext.push(javascript())
    }
    if (wrapLines) {
      ext.push(EditorView.lineWrapping)
    }
    return ext
  }, [language, wrapLines])

  return (
    <div
      className="codemirror-wrapper"
      style={{
        height,
        minHeight,
        maxHeight,
        fontSize: fontSize ? `${fontSize}px` : undefined,
      }}
    >
      <CodeMirror
        value={value}
        height={height}
        minHeight={minHeight}
        maxHeight={maxHeight}
        theme={oneDark}
        extensions={extensions}
        editable={!readOnly}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: !readOnly,
          highlightActiveLine: !readOnly,
          foldGutter: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: !readOnly,
          autocompletion: !readOnly,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          searchKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
      />
    </div>
  )
}
