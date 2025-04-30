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

export const useQueryMDX = () => {
  const [mdxContent, setMdxContent] = useState<string>('')

  const {
    data,
    isLoading,
    error: queryError,
    refetch
  } = useQuery<GetMdxResponse>({
    queryKey: ['mdxContent'],
    queryFn: getMdxContent,
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
};

export function useSaveMDX(mdxContent: string) {
  const queryClient = useQueryClient()

  // Save MDX content to the server using React Query mutation
  const { mutate: saveMutation, isPending: isSaving, error: mutationError, data } = useMutation({
    mutationFn: () => postMdxContent(mdxContent),
    onSuccess: (data) => {
      // Invalidate and refetch
      void queryClient.invalidateQueries({ queryKey: ['mdxContent'] })
      return data
    }
  })

  return {
    isSaving,
    error: mutationError,
    saveMdxContent: saveMutation,
    data
  }
}
