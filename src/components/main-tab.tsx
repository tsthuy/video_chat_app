import { signOut } from "firebase/auth"
import { LogOut, MessageSquareText } from "lucide-react"
import { memo } from "react"
import { toast } from "react-toastify"

import { auth } from "~/lib/firebase"
import { useChatStore } from "~/stores"
import { useUserStore } from "~/stores/use-user.store"
import { getErrorMessage } from "~/utils"

const MainTab = memo(() => {
  const currentUser = useUserStore((state) => state.currentUser)
  const resetChat = useChatStore((state) => state.resetChat)

  const handleLogout = async () => {
    try {
      await signOut(auth)

      resetChat()
      toast.success("Logout Successfully!!!")
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <div className='sm:min-w-[68px] border bg-blue-600 sm:px-0 px-1 h-svh flex flex-col justify-between '>
      <div className=''>
        <figure className='flex justify-center items-center mt-4'>
          <img
            className='rounded-full w-[50px] h-[50px]'
            src={currentUser?.avatar || "/images/person.png"}
            alt='avatar'
          />
        </figure>

        <div className='flex flex-col justify-center items-center space-y-4 pt-4'>
          <button className='cursor-pointer p-2 border rounded-lg bg-accent'>
            <MessageSquareText className='size-6 text-black ' />
          </button>
        </div>
      </div>

      <div className='flex justify-center items-center pb-4'>
        <button
          onClick={handleLogout}
          className='cursor-pointer p-2 border rounded-lg bg-accent hover:bg-red-500 hover:[&>svg]:text-white'
        >
          <LogOut className='size-6 text-black ' />
        </button>
      </div>
    </div>
  )
})
export { MainTab }
