import { useCallback, useEffect, useRef, useState } from "react"

import type { FilterLevel } from "~/stores/use-call.store"
import { applyVideoFilter, setFpsCallback, stopVideoFilter } from "~/utils/video-filter.util"

interface UseVideoFilterOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  filterLevel: FilterLevel
  enabled: boolean
  onFpsUpdate?: (fps: number) => void
}

interface UseVideoFilterResult {
  filteredStream: MediaStream | null
  canvasRef: React.RefObject<HTMLCanvasElement>
  currentFps: number
}

export const useVideoFilter = ({
  videoRef,
  filterLevel,
  enabled,
  onFpsUpdate
}: UseVideoFilterOptions): UseVideoFilterResult => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [filteredStream, setFilteredStream] = useState<MediaStream | null>(null)
  const [currentFps, setCurrentFps] = useState(30)

  const stopFilteredStreamTracks = useCallback((stream: MediaStream | null) => {
    if (!stream) {
      return
    }

    stream.getTracks().forEach((track) => {
      track.stop()
    })
  }, [])

  const handleFpsUpdate = useCallback(
    (fps: number) => {
      setCurrentFps(fps)
      if (onFpsUpdate) {
        onFpsUpdate(fps)
      }
    },
    [onFpsUpdate]
  )

  useEffect(() => {
    if (!enabled || !videoRef.current || !canvasRef.current) {
      stopVideoFilter()
      setFilteredStream((previousStream) => {
        stopFilteredStreamTracks(previousStream)
        return null
      })
      return
    }

    if (filterLevel === "off") {
      stopVideoFilter()
      setFilteredStream((previousStream) => {
        stopFilteredStreamTracks(previousStream)
        return null
      })
      return
    }

    setFpsCallback(handleFpsUpdate)

    const video = videoRef.current
    const canvas = canvasRef.current

    const startFilter = () => {
      if (video.readyState >= 2) {
        const stream = applyVideoFilter(video, canvas, filterLevel)
        setFilteredStream((previousStream) => {
          if (previousStream && previousStream !== stream) {
            stopFilteredStreamTracks(previousStream)
          }
          return stream
        })
      }
    }

    if (video.readyState >= 2) {
      startFilter()
    } else {
      video.addEventListener("loadeddata", startFilter, { once: true })
    }

    return () => {
      stopVideoFilter()
      video.removeEventListener("loadeddata", startFilter)
      setFilteredStream((previousStream) => {
        stopFilteredStreamTracks(previousStream)
        return null
      })
    }
  }, [enabled, filterLevel, videoRef, handleFpsUpdate, stopFilteredStreamTracks])

  return {
    filteredStream,
    canvasRef,
    currentFps
  }
}
