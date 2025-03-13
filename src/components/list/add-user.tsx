import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore"
import { Search, UserPlus } from "lucide-react"
import { memo, useState } from "react"
import { toast } from "react-toastify"

import { Button } from "~/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { db } from "~/lib/firebase"
import { useUserStore } from "~/stores/use-user.store"
import { User } from "~/stores/use-user.store"
import { getErrorMessage } from "~/utils/get-error-messages.util"

const AddUser = memo(() => {
  const [user, setUser] = useState<User | null>(null)
  const { currentUser } = useUserStore()

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const username = formData.get("username")

    try {
      const userRef = collection(db, "users")

      const q = query(userRef, where("username", "==", username))

      const querySnapShot = await getDocs(q)

      if (!querySnapShot.empty) {
        const foundUser = querySnapShot.docs[0].data() as User
        if (foundUser.id === currentUser?.id) {
          setUser(null)
          toast.info("User not found!!!")
        } else {
          setUser(foundUser)
        }
      } else {
        setUser(null)
        toast.info("User not found!!!")
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleAdd = async () => {
    const chatRef = collection(db, "chats")
    const userChatsRef = collection(db, "userchats")

    try {
      const newChatRef = doc(chatRef)

      await setDoc(newChatRef, {
        createdAt: serverTimestamp(),
        messages: []
      })

      await updateDoc(doc(userChatsRef, user?.id), {
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
          receiverId: user?.id,
          updatedAt: Date.now()
        })
      })

      toast.success("Added to chat successfully!!!")
      setUser(null)
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

        <form className='flex w-full gap-2' onSubmit={handleSearch}>
          <Input name='username' className='' placeholder='Search...' />
          <Button type='submit' variant='outline'>
            <Search />
          </Button>
        </form>
        {user && (
          <div className='flex items-center justify-between gap-2'>
            <div className='flex items-center'>
              <figure className='flex items-center'>
                <img className='rounded-full w-[50px] h-[50px]' src={user?.avatar} alt='avatar' />
              </figure>
              <h3>{user.username}</h3>
            </div>

            <Button onClick={handleAdd}>Add User</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
})

export { AddUser }
