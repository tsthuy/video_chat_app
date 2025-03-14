import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore"
import { Users } from "lucide-react"
import { memo, useEffect, useState } from "react"
import { toast } from "react-toastify"

import { AddUser } from "~/components/list/add-user"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { db } from "~/lib/firebase"
import { cn } from "~/lib/utils"
import { useChatStore } from "~/stores/use-chat.store"
import { useUserStore } from "~/stores/use-user.store"
import { getErrorMessage } from "~/utils/get-error-messages.util"

const ChatList = memo(() => {
  const currentUser = useUserStore((state) => state.currentUser)
  const changeChat = useChatStore((state) => state.changeChat)

  const [chats, setChats] = useState<ChatWithUser[]>()
  const chatId = useChatStore((state) => state.chatId)

  const [input, setInput] = useState("")

  useEffect(() => {
    const unSub = onSnapshot(doc(db, "userchats", currentUser!.id), async (res) => {
      const items = res?.data()?.chats

      const promises = items.map(async (item: UserChatItem) => {
        const userDocRef = doc(db, "users", item.receiverId)
        const userDocSnap = await getDoc(userDocRef)

        const user = userDocSnap.data()

        return { ...item, user }
      })

      const chatData = await Promise.all(promises)

      setChats(chatData.sort((a, b) => b.updatedAt - a.updatedAt))
    })

    return () => {
      unSub()
    }
  }, [currentUser, currentUser?.id])

  const filterChats = chats?.filter((c) => c.user.username.toLocaleLowerCase().includes(input.toLocaleLowerCase()))

  const handleSelect = async (chat: ChatWithUser) => {
    if (!currentUser) return

    const userChats: Omit<ChatWithUser, "user">[] = chats!.map((item) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars
      const { user, ...rest } = item
      return rest
    })

    const chatIndex = userChats.findIndex((item) => item.chatId === chat.chatId)

    if (chatIndex !== -1) {
      userChats[chatIndex].isSeen = true
    }

    const userChatsRef = doc(db, "userchats", currentUser.id)
    try {
      await updateDoc(userChatsRef, {
        chats: userChats
      })

      changeChat(chat.chatId, chat.user)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <>
      <div className='pt-2 px-2'>
        <div className='flex w-full gap-2'>
          <Input onChange={(e) => setInput(e.target.value)} name='username' className='' placeholder='Search...' />
          <Button type='button' variant='outline'>
            <Users />
          </Button>

          <AddUser />
        </div>
      </div>

      <div className='flex flex-col justify-center pt-4'>
        {filterChats &&
          filterChats.map((chat) => (
            <div
              onClick={() => handleSelect(chat)}
              className={cn(
                "flex gap-2 items-center py-2 px-2 cursor-pointer",
                chatId === chat.chatId ? "bg-accent" : "bg-transparent",
                !chat.isSeen && chat.lastMessage !== "" && chat.chatId !== chatId && "bg-[#5183fe]"
              )}
            >
              <figure className='flex items-center'>
                <img className='rounded-full w-[50px] h-[50px]' src={chat.user.avatar} alt='avatar' />
              </figure>
              <div className='flex flex-col'>
                <h3>{chat.user.username}</h3>
                <p className='text-sm truncate max-w-[250px]'>{chat.lastMessage}</p>
              </div>
            </div>
          ))}
      </div>
    </>
  )
})

export { ChatList }
