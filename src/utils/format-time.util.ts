import { Timestamp } from "firebase/firestore"

export const formatTime = (timestamp: Timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    const date = new Date()
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    return `${hours}:${minutes}`
  }

  const date = timestamp.toDate()
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  return `${hours}:${minutes}`
}
