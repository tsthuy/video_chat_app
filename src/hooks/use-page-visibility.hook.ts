import { useCallback, useEffect, useState } from "react"

export const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden)

  const handleVisibilityChange = useCallback(() => {
    setIsVisible(!document.hidden)
  }, [])

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [handleVisibilityChange])

  return isVisible
}
