import { useCallback } from 'react'
import MDEditor from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'

interface EditorProps {
  isLoading: boolean
  currentMdxContent: string
  handleMdxChange: (content: string) => void
}

export function Editor({ isLoading, currentMdxContent, handleMdxChange }: EditorProps) {
  const handleChange = useCallback((value?: string) => {
    if (value !== undefined) handleMdxChange(value);
  }, [handleMdxChange]);

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
            <MDEditor
              value={currentMdxContent}
              onChange={handleChange}
              height="60vh"
              preview="edit"
              highlightEnable={true}
              className="min-h-[60vh]"
              visibleDragbar={true}
            />
          </div>
        </div>
      )}
    </div>
  )
}
