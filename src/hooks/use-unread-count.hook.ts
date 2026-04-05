import { doc, onSnapshot } from "firebase/firestore"
import { useEffect, useState } from "react"

import { db } from "~/libs"

interface UserChatItem {
  chatId: string
  lastMessage: string
  isSeen?: boolean
}

interface UserChatsData {
  chats: UserChatItem[]
}

export const useUnreadCount = (userId: string | undefined) => {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0)
      setIsLoading(false)
      return
    }

    const unSub = onSnapshot(
      doc(db, "userchats", userId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as UserChatsData
          const chats = data.chats || []

          const count = chats.filter((chat) => !chat.isSeen && chat.lastMessage && chat.lastMessage !== "").length

          setUnreadCount(count)
        } else {
          setUnreadCount(0)
        }
        setIsLoading(false)
      },
      (error) => {
        console.error("Error listening to unread count:", error)
        setUnreadCount(0)
        setIsLoading(false)
      }
    )

    return () => unSub()
  }, [userId])

  return { unreadCount, isLoading }
}
