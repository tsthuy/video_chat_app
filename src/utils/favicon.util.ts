const FAVICON_SIZE = 64
const BADGE_RADIUS = 22
const BADGE_X = 40
const BADGE_Y = 22
const BADGE_COLOR = "#FF5A5F"
const BADGE_TEXT_COLOR = "#FFFFFF"

let originalFaviconUrl: string | null = null
let faviconLink: HTMLLinkElement | null = null

const getOriginalFavicon = (): string => {
  if (originalFaviconUrl) return originalFaviconUrl

  faviconLink = document.querySelector("link[rel='icon']")
  if (faviconLink) {
    originalFaviconUrl = faviconLink.href
  } else {
    originalFaviconUrl = "/vite.svg"
  }

  return originalFaviconUrl
}

const drawBadge = (ctx: CanvasRenderingContext2D, count: number): void => {
  ctx.fillStyle = BADGE_COLOR
  ctx.beginPath()
  ctx.arc(BADGE_X, BADGE_Y, BADGE_RADIUS, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = BADGE_TEXT_COLOR
  ctx.font = "bold 24px Arial"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  const displayText = count > 99 ? "99+" : count.toString()
  ctx.fillText(displayText, BADGE_X, BADGE_Y)
}

export const updateFaviconBadge = (count: number): void => {
  const originalUrl = getOriginalFavicon()

  if (count <= 0) {
    resetFavicon()
    return
  }

  const canvas = document.createElement("canvas")
  canvas.width = FAVICON_SIZE
  canvas.height = FAVICON_SIZE

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const img = new Image()
  img.crossOrigin = "anonymous"

  img.onload = () => {
    ctx.drawImage(img, 0, 0, FAVICON_SIZE, FAVICON_SIZE)
    drawBadge(ctx, count)
    updateFaviconElement(canvas.toDataURL("image/png"))
  }

  img.onerror = () => {
    ctx.fillStyle = "#646cff"
    ctx.fillRect(0, 0, FAVICON_SIZE, FAVICON_SIZE)
    drawBadge(ctx, count)
    updateFaviconElement(canvas.toDataURL("image/png"))
  }

  img.src = originalUrl
}

const updateFaviconElement = (dataUrl: string): void => {
  if (!faviconLink) {
    faviconLink = document.querySelector("link[rel='icon']")
  }

  if (faviconLink) {
    faviconLink.href = dataUrl
  } else {
    const newLink = document.createElement("link")
    newLink.rel = "icon"
    newLink.href = dataUrl
    document.head.appendChild(newLink)
    faviconLink = newLink
  }
}

export const resetFavicon = (): void => {
  const originalUrl = getOriginalFavicon()

  if (faviconLink) {
    faviconLink.href = originalUrl
  }
}

export const updateDocumentTitle = (count: number, originalTitle: string): void => {
  if (count > 0) {
    document.title = `(${count > 99 ? "99+" : count}) ${originalTitle}`
  } else {
    document.title = originalTitle
  }
}
