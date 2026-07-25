"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { deduplicateRequest } from "@/lib/api/request-dedup"

type FetchState<T> = {
  data: T | null
  loading: boolean
  error: Error | null
}

export function useParallelFetch<T = any>(
  url: string | null,
  options?: {
    initialData?: T
    dedupKey?: string
    onSuccess?: (data: T) => void
    enabled?: boolean
  },
): FetchState<T> & { refetch: () => void } {
  const { initialData, dedupKey, onSuccess, enabled = true } = options || {}
  const [state, setState] = useState<FetchState<T>>({
    data: initialData ?? null,
    loading: !initialData && enabled && url !== null,
    error: null,
  })
  const abortRef = useRef(false)
  const prevUrlRef = useRef(url)

  const fetchData = useCallback(() => {
    if (!url || !enabled) return

    abortRef.current = false
    setState((s) => ({ ...s, loading: true, error: null }))

    const key = dedupKey ?? url
    deduplicateRequest<T>(key, () =>
      fetch(url, { credentials: "include" }).then((r) => {
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`)
        return r.json() as Promise<T>
      }),
    )
      .then((data) => {
        if (abortRef.current) return
        setState({ data, loading: false, error: null })
        onSuccess?.(data)
      })
      .catch((err) => {
        if (abortRef.current) return
        setState({ data: initialData ?? null, loading: false, error: err })
      })
  }, [url, enabled, dedupKey, onSuccess, initialData])

  useEffect(() => {
    if (url !== prevUrlRef.current) {
      prevUrlRef.current = url
      fetchData()
    }
  }, [fetchData, url])

  useEffect(() => {
    return () => {
      abortRef.current = true
    }
  }, [])

  const refetch = useCallback(() => {
    if (url) {
      const key = dedupKey ?? url
      import("@/lib/api/request-dedup").then((m) => m.cancelRequest(key))
    }
    fetchData()
  }, [fetchData, url, dedupKey])

  return { ...state, refetch }
}

export function useAuthRedirect(status: string) {
  const router = useRouter()
  const redirected = useRef(false)

  useEffect(() => {
    if (status === "unauthenticated" && !redirected.current) {
      redirected.current = true
      router.push("/login")
    }
  }, [status, router])
}
