// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getErrorMessage(error: any, overrideMessage?: string) {
  return (
    error?.response?.message ||
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    overrideMessage ||
    "Something went wrong"
  )
}
