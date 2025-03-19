import { create } from "zustand"

import { useUserStore } from "~/stores/use-user.store"

export const useChatStore = create<ChatStore>((set) => ({
  chatId: null,
  user: null,
  group: null,
  isProfileOpen: true,
  isUserChatOpen: true,
  isCurrentUserBlocked: false,
  isReceiverBlocked: false,

  setIsProfileOpen: (isOpen) => set({ isProfileOpen: isOpen }),
  toggleProfile: () => set((state) => ({ isProfileOpen: !state.isProfileOpen })),
  setIsUserChatOpen: (isOpen) => set({ isUserChatOpen: isOpen }),
  toggleUserChat: () => set((state) => ({ isUserChatOpen: !state.isUserChatOpen })),

  changeChat: (chatId: string, user: User | null, group: UserChatItem | null = null) => {
    const currentUser = useUserStore.getState().currentUser
    if (!currentUser) {
      return set({
        chatId: null,
        user: null,
        group: null,
        isCurrentUserBlocked: false,
        isReceiverBlocked: false
      })
    }

    if (group) {
      return set({
        chatId,
        user: null,
        group,
        isCurrentUserBlocked: false,
        isReceiverBlocked: false
      })
    }

    if (!user) {
      return set({
        chatId,
        user: null,
        group: null,
        isCurrentUserBlocked: false,
        isReceiverBlocked: false
      })
    }

    if (user.blocked.includes(currentUser.id)) {
      return set({
        chatId,
        user: null,
        group: null,
        isCurrentUserBlocked: true,
        isReceiverBlocked: false
      })
    } else if (currentUser.blocked.includes(user.id)) {
      return set({
        chatId,
        user,
        group: null,
        isCurrentUserBlocked: false,
        isReceiverBlocked: true
      })
    } else {
      return set({
        chatId,
        user,
        group: null,
        isCurrentUserBlocked: false,
        isReceiverBlocked: false
      })
    }
  },

  changeBlock: () => {
    set((state) => ({
      ...state,
      isReceiverBlocked: !state.isReceiverBlocked
    }))
  },

  resetChat: () => {
    set({
      chatId: null,
      user: null,
      group: null,
      isCurrentUserBlocked: false,
      isReceiverBlocked: false
    })
  }
}))
