import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { doc, getDoc } from "firebase/firestore"

import { QUERY_KEYS } from "~/constants"
import { db } from "~/libs"
import { fetchUserChats } from "~/services/user.service"
import { useChatStore } from "~/stores"
import { useUserStore } from "~/stores"

export function useUserChats(userId: string) {
  return useQuery({
    ...QUERY_KEYS["user-chats"].all(userId),
    queryFn: async () => fetchUserChats(userId),
    enabled: !!userId
  })
}

export function useMembersChatGroup(chatId: string | null) {
  const { group } = useChatStore()
  const { currentUser } = useUserStore()

  return useQuery({
    ...QUERY_KEYS["user-chats"].members(chatId || ""),
    queryFn: async () => {
      if (!chatId || !group || !group.memberIds) {
        return {}
      }

      const memberIds = group.memberIds.filter((id) => id !== currentUser?.id)
      const memberPromises = memberIds.map((id) =>
        getDoc(doc(db, "users", id)).then((snap) => ({ [id]: snap.data() as User }))
      )
      const membersArray = await Promise.all(memberPromises)
      return membersArray.reduce((acc, curr) => ({ ...acc, ...curr }), {})
    },
    enabled: !!chatId && !!group && !!group.memberIds?.length,
    staleTime: 5 * 60 * 1000
  })
}

export function useInfinityTest() {
  return useInfiniteQuery({
    queryKey: ["infinityTest"],
    queryFn: ({ pageParam }) => Promise.resolve({ data: [], pageParam }),
    getNextPageParam: (lastPage) => lastPage.pageParam + 1,
    initialPageParam: 1
  })
}
