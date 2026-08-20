export type GraphExplorerTab = 'DOCS' | 'QUERY' | 'MUTATION'

export type GraphInputField = {
  name: string
  typeLabel: string
  emptyValue: unknown
}

export type GraphArg = {
  name: string
  typeLabel: string
  emptyValue: unknown
  inputFields: GraphInputField[]
}

export type GraphField = {
  name: string
  typeLabel: string
  args: GraphArg[]
  selectionFields: string[]
  isScalarResult: boolean
}

export type GraphExplorerState = {
  loading: boolean
  error: string
  search: string
  activeTab: GraphExplorerTab
  queryFields: GraphField[]
  mutationFields: GraphField[]
}
