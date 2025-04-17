export const getProxiedAvatarUrl = (originalUrl: string) => {
  if (!originalUrl) return ""

  if (originalUrl.includes("googleusercontent.com")) {
    return originalUrl.replace("s96-c", "s96-c-rw-mo")
  }

  return originalUrl
}
