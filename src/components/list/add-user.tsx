import { arrayUnion, collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore"
import { UserPlus } from "lucide-react"
import { memo, useEffect, useState } from "react"
import { toast } from "react-toastify"

import { Button } from "~/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog"
import { db } from "~/lib/firebase"
import { User, useUserStore } from "~/stores/use-user.store"
import { getErrorMessage } from "~/utils/get-error-messages.util"

const AddUser = memo(() => {
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [userChats, setUserChats] = useState<UserChatItem[]>([])
  const { currentUser } = useUserStore()

  useEffect(() => {
    const fetchUsersAndChats = async () => {
      try {
        // Lấy tất cả user từ collection "users"
        const usersRef = collection(db, "users")
        const usersSnapshot = await getDocs(usersRef)
        const usersList = usersSnapshot.docs
          .map((doc) => doc.data() as User)
          .filter((user) => user.id !== currentUser?.id)
        setAllUsers(usersList)

        if (currentUser?.id) {
          const userChatsRef = doc(db, "userchats", currentUser.id)
          const userChatsSnapshot = await getDoc(userChatsRef)
          if (userChatsSnapshot.exists()) {
            const userChatsData = userChatsSnapshot.data() as UserChatsData
            setUserChats(userChatsData.chats || [])
          }
        }
      } catch (error) {
        toast.error(getErrorMessage(error))
      }
    }

    fetchUsersAndChats()
  }, [currentUser])

  const hasConversation = (userId: string) => {
    return userChats.some((chat) => chat.receiverId === userId)
  }

  const handleAdd = async (selectedUser: User) => {
    const chatRef = collection(db, "chats")
    const userChatsRef = collection(db, "userchats")

    try {
      const newChatRef = doc(chatRef)
      await setDoc(newChatRef, {
        createdAt: serverTimestamp(),
        messages: []
      })

      await updateDoc(doc(userChatsRef, selectedUser.id), {
        chats: arrayUnion({
          chatId: newChatRef.id,
          lastMessage: "",
          receiverId: currentUser?.id,
          updatedAt: Date.now()
        })
      })

      await updateDoc(doc(userChatsRef, currentUser?.id), {
        chats: arrayUnion({
          chatId: newChatRef.id,
          lastMessage: "",
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

      toast.success(`Added ${selectedUser.username} to chat successfully!!!`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type='button' variant='outline'>
          <UserPlus />
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Add user to Chat</DialogTitle>
        </DialogHeader>

        <div className='max-h-[300px] overflow-y-auto'>
          {allUsers.length === 0 ? (
            <p className='text-center text-gray-500'>No users found</p>
          ) : (
            allUsers.map((user) => (
              <div key={user.id} className='flex items-center justify-between gap-2 p-2 border-b'>
                <div className='flex items-center'>
                  <figure className='flex items-center'>
                    <img className='rounded-full w-[40px] h-[40px]' src={user.avatar} alt='avatar' />
                  </figure>
                  <h3 className='ml-2'>{user.username}</h3>
                </div>

                {!hasConversation(user.id) ? (
                  <Button onClick={() => handleAdd(user)}>Add</Button>
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
