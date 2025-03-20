import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore"
import { Users } from "lucide-react"
import { memo, useEffect, useState } from "react"
import { toast } from "react-toastify"

import { AddGroupUsers } from "~/components/list/add-group-users"
import { AddUser } from "~/components/list/add-user"
import { Input } from "~/components/ui/input"
import { db } from "~/lib/firebase"
import { cn } from "~/lib/utils"
import { useChatStore } from "~/stores"
import { useUserStore } from "~/stores/use-user.store"
import { getErrorMessage } from "~/utils"

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
        if (item.type === "group") {
          return { ...item, user: null }
        }

        const userDocRef = doc(db, "users", item.receiverId)
        const userDocSnap = await getDoc(userDocRef)
        const user = userDocSnap.data()
        return { ...item, user }
      })

      const chatData = await Promise.all(promises)
      setChats(chatData.sort((a, b) => b.updatedAt - a.updatedAt))
    })

    return () => unSub()
  }, [currentUser])

  const filterChats = chats?.filter((c) =>
    c.type === "group"
      ? c.groupName?.toLocaleLowerCase().includes(input.toLocaleLowerCase())
      : c.user?.username.toLocaleLowerCase().includes(input.toLocaleLowerCase())
  )

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
      await updateDoc(userChatsRef, { chats: userChats })
      changeChat(chat.chatId, chat.user, chat.type === "group" ? chat : null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <>
      <div className='py-2 px-2'>
        <div className='flex w-full gap-2'>
          <Input onChange={(e) => setInput(e.target.value)} name='username' placeholder='Search...' />

          <AddGroupUsers />

          <AddUser />
        </div>
      </div>

      <div className='overflow-y-auto'>
        <div className='flex flex-col justify-center'>
          {filterChats &&
            filterChats.map((chat) => (
              <div
                onClick={() => handleSelect(chat)}
                className={cn(
                  "flex gap-2 items-center py-2 px-2 cursor-pointer",
                  chatId !== chat.chatId && "hover:bg-accent",
                  chatId === chat.chatId ? "bg-[#dbebff]" : "bg-transparent",
                  !chat.isSeen && chat.lastMessage !== "" && chat.chatId !== chatId && "bg-[#5183fe] hover:bg-[#5183fe]"
                )}
                key={chat.chatId}
              >
                <figure className='flex items-center border-2 rounded-full'>
                  <img
                    className='rounded-full w-[50px] h-[50px]'
                    src={chat.type === "group" ? chat.imgUrl || "/group-default.png" : chat.user?.avatar}
                    alt='avatar'
                  />
                </figure>
                <div className='flex flex-col'>
                  <h3 className='flex items-center gap-2 font-medium'>
                    {<Users className={cn(chat.type !== "group" && "hidden", "size-4")} />}{" "}
                    {chat.type === "group" ? chat.groupName : chat.user?.username}
                  </h3>
                  <p className='text-sm truncate max-w-[250px]'>{chat.lastMessage}</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </>
  )
})

export { ChatList }
