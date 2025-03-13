import { useQuery } from "@tanstack/react-query"

import { QUERY_KEYS } from "~/constants"
import { fetchUserChats } from "~/services/user.service"

export function useUserChats(userId: string) {
  return useQuery({
    ...QUERY_KEYS["user-chats"].all(userId),
    queryFn: async () => fetchUserChats(userId),
    enabled: !!userId
  })
}
