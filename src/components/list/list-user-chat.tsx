import { memo } from "react"

import { ChatList } from "~/components/list/chat-list"
import { cn } from "~/lib/utils"
import { useChatStore } from "~/stores"

const ListUserChat = memo(() => {
  const chatId = useChatStore((state) => state.chatId)
  return (
    <div className={cn(!chatId && "flex-1", "min-w-[344px] max-w-[768px] flex flex-col border-r border-gray-200")}>
      <ChatList />
    </div>
  )
})

export { ListUserChat }
