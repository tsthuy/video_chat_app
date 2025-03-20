import { X } from "lucide-react"
import { memo } from "react"

import { Profile } from "~/components/profile/profile"
import { useChatStore } from "~/stores"

const ProfilePanel = memo(() => {
  const isProfileOpen = useChatStore((state) => state.isProfileOpen)
  const setIsProfileOpen = useChatStore((state) => state.setIsProfileOpen)

  return (
    <>
      {isProfileOpen && <div className='fixed inset-0 bg-black opacity-20' onClick={() => setIsProfileOpen(false)} />}

      <div
        className={`fixed top-0 right-0 h-full bg-white w-[344px] max-w-[344px] shadow-lg transition-transform duration-300 ease-in-out ${
          isProfileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className='absolute top-0 right-2 p-2'>
          <button onClick={() => useChatStore.getState().setIsProfileOpen(false)} className='text-black'>
            <X />
          </button>
        </div>
        <Profile />
      </div>
    </>
  )
})

export { ProfilePanel }
