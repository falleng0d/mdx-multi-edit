import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GetMdxResponse, PostMdxRequest, PostMdxResponse, ApiErrorResponse } from 'shared'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"

async function getMdxContent(): Promise<GetMdxResponse> {
  const response = await fetch(`${SERVER_URL}/api/mdx`)
  if (!response.ok) {
    const errorData = await response.json() as ApiErrorResponse
    throw new Error(errorData.error || 'Failed to fetch MDX content')
  }

  return await response.json()
}

async function postMdxContent(content: string): Promise<PostMdxResponse> {
  const requestBody: PostMdxRequest = {
    content
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
}

export function useQueryMDX() {
  const [mdxContent, setMdxContent] = useState<string>('')

  const {
    data,
    isLoading,
    error: queryError,
    refetch
  } = useQuery<GetMdxResponse>({
    queryKey: ['mdxContent'],
    queryFn: getMdxContent,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false
  })

  useEffect(() => {
    if (data?.content) {
      try {
        const sanitizedContent = data.content.trim()
        setMdxContent(sanitizedContent)
      } catch (err) {
        console.error('Error setting markdown content:', err)
      }
    }
  }, [data])

  return {
    mdxContent,
    setMdxContent,
    isLoading,
    error: queryError,
    refetch,
  }
}

export function useSaveMDX(mdxContent: string) {
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [saveMessage, setSaveMessage] = useState<string>('')
  const queryClient = useQueryClient()

  // Save MDX content to the server using React Query mutation
  const { mutate: saveMutation, isPending: isSaving, error: mutationError } = useMutation<PostMdxResponse>({
    mutationFn: () => postMdxContent(mdxContent),
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

  return {
    saveSuccess,
    saveMessage,
    isSaving,
    error: mutationError,
    saveMdxContent: saveMutation
  }
}
