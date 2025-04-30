import { useState, useEffect, useCallback, useRef } from 'react'
import { GetMdxResponse, PostMdxRequest, PostMdxResponse, ApiErrorResponse } from 'shared'
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
  codeMirrorPlugin, InsertThematicBreak,
} from '@mdxeditor/editor'
import { UndoRedo, BoldItalicUnderlineToggles, BlockTypeSelect, CreateLink, InsertCodeBlock,  } from '@mdxeditor/editor'
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"

// Create a client
const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MdxEditor />
    </QueryClientProvider>
  )
}

function MdxEditor() {
  const [mdxContent, setMdxContent] = useState<string>('')
  const [currentMdxContent, setCurrentMdxContent] = useState<string>('')
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [saveMessage, setSaveMessage] = useState<string>('')
  const editorRef = useRef<MDXEditorMethods>(null)
  const queryClient = useQueryClient()

  // Fetch MDX content from the server using React Query
  const {
    data,
    isLoading,
    error: queryError,
    refetch
  } = useQuery<GetMdxResponse>({
    queryKey: ['mdxContent'],
    queryFn: async () => {
      const response = await fetch(`${SERVER_URL}/api/mdx`)
      if (!response.ok) {
        const errorData = await response.json() as ApiErrorResponse
        throw new Error(errorData.error || 'Failed to fetch MDX content')
      }

      return await response.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false
  })

  // Update editor content when data is fetched
  useEffect(() => {
    if (data?.content) {
      // Ensure content is valid markdown
      try {
        const sanitizedContent = data.content.trim()
        setMdxContent(sanitizedContent)
        setCurrentMdxContent(sanitizedContent)

        // Only update the editor if it's mounted
        if (editorRef.current) {
          editorRef.current.setMarkdown(sanitizedContent)
        }
      } catch (err) {
        console.error('Error setting markdown content:', err)
      }
    }
  }, [data])

  // Save MDX content to the server using React Query mutation
  const { mutate: saveMdxContent, isPending: isSaving, error: mutationError } = useMutation<PostMdxResponse>({
    mutationFn: async () => {
      const requestBody: PostMdxRequest = {
        content: mdxContent
      }
      const response = await fetch(`${SERVER_URL}/api/mdx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json() as ApiErrorResponse
        throw new Error(errorData.error || 'Failed to save MDX content')
      }

      return await response.json()
    },
    onSuccess: (data) => {
      setSaveSuccess(true)
      setSaveMessage(`Successfully saved ${data.files.length} file(s)`)

      // Show a success message for 3 seconds
      setTimeout(() => {
        setSaveSuccess(false)
        setSaveMessage('')
      }, 3000)

      // Invalidate and refetch
      void queryClient.invalidateQueries({ queryKey: ['mdxContent'] })
    }
  })

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

  // Handle MDX content change
  const handleMdxChange = useCallback((content: string) => {
    try {
      setCurrentMdxContent(content)
    } catch (err) {
      console.error('Error updating MDX content:', err)
    }
  }, [])

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
  }, [mdxContent])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MDX Multi Edit</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Edit multiple MDX files as one</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={() => saveMdxContent()}
                disabled={isSaving || isLoading}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Status messages */}
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error.message}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="mb-4 rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{saveMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Editor */}
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

          {/* Instructions */}
          <div className="mt-6 bg-white dark:bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Instructions</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  How to use the MDX Multi Editor
                </p>
              </div>
              <div className="mt-5 md:mt-0 md:col-span-2">
                <div className="prose dark:prose-invert max-w-none">
                  <h4>File Structure</h4>
                  <p>
                    Files are displayed with headers that indicate their path. For example:
                  </p>
                  <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                    <code>## [intro](./docs/intro.mdx)</code>
                  </pre>
                  <p>Edit the content below each file header. When you save, changes will be written to the appropriate files.</p>

                  <h4>Keyboard Shortcuts</h4>
                  <ul>
                    <li><strong>Ctrl+S</strong> - Save changes</li>
                    <li><strong>Ctrl+B</strong> - Bold text</li>
                    <li><strong>Ctrl+I</strong> - Italic text</li>
                    <li><strong>Ctrl+K</strong> - Create link</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            MDX Multi Edit &copy; {new Date().getFullYear()} | Built with React, MDXEditor, and Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
