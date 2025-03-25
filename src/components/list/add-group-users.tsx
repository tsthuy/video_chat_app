import { addDoc, collection, doc, getDoc, getDocs, Timestamp, updateDoc } from "firebase/firestore"
import { Upload, Users, X } from "lucide-react"
import { memo, useEffect, useState } from "react"
import { toast } from "react-toastify"

import { Loader8 } from "~/components/loader/loader8"
import { Button } from "~/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { db } from "~/libs"
import { cn } from "~/libs"
import { useChatStore, useUserStore } from "~/stores"
import { getErrorMessage, upload } from "~/utils"

const AddGroupUsers = memo(() => {
  const currentUser = useUserStore((state) => state.currentUser)

  const changeChat = useChatStore((state) => state.changeChat)

  const [groupName, setGroupName] = useState("")
  const [groupImg, setGroupImg] = useState<ImgState>({ file: null, url: "" })
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [isAdding, setIsAdding] = useState(false)

  const [allUsers, setAllUsers] = useState<User[]>([])

  const [openDialog, setOpenDialog] = useState(false)

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

  const handleCreateGroup = async () => {
    if (!groupName || selectedMembers.length < 3) {
      toast.error("Please enter name and select at least 3 members for your group!")
      return
    }

    setIsAdding(true)

    try {
      const chatRef = await addDoc(collection(db, "chats"), {
        createdAt: Timestamp.now()
      })

      const groupImgUrl = groupImg.file ? await upload(groupImg.file) : null
      const groupChatItem: UserChatItem = {
        chatId: chatRef.id,
        lastMessage: "Let's say hello to start the chat",
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

      changeChat(chatRef.id, null, groupChatItem)
      setGroupName("")
      setGroupImg({ file: null, url: "" })
      setSelectedMembers([])
      setOpenDialog(false)
      toast.success("Group created successfully!!!")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsAdding(false)
    }
  }

  const handleSelectMember = (userId: string) => {
    if (isAdding) return
    setSelectedMembers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const handleGroupImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setGroupImg({ file: e.target.files[0], url: URL.createObjectURL(e.target.files[0]) })
    }
  }

  return (
    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
      <DialogTrigger asChild>
        <Button type='button' variant='outline'>
          <Users className='size-6' />
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px] max-w-[380px]'>
        <DialogHeader>
          <DialogTitle className='text-center'>Create Group Chat</DialogTitle>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <Input placeholder='Group Name' value={groupName} onChange={(e) => setGroupName(e.target.value)} />
          <div className='flex items-center gap-2 justify-center'>
            <label htmlFor='groupImg' className='cursor-pointer ' title='Upload Your Group Image'>
              {!groupImg.url && <Upload className='size-6 hover:text-blue-800' />}
            </label>
            <input type='file' id='groupImg' className='hidden' accept='image/*' onChange={handleGroupImg} />

            {groupImg.url && (
              <div className='relative'>
                <img
                  src={groupImg.url}
                  alt='group preview '
                  className='w-14 h-14 rounded-full border-black border object-contain'
                />
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
                  selectedMembers.includes(u.id) ? "bg-blue-100" : "hover:bg-gray-100",
                  isAdding && "cursor-not-allowed pointer-events-none"
                )}
              >
                <img src={u.avatar} alt={u.username} className='w-8 h-8 rounded-full object-contain' />
                <span>{u.username}</span>
              </div>
            ))}
          </div>
          <Button disabled={isAdding} onClick={handleCreateGroup}>
            {isAdding && <Loader8 />}
            Create Group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
})

export { AddGroupUsers }
