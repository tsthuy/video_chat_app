import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, Timestamp, updateDoc } from "firebase/firestore"
import { Upload, Users, X } from "lucide-react"
import { memo, useEffect, useState } from "react"
import { toast } from "react-toastify"

import { AddUser } from "~/components/list/add-user"
import { Button } from "~/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { db } from "~/lib/firebase"
import { cn } from "~/lib/utils"
import { useChatStore } from "~/stores/use-chat.store"
import { useUserStore } from "~/stores/use-user.store"
import { getErrorMessage } from "~/utils/get-error-messages.util"
import upload from "~/utils/upload.util"

const ChatList = memo(() => {
  const currentUser = useUserStore((state) => state.currentUser)
  const changeChat = useChatStore((state) => state.changeChat)
  const [chats, setChats] = useState<ChatWithUser[]>()
  const chatId = useChatStore((state) => state.chatId)
  const [input, setInput] = useState("")
  const [openDialog, setOpenDialog] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [groupImg, setGroupImg] = useState<ImgState>({ file: null, url: "" })
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

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
    const fetchUsers = async () => {
      const usersRef = collection(db, "users")
      const usersData = (await getDocs(usersRef)).docs
        .map((doc) => doc.data() as User)
        .filter((u) => u.id !== currentUser!.id)
      setAllUsers(usersData)
    }
    fetchUsers()
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

  const handleCreateGroup = async () => {
    if (!groupName || selectedMembers.length === 0) {
      toast.error("Please enter name and select member for your group!")
      return
    }

    try {
      const chatRef = await addDoc(collection(db, "chats"), {
        createdAt: Timestamp.now(),
        messages: []
      })

      const groupImgUrl = groupImg.file ? await upload(groupImg.file) : null
      const groupChatItem: UserChatItem = {
        chatId: chatRef.id,
        lastMessage: "",
        receiverId: "",
        updatedAt: Date.now(),
        isSeen: true,
        type: "group",
        groupName,
        memberIds: [currentUser!.id, ...selectedMembers],
        imgUrl: groupImgUrl || undefined
      }

      await Promise.all(
        [currentUser!.id, ...selectedMembers].map(async (id) => {
          const userChatsRef = doc(db, "userchats", id)
          const userChatsSnap = await getDoc(userChatsRef)
          const userChatsData = userChatsSnap.exists() ? userChatsSnap.data().chats : []
          await updateDoc(userChatsRef, {
            chats: [...userChatsData, groupChatItem]
          })
        })
      )

      setGroupName("")
      setGroupImg({ file: null, url: "" })
      setSelectedMembers([])
      setOpenDialog(false)
      toast.success("Tạo nhóm thành công!")
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleSelectMember = (userId: string) => {
    setSelectedMembers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const handleGroupImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setGroupImg({ file: e.target.files[0], url: URL.createObjectURL(e.target.files[0]) })
    }
  }

  return (
    <>
      <div className='pt-2 px-2'>
        <div className='flex w-full gap-2'>
          <Input onChange={(e) => setInput(e.target.value)} name='username' placeholder='Search...' />

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button type='button' variant='outline'>
                <Users />
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-[425px] max-w-[380px]'>
              <DialogHeader>
                <DialogTitle>Create Group Chat</DialogTitle>
              </DialogHeader>
              <div className='grid gap-4 py-4'>
                <Input placeholder='Group Name' value={groupName} onChange={(e) => setGroupName(e.target.value)} />
                <div className='flex items-center gap-2 justify-center'>
                  <label htmlFor='groupImg' className='cursor-pointer' title='Upload Your Group Image'>
                    {!groupImg.url && <Upload className='size-6' />}
                  </label>
                  <input type='file' id='groupImg' className='hidden' accept='image/*' onChange={handleGroupImg} />

                  {groupImg.url && (
                    <div className='relative'>
                      <img src={groupImg.url} alt='group preview' className='w-14 h-14 rounded-full' />
                      <button
                        onClick={() => setGroupImg({ file: null, url: "" })}
                        className='absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1'
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div className='max-h-60 overflow-y-auto'>
                  {allUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleSelectMember(u.id)}
                      className={cn(
                        "flex items-center gap-2 p-2 cursor-pointer",
                        selectedMembers.includes(u.id) ? "bg-blue-100" : "hover:bg-gray-100"
                      )}
                    >
                      <img src={u.avatar} alt={u.username} className='w-8 h-8 rounded-full' />
                      <span>{u.username}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={handleCreateGroup}>Tạo nhóm</Button>
              </div>
            </DialogContent>
          </Dialog>

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
              key={chat.chatId}
            >
              <figure className='flex items-center'>
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
    </>
  )
})

export { ChatList }
