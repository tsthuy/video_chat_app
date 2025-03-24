/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable unused-imports/no-unused-vars */
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore"
import { Users, X } from "lucide-react"
import { memo, useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"

import { AddGroupUsers } from "~/components/list/add-group-users"
import { AddUser } from "~/components/list/add-user"
import { Input } from "~/components/ui/input"
import { db } from "~/libs"
import { cn } from "~/libs"
import { useChatStore } from "~/stores"
import { useUserStore } from "~/stores/use-user.store"
import { getErrorMessage } from "~/utils"

const ChatList = memo(() => {
  const currentUser = useUserStore((state) => state.currentUser)
  const changeChat = useChatStore((state) => state.changeChat)
  const [chats, setChats] = useState<ChatWithUser[]>()
  const chatId = useChatStore((state) => state.chatId)
  const [input, setInput] = useState("")
  const chatRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [shouldScrollToSelected, setShouldScrollToSelected] = useState(false)

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

  useEffect(() => {
    if (!currentUser || !chatId || !chats) return

    const updateCurrentChatSeenStatus = async () => {
      const userChats: Omit<ChatWithUser, "user">[] = chats.map((item) => {
        const { user, ...rest } = item
        return rest
      })

      const chatIndex = userChats.findIndex((item) => item.chatId === chatId)
      if (chatIndex !== -1 && !userChats[chatIndex].isSeen) {
        userChats[chatIndex].isSeen = true

        const userChatsRef = doc(db, "userchats", currentUser.id)
        try {
          await updateDoc(userChatsRef, { chats: userChats })
        } catch (error) {
          toast.error(getErrorMessage(error))
        }
      }
    }

    updateCurrentChatSeenStatus()
  }, [chatId, chats, currentUser])

  const filterChats = chats?.filter((c) =>
    c.type === "group"
      ? c.groupName?.toLocaleLowerCase().includes(input.toLocaleLowerCase())
      : c.user?.username.toLocaleLowerCase().includes(input.toLocaleLowerCase())
  )

  useEffect(() => {
    if (shouldScrollToSelected && chatId && chats) {
      const selectedChatElement = chatRefs.current.get(chatId)
      if (selectedChatElement) {
        selectedChatElement.scrollIntoView({ behavior: "smooth", block: "center" })
      }
      setShouldScrollToSelected(false)
    }
  }, [shouldScrollToSelected, chatId, chats])

  const handleSelect = async (chat: ChatWithUser) => {
    if (!currentUser) return

    const userChats: Omit<ChatWithUser, "user">[] = chats!.map((item) => {
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

  const handleClearInput = () => {
    setInput("")
    if (chatId) {
      setShouldScrollToSelected(true)
    }
  }

  return (
    <>
      <div className='py-2 px-2'>
        <div className='flex w-full gap-2'>
          <div className='relative flex-1'>
            <Input
              onChange={(e) => setInput(e.target.value)}
              value={input}
              name='username'
              placeholder='Search...'
              className='pr-10'
            />
            {input && (
              <button
                type='button'
                onClick={handleClearInput}
                className='absolute right-2 top-1/2 transform -translate-y-1/2 p-1'
              >
                <X className='w-4 h-4 text-red-500 hover:text-red-700' />
              </button>
            )}
          </div>

          <AddGroupUsers />
          <AddUser />
        </div>
      </div>

      <div className='overflow-y-auto'>
        <div className='flex flex-col justify-center'>
          {filterChats && filterChats.length === 0 ? (
            <div className='h-[100%] flex justify-center items-center pt-4'>
              <p className='text-center text-gray-500 '>Add users to start messaging!</p>
            </div>
          ) : (
            filterChats?.map((chat) => (
              <div
                ref={(el) => {
                  if (el) {
                    chatRefs.current.set(chat.chatId, el)
                  } else {
                    chatRefs.current.delete(chat.chatId)
                  }
                }}
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
                    className='rounded-full w-[50px] h-[50px] object-contain'
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
            ))
          )}
        </div>
      </div>
    </>
  )
})

export { ChatList }
