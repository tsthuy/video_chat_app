import type { FilterLevel } from "~/stores/use-call.store"

const FILTER_CONFIGS: Record<FilterLevel, string> = {
  off: "none",
  light: "brightness(1.2) blur(1px) saturate(1.05)",
  medium: "brightness(1.3) blur(2px) saturate(1.1) contrast(1.05)",
  strong: "brightness(1.4) blur(3px) saturate(1.2) contrast(1.1)"
}

let animationFrameId: number | null = null
let lastFrameTime = 0
let frameCount = 0
let fpsCallback: ((fps: number) => void) | null = null

export const setFpsCallback = (callback: (fps: number) => void) => {
  fpsCallback = callback
}

export const applyVideoFilter = (
  videoElement: HTMLVideoElement,
  canvasElement: HTMLCanvasElement,
  filterLevel: FilterLevel
): MediaStream | null => {
  const ctx = canvasElement.getContext("2d")
  if (!ctx) {
    console.error("🎨 [Filter] ERROR: Cannot get 2D context from canvas")
    return null
  }

  canvasElement.width = videoElement.videoWidth || 640
  canvasElement.height = videoElement.videoHeight || 480

  const filterConfig = FILTER_CONFIGS[filterLevel]

  const render = () => {
    if (!videoElement || videoElement.paused || videoElement.ended) {
      return
    }

    const currentTime = performance.now()
    frameCount++

    if (currentTime - lastFrameTime >= 1000) {
      const fps = Math.round((frameCount * 1000) / (currentTime - lastFrameTime))
      if (fpsCallback) {
        fpsCallback(fps)
      }
      frameCount = 0
      lastFrameTime = currentTime
    }

    try {
      // Apply filter to canvas context
      ctx.filter = filterConfig
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height)
      ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height)

      // Reset filter to avoid affecting other operations
      ctx.filter = "none"
    } catch (error) {
      console.error("🎨 [Filter] ERROR during canvas rendering:", error)
    }

    animationFrameId = requestAnimationFrame(render)
  }

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }

  lastFrameTime = performance.now()
  frameCount = 0
  render()

  try {
    return canvasElement.captureStream(30)
  } catch (error) {
    console.error("🎨 [Filter] ERROR capturing stream from canvas:", error)
    return null
  }
}

export const stopVideoFilter = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

export const getFilterConfig = (level: FilterLevel): string => {
  return FILTER_CONFIGS[level]
}
