import { memo } from "react"

import { ChatList } from "~/components/list/chat-list"

const ListUserChat = memo(() => {
  return (
    <div className='min-w-[344px] h-screen flex flex-col border-r border-gray-200 overflow-y-auto'>
      <ChatList />
    </div>
  )
})

export { ListUserChat }
