import { memo } from "react"

import { Chat } from "~/components/chat/chat-custom"
import { ListUserChat } from "~/components/list/list-user-chat"
import { MainTab } from "~/components/main-tab"
import { useChatStore } from "~/stores/use-chat.store"

const HomePage = memo(() => {
  const chatId = useChatStore((state) => state.chatId)
  return (
    <>
      <div className='flex h-screen'>
        <MainTab />
        <ListUserChat />
        {chatId && <Chat />}
      </div>
    </>
  )
})

export { HomePage }
