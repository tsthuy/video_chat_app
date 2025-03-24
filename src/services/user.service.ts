import { doc, getDoc } from "firebase/firestore"

import { db } from "~/libs"

export const fetchUserChats = async (userId: string): Promise<ChatWithUser[]> => {
  const docRef = doc(db, "userchats", userId)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) {
    return []
  }

  const items = (docSnap.data() as UserChatsData).chats || []

  const promises = items.map(async (item: UserChatItem) => {
    const userDocRef = doc(db, "users", item.receiverId)
    const userDocSnap = await getDoc(userDocRef)
    const user = userDocSnap.data() as User

    return { ...item, user }
  })

  const chatData = await Promise.all(promises)
  return chatData.sort((a, b) => b.updatedAt - a.updatedAt)
}
