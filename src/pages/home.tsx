import { memo, useEffect } from "react"

import { ChatOptimize } from "~/components/chat/chat"
import { ListUserChat } from "~/components/list/list-user-chat"
import { MainTab } from "~/components/main-tab"
import { Profile } from "~/components/profile/profile"
import { ProfilePanel } from "~/components/profile/profile-panel"
import { useMediaQuery } from "~/hooks"
import { useChatStore } from "~/stores"

const HomePage = memo(() => {
  const chatId = useChatStore((state) => state.chatId)
  const user = useChatStore((state) => state.user)
  const group = useChatStore((state) => state.group)
  const isProfileOpen = useChatStore((state) => state.isProfileOpen)
  const setIsProfileOpen = useChatStore((state) => state.setIsProfileOpen)
  const isUserChatOpen = useChatStore((state) => state.isUserChatOpen)
  const setIsUserChatOpen = useChatStore((state) => state.setIsUserChatOpen)

  const isXlOrSmaller = useMediaQuery("(max-width: 1280px)")
  useEffect(() => {
    setIsProfileOpen(!isXlOrSmaller)
  }, [isXlOrSmaller, setIsProfileOpen])

  const isMdOrSmaller = useMediaQuery("(max-width: 768px)")
  useEffect(() => {
    if (!chatId) return
    setIsUserChatOpen(!isMdOrSmaller)
  }, [chatId, isMdOrSmaller, setIsUserChatOpen])

  const isLgOrSmaller = useMediaQuery("(max-width: 1024px)")

  return (
    <div className='flex h-svh'>
      <MainTab />
      {isUserChatOpen && <ListUserChat />}

      {chatId && <ChatOptimize />}

      {!chatId && !isMdOrSmaller && (
        <div className='flex-1 h-full flex items-center justify-center'>
          <p className='text-gray-500'>Select a chat to start messaging</p>
        </div>
      )}

      {chatId && (
        <>
          {!isLgOrSmaller && isProfileOpen && <Profile user={user} group={group!} />}
          {isLgOrSmaller && <ProfilePanel />}
        </>
      )}
    </div>
  )
})

export { HomePage }
