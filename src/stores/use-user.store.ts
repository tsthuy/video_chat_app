import { doc, getDoc } from "firebase/firestore"
import { toast } from "react-toastify"
import { create } from "zustand"

import { db } from "~/lib/firebase"
import { getErrorMessage } from "~/utils/get-error-messages.util"

export interface User {
  username: string
  email: string
  avatar: string
  id: string
  blocked: string[]
}

interface UserStore {
  currentUser: User | null
  isLoading: boolean
  fetchUserInfo: (uid: string | undefined) => Promise<void>
}

export const useUserStore = create<UserStore>((set) => ({
  currentUser: null,
  isLoading: true,
  fetchUserInfo: async (uid: string | undefined) => {
    if (!uid) {
      set({ currentUser: null, isLoading: false })
      return
    }

    try {
      set({ isLoading: true })
      const docRef = doc(db, "users", uid)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        set({ currentUser: docSnap.data() as User, isLoading: false })
      } else {
        set({ currentUser: null, isLoading: false })
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
      set({ currentUser: null, isLoading: false })
    }
  }
}))
