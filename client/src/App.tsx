import { useEffect, useState, useCallback } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import toast, { Toaster } from 'react-hot-toast'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { Editor } from './components/Editor'
import { Instructions } from './components/Instructions'
import { useQueryMDX, useSaveMDX } from './hooks/useMdxContent'
import type { PostMdxResponse } from "shared";

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MdxEditor/>
    </QueryClientProvider>
  )
}

function MdxEditor() {
  const [currentMdxContent, setCurrentMdxContent] = useState<string>('')
  const { mdxContent, isLoading, error: queryError, refetch } = useQueryMDX()
  const { isSaving, saveMdxContent } = useSaveMDX(currentMdxContent)

  useEffect(() => {
    if (queryError) toast.error(queryError.message)
  }, [queryError])

  // Custom save function with toast notifications
  const handleSave = useCallback(() => {
    const loadingToast = toast.loading('Saving...')

    void toast.promise(new Promise<PostMdxResponse>((resolve, reject) => {
      saveMdxContent(undefined, {
        onSuccess: (data) => resolve(data), onError: (error) => reject(error),
      })
    }), {
      loading: 'Saving...',
      success: (data) => `Successfully saved ${data.files.length} file(s)`,
      error: (error: Error) => `Error: ${error.message}`,
    }, {
      id: loadingToast,
    })
  }, [saveMdxContent])

  const handleRefetch = useCallback(() => {
    const loadingToast = toast.loading('Refreshing...')

    void toast.promise(new Promise((resolve, reject) => {
      refetch()
      .then(data => resolve(data))
      .catch(error => reject(error))
    }), {
      loading: 'Refreshing...',
      success: 'Successfully refreshed content',
      error: (error: Error) => `Error: ${error.message}`,
    }, {
      id: loadingToast,
    })
  }, [refetch])

  // Add a keyboard shortcut for saving (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (!isSaving && !isLoading) {
          handleSave()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, isSaving, isLoading])

  // Update editor content when data is fetched
  useEffect(() => {
    if (mdxContent && !isLoading && !isSaving) {
      setCurrentMdxContent(mdxContent)
    }
  }, [isLoading, isSaving, mdxContent])

  return (<div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 3000, style: {
          background: '#333', color: '#fff',
        }, success: {
          iconTheme: {
            primary: '#10B981', secondary: '#FFFFFF',
          },
        }, error: {
          iconTheme: {
            primary: '#EF4444', secondary: '#FFFFFF',
          },
        },
      }}
    />
    <Header
      isLoading={isLoading}
      isSaving={isSaving}
      refetch={handleRefetch}
      saveMdxContent={handleSave}
    />
    <main className="flex-grow">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Editor
          isLoading={isLoading}
          currentMdxContent={currentMdxContent}
          handleMdxChange={setCurrentMdxContent}
        />
        <Instructions/>
      </div>
    </main>
    <Footer/>
  </div>)
}

export default App
