interface UserChatItem {
  chatId: string
  lastMessage: string
  receiverId: string
  updatedAt: number
  isSeen?: boolean
  type?: "single" | "group"
  groupName?: string
  memberIds?: string[]
  imgUrl?: string
}

interface User {
  id: string
  username: string
  email: string
  avatar: string
  blocked: string[]
}

interface ChatWithUser extends UserChatItem {
  user: User
}

interface UserChatsData {
  chats: ChatItem[]
}

interface ChatStore {
  chatId: string | null
  user: User | null
  group: UserChatItem | null // Thêm thông tin nhóm
  isCurrentUserBlocked: boolean
  isReceiverBlocked: boolean
  changeChat: (chatId: string, user: User | null, group?: UserChatItem | null) => void
  changeBlock: () => void
  resetChat: () => void
}
