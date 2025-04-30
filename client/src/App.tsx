import { useCallback, useEffect, useRef, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type MDXEditorMethods } from '@mdxeditor/editor'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { StatusBar } from './components/StatusBar'
import { Editor } from './components/Editor'
import { Instructions } from './components/Instructions'
import { useQueryMDX, useSaveMDX } from './hooks/useMdxContent'

// Create a client
const queryClient = new QueryClient()

function App() {
  return (<QueryClientProvider client={queryClient}> <MdxEditor/> </QueryClientProvider>)
}

function MdxEditor() {
  const editorRef = useRef<MDXEditorMethods | null>(null)
  const [currentMdxContent, setCurrentMdxContent] = useState<string>('')
  const [isFreshCurrentMdxContent, setIsFreshCurrentMdxContent] = useState<boolean>(true)

  const {
    mdxContent, isLoading, error: queryError, refetch,
  } = useQueryMDX()

  const {
    saveSuccess, saveMessage, isSaving, error: mutationError, saveMdxContent,
  } = useSaveMDX(mdxContent)

  const setMdxContent = useCallback(() => {
    saveMdxContent()
    setIsFreshCurrentMdxContent(false);
  }, [saveMdxContent])

  // Combine errors from query and mutation
  const error = queryError || mutationError

  // Add a keyboard shortcut for saving (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (!isSaving && !isLoading) {
          saveMdxContent()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveMdxContent, isSaving, isLoading])

  // Update editor content when data is fetched
  useEffect(() => {
    if (editorRef.current && mdxContent) {
      if (!isFreshCurrentMdxContent && !isLoading && !isSaving && saveSuccess) {
        setCurrentMdxContent(mdxContent)
        setIsFreshCurrentMdxContent(true)
      }

      try {
        editorRef.current.setMarkdown(mdxContent)
      } catch (err) {
        console.error('Error setting markdown content:', err)
      }
    }
  }, [isFreshCurrentMdxContent, isLoading, isSaving, mdxContent, saveSuccess])

  return (<div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
    <Header
      isLoading={isLoading}
      isSaving={isSaving}
      refetch={refetch}
      saveMdxContent={setMdxContent}
    />

    <main className="flex-grow">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <StatusBar
          error={error}
          saveSuccess={saveSuccess}
          saveMessage={saveMessage}
        />

        <Editor
          isLoading={isLoading}
          currentMdxContent={currentMdxContent}
          mdxContent={mdxContent}
          handleMdxChange={setCurrentMdxContent}
          editorRef={editorRef}
        />

        <Instructions/>
      </div>
    </main>

    <Footer/>
  </div>)
}

export default App
