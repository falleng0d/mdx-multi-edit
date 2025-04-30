import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  markdownShortcutPlugin,
  codeBlockPlugin,
  diffSourcePlugin,
  toolbarPlugin,
  type MDXEditorMethods,
  DiffSourceToggleWrapper,
  codeMirrorPlugin,
  InsertThematicBreak,
} from '@mdxeditor/editor'
import { UndoRedo, BoldItalicUnderlineToggles, BlockTypeSelect, CreateLink, InsertCodeBlock } from '@mdxeditor/editor'
import React, { useCallback } from 'react'

interface EditorProps {
  isLoading: boolean
  currentMdxContent: string
  mdxContent: string
  handleMdxChange: (content: string) => void
  editorRef: React.RefObject<MDXEditorMethods | null>
}

export function Editor({ isLoading, currentMdxContent, mdxContent, handleMdxChange, editorRef }: EditorProps) {
  // Handle editor error by switching to source mode
  const handleEditorError = useCallback(() => {
    if (editorRef.current) {
      try {
        // Try to switch to source mode if rich text mode fails
        console.log('Switching to source mode due to parsing error')
        editorRef.current.setMarkdown(mdxContent)
      } catch (err) {
        console.error('Error handling editor error:', err)
      }
    }
  }, [mdxContent, editorRef])

  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
      {isLoading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Loading MDX content...</p>
        </div>
      ) : (
        <div className="p-0 sm:p-0 md:p-0 lg:p-0">
          <div className="relative">
            {/* Error message for parsing issues */}
            <div className="mb-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
              <p>If you encounter parsing errors, try using the source mode by clicking the "Source" button in the toolbar.</p>
            </div>

            <MDXEditor
              ref={editorRef}
              markdown={currentMdxContent}
              onChange={handleMdxChange}
              contentEditableClassName="prose dark:prose-invert max-w-none p-4 min-h-[60vh] focus:outline-none"
              plugins={[
                headingsPlugin(),
                listsPlugin(),
                quotePlugin(),
                thematicBreakPlugin(),
                linkPlugin(),
                markdownShortcutPlugin(),
                codeBlockPlugin({ defaultCodeBlockLanguage: 'js' }),
                codeMirrorPlugin({ codeBlockLanguages: { js: 'JavaScript', css: 'CSS' } }),
                diffSourcePlugin({
                  viewMode: 'source',  // Start in source mode to avoid parsing errors
                  diffMarkdown: mdxContent
                }),
                toolbarPlugin({
                  toolbarContents: () => (
                    <>
                      <DiffSourceToggleWrapper>
                        <BlockTypeSelect />
                        <CreateLink />
                        <InsertCodeBlock />
                        <InsertThematicBreak />
                        <UndoRedo/>
                        <BoldItalicUnderlineToggles/>
                      </DiffSourceToggleWrapper>
                    </>
                  )
                })
              ]}
              onError={handleEditorError}
            />
          </div>
        </div>
      )}
    </div>
  )
}
