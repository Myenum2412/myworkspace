declare module "react-draft-wysiwyg" {
  import { EditorState, RawDraftContentState } from "draft-js"
  import { ComponentType, CSSProperties } from "react"

  interface EditorProps {
    editorState?: EditorState
    onEditorStateChange?: (editorState: EditorState) => void
    toolbarClassName?: string
    wrapperClassName?: string
    editorClassName?: string
    toolbarStyle?: CSSProperties
    wrapperStyle?: CSSProperties
    editorStyle?: CSSProperties
    toolbar?: object
    localization?: object
    readOnly?: boolean
    spellCheck?: boolean
    stripPastedStyles?: boolean
    defaultEditorState?: EditorState
    defaultContentState?: RawDraftContentState
    onContentStateChange?: (contentState: RawDraftContentState) => void
    placeholder?: string
    hashtag?: object
    mention?: object
  }

  export const Editor: ComponentType<EditorProps>
}
