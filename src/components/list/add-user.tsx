import { arrayUnion, collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore"
import { UserPlus } from "lucide-react"
import { memo, useEffect, useState } from "react"
import { toast } from "react-toastify"

import { Loader8 } from "~/components/loader/loader8"
import { Button } from "~/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog"
import { db } from "~/libs"
import { useChatStore } from "~/stores"
import { useUserStore } from "~/stores/use-user.store"
import { getErrorMessage } from "~/utils"

const AddUser = memo(() => {
  const currentUser = useUserStore((state) => state.currentUser)
  const changeChat = useChatStore((state) => state.changeChat)

  const [selectUser, setSelectUser] = useState<User>()
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [userChats, setUserChats] = useState<UserChatItem[]>([])
  const [isAdding, setIsAdding] = useState(false)

  const [openDialog, setOpenDialog] = useState(false)

  useEffect(() => {
    if (!currentUser?.id) return

    const usersRef = collection(db, "users")
    const unsubscribeUsers = onSnapshot(
      usersRef,
      (snapshot) => {
        try {
          const usersList = snapshot.docs.map((doc) => doc.data() as User).filter((user) => user.id !== currentUser.id)
          setAllUsers(usersList)
        } catch (error) {
          toast.error(getErrorMessage(error))
        }
      },
      (error) => {
        toast.error(getErrorMessage(error))
      }
    )

    const userChatsRef = doc(db, "userchats", currentUser.id)
    const unsubscribeUserChats = onSnapshot(
      userChatsRef,
      (snapshot) => {
        try {
          if (snapshot.exists()) {
            const userChatsData = snapshot.data() as UserChatsData
            setUserChats(userChatsData.chats || [])
          } else {
            setUserChats([])
          }
        } catch (error) {
          toast.error(getErrorMessage(error))
        }
      },
      (error) => {
        toast.error(getErrorMessage(error))
      }
    )

    return () => {
      unsubscribeUsers()
      unsubscribeUserChats()
    }
  }, [currentUser])

  const hasConversation = (userId: string) => {
    return userChats.some((chat) => chat.receiverId === userId)
  }

  const handleAdd = async (selectedUser: User) => {
    setSelectUser(selectedUser)
    setIsAdding(true)

    const chatRef = collection(db, "chats")
    const userChatsRef = collection(db, "userchats")

    try {
      const newChatRef = doc(chatRef)
      await setDoc(newChatRef, {
        createdAt: serverTimestamp()
      })

      await updateDoc(doc(userChatsRef, selectedUser.id), {
        chats: arrayUnion({
          chatId: newChatRef.id,
          lastMessage: "Let's say hello to start the chat",
          receiverId: currentUser?.id,
          updatedAt: Date.now()
        })
      })

      await updateDoc(doc(userChatsRef, currentUser?.id), {
        chats: arrayUnion({
          chatId: newChatRef.id,
          lastMessage: "Let's say hello to start the chat",
          receiverId: selectedUser.id,
          updatedAt: Date.now()
        })
      })

      setUserChats((prev) => [
        ...prev,
        {
          chatId: newChatRef.id,
          lastMessage: "",
          receiverId: selectedUser.id,
          updatedAt: Date.now()
        }
      ])

      changeChat(newChatRef.id, selectedUser)
      setOpenDialog(false)
      toast.success(`Added ${selectedUser.username} to chat successfully!!!`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
      <DialogTrigger asChild>
        <Button type='button' variant='outline'>
          <UserPlus className='size-6' />
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px] max-w-[380px]'>
        <DialogHeader>
          <DialogTitle className='text-center'>Add user to Chat </DialogTitle>
        </DialogHeader>

        <div className='max-h-[300px] overflow-y-auto'>
          {allUsers.length === 0 ? (
            <p className='text-center text-gray-500'>No users found</p>
          ) : (
            allUsers.map((user) => (
              <div key={user.id} className='flex items-center justify-between gap-2 p-2 border-b'>
                <div className='flex items-center'>
                  <figure className='flex items-center'>
                    <img className='rounded-full w-[40px] h-[40px] object-contain' src={user.avatar} alt='avatar' />
                  </figure>
                  <h3 className='ml-2'>{user.username}</h3>
                </div>

                {!hasConversation(user.id) ? (
                  <Button disabled={isAdding} onClick={() => handleAdd(user)}>
                    {isAdding && selectUser?.id === user.id && <Loader8 />}
                    Add
                  </Button>
                ) : (
                  <span className='text-gray-500'>Added</span>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
})

export { AddUser }
