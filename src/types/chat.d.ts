interface ChatItem {
  chatId: string
  lastMessage: string
  receiverId: string
  updatedAt: number
}

interface User {
  id: string
  username: string
  email: string
  avatar: string
  blocked: string[]
}

interface ChatWithUser extends ChatItem {
  user: User
  isSeen?: boolean
}

interface UserChatsData {
  chats: ChatItem[]
}

interface ChatStore {
  chatId: string | null
  user: User | null
  isCurrentUserBlocked: boolean
  isReceiverBlocked: boolean
  changeChat: (chatId: string, user: User) => void
  changeBlock: () => void
  resetChat: () => void
}
