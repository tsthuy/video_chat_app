import { createQueryKeys } from "@lukemorales/query-key-factory"

export const USER_CHAT_KEYS = createQueryKeys("user-chats", {
  all: (userId) => [userId]
})
