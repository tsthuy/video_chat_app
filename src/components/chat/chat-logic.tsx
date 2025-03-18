// ChatContainer.tsx
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  DocumentSnapshot,
  getDoc,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"

import { useMembersChatGroup } from "~/hooks/use-user-chats.hook"
import { db } from "~/lib/firebase"
import { useChatStore } from "~/stores/use-chat.store"
import { useUserStore } from "~/stores/use-user.store"
import { UserChatsResult } from "~/types/chat-custom"
import { getErrorMessage } from "~/utils/get-error-messages.util"
import upload from "~/utils/upload.util"

const ChatContainer = ({ onSend, onVideoCall }: { onSend: (message: Message) => void; onVideoCall: () => void }) => {
  const [chat, setChat] = useState<ChatData | undefined>(undefined)
  const [isSending, setIsSending] = useState<boolean>(false)
  const [open, setOpen] = useState<boolean>(false)

  const [text, setText] = useState<string>("")
  const [img, setImg] = useState<ImgState>({ file: null, url: "" })
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [recordTime, setRecordTime] = useState(0)

  const { currentUser } = useUserStore()
  const { chatId, user, group, isCurrentUserBlocked, isReceiverBlocked } = useChatStore()
  const { data: memberInfo = {}, isLoading: isLoadingMembers } = useMembersChatGroup(chatId)

  const endRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const micTriggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chat?.messages])

  useEffect(() => {
    if (!chatId) return

    const unSub = onSnapshot(doc(db, "chats", chatId), (res: DocumentSnapshot) => {
      setChat(res.data() as ChatData)
    })

    return () => unSub()
  }, [chatId])

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordTime((prev) => prev + 1), 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  useEffect(() => {
    if (!currentUser || !user || group) return

    const q = query(collection(db, "calls"), where("receiverId", "==", currentUser.id))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const callData = change.doc.data()
          if (callData.receiverId === currentUser.id && callData.status === "pending") {
            toast.info(`${user.username} is calling for you!`, {
              onClick: () => {
                window.open(`/call?callId=${change.doc.id}&chatId=${chatId}`, "VideoCall", "width=800,height=600")
              },
              autoClose: 30000,
              pauseOnHover: false
            })
          }
        }
      })
    })

    return () => unsubscribe()
  }, [currentUser, user, group, chatId])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)

      const chunks: BlobPart[] = []

      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data)

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" })
        setAudioBlob(blob)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordTime(0)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      micTriggerRef.current?.click()
    }
  }, [])

  const handleEmoji = useCallback((e: { emoji: string }) => {
    setText((prev) => prev + e.emoji)
    setOpen(false)
  }, [])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImg({ file: e.target.files[0], url: URL.createObjectURL(e.target.files[0]) })
      e.target.value = ""
    }
  }, [])

  const handleRemoveFile = useCallback(() => {
    setImg({ file: null, url: "" })
    setAudioBlob(null)
  }, [])

  const handleSend = useCallback(async () => {
    if (!chatId || !currentUser || (!user && !group) || (!text && !img.file && !audioBlob)) return
    setIsSending(true)

    try {
      let imgUrl: string | null = null
      let audioUrl: string | null = null
      let fileUrl: string | null = null

      if (img.file) {
        const fileType = img.file.type.split("/")[0]
        const url = await upload(img.file)

        if (fileType === "image") imgUrl = url
        else if (fileType === "video") imgUrl = url
        else fileUrl = url
      }
      if (audioBlob) {
        audioUrl = await upload(new File([audioBlob], "audio.webm", { type: "audio/webm" }))
      }

      const message: Message = {
        chatId,
        senderId: currentUser.id,
        createdAt: Timestamp.now(),
        type: audioUrl
          ? "audio"
          : imgUrl && img.file?.type.startsWith("image")
            ? "image"
            : imgUrl
              ? "video"
              : fileUrl
                ? "file"
                : "text",
        ...(text && { text }),
        ...(imgUrl && { img: imgUrl }),
        ...(audioUrl && { audio: audioUrl }),
        ...(fileUrl && { file: fileUrl })
      }

      const batch = writeBatch(db)
      const chatRef = doc(db, "chats", chatId)
      batch.update(chatRef, { messages: arrayUnion(message) })

      const memberIds = group ? group.memberIds : [currentUser.id, user!.id]

      const userChatsDataPromises = memberIds.map(async (id: string): Promise<UserChatsResult | null> => {
        const userChatsRef = doc(db, "userchats", id)
        const userChatsSnapshot = await getDoc(userChatsRef)
        if (userChatsSnapshot.exists()) {
          return { id, ref: userChatsRef, data: userChatsSnapshot.data() as { chats: UserChatItem[] } }
        }
        return null
      })

      const userChatsResults = (await Promise.all(userChatsDataPromises)).filter(
        (result): result is UserChatsResult => result !== null
      )

      userChatsResults.forEach(({ id, ref, data }: UserChatsResult) => {
        const chatIndex = data.chats.findIndex((c) => c.chatId === chatId)
        if (chatIndex !== -1) {
          data.chats[chatIndex].lastMessage = text || "Đã gửi một file"
          data.chats[chatIndex].isSeen = id === currentUser.id
          data.chats[chatIndex].updatedAt = Date.now()
          batch.update(ref, { chats: data.chats })
        }
      })

      await batch.commit()
      onSend(message)
      setText("")
      handleRemoveFile()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsSending(false)
    }
  }, [chatId, currentUser, user, group, text, img, audioBlob, onSend, handleRemoveFile])

  const handleVideoCall = useCallback(async () => {
    if (!chatId || !currentUser || !user || group) {
      toast.error("Only support for single chat!")
      return
    }

    try {
      const callRef = await addDoc(collection(db, "calls"), {
        callerId: currentUser.id,
        receiverId: user.id,
        status: "pending",
        createdAt: Timestamp.now()
      })

      const callWindow = window.open(`/call?callId=${callRef.id}&chatId=${chatId}`, "VideoCall", "width=800,height=600")

      if (!callWindow) {
        toast.error("Please allow popup to start the call")
        return
      }

      const checkWindowClosed = setInterval(() => {
        if (callWindow.closed) {
          clearInterval(checkWindowClosed)
          updateDoc(doc(db, "calls", callRef.id), { status: "ended" })
        }
      }, 500)

      onVideoCall()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [chatId, currentUser, user, group, onVideoCall])

  return {
    chat,
    isSending,
    text,
    img,
    isRecording,
    audioBlob,
    recordTime,
    isLoadingMembers,
    memberInfo,
    endRef,
    micTriggerRef,
    handleEmoji,
    handleFile,
    handleRemoveFile,
    handleSend,
    handleVideoCall,
    startRecording,
    stopRecording,
    currentUser,
    group,
    open,
    setOpen,
    isCurrentUserBlocked,
    isReceiverBlocked,
    setText,
    user
  }
}

export default ChatContainer
