import { useEffect, useRef } from 'react'

export const useAbortController = () => {
  const abortControllerRef = useRef(null)

  useEffect(() => {
    abortControllerRef.current = new AbortController()
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return abortControllerRef.current
}

