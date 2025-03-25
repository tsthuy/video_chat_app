/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"

import { useMembersChatGroup } from "~/hooks"
import { db } from "~/libs"
import { useChatStore } from "~/stores"
import { useUserStore } from "~/stores"
import { UserChatsResult } from "~/types/chat-custom"
import { getErrorMessage } from "~/utils"
import { upload } from "~/utils"

const ChatContainer = ({ onSend, onVideoCall }: { onSend: (message: Message) => void; onVideoCall: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isSending, setIsSending] = useState<boolean>(false)
  const [open, setOpen] = useState<boolean>(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false)
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true)
  const [lastVisibleMessage, setLastVisibleMessage] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true)
  const [shouldAutoScroll, setShouldAutoScroll] = useState<boolean>(true)

  const textareaWrapperRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const [text, setText] = useState<string>("")
  const [img, setImg] = useState<ImgState>({ file: null, url: "" })
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [recordTime, setRecordTime] = useState(0)

  const { currentUser } = useUserStore()
  const { chatId, user, group, isCurrentUserBlocked, isReceiverBlocked, toggleProfile, toggleUserChat, resetChat } =
    useChatStore()
  const { data: memberInfo = {}, isLoading: isLoadingMembers } = useMembersChatGroup(chatId)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const toastIdRef = useRef<string | number | null>(null)

  const isDisabled = isSending || isRecording || isLoadingMembers

  const handleRemoveFile = useCallback(() => {
    setImg({ file: null, url: "" })
    setAudioBlob(null)
  }, [])

  useEffect(() => {
    if (!chatId) return

    setIsLoadingMessages(true)
    setShouldAutoScroll(true)
    setIsInitialLoad(true)
    const messagesRef = collection(db, "chats", chatId, "messages")

    const q = query(messagesRef, orderBy("createdAt", "desc"), limit(50))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messageList = snapshot.docs.map((doc) => doc.data() as Message)
        setMessages(messageList.reverse())
        setLastVisibleMessage(snapshot.docs[snapshot.docs.length - 1])
        setHasMoreMessages(snapshot.docs.length === 50)
        setIsLoadingMessages(false)
        setIsInitialLoad(false)
      },
      (error) => {
        toast.error(getErrorMessage(error))
        setError("Some things went wrong, please try again!")
        setIsLoadingMessages(false)
        setIsInitialLoad(false)
      }
    )

    return () => unsubscribe()
  }, [chatId])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
      setShouldAutoScroll(isNearBottom)

      if (!isInitialLoad && container.scrollTop < 100 && hasMoreMessages && !isLoadingMessages) {
        fetchMoreMessages()
      }
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [hasMoreMessages, isLoadingMessages, isInitialLoad])

  const fetchMoreMessages = async () => {
    if (!chatId || !lastVisibleMessage) return

    const container = messagesContainerRef.current
    if (!container) return

    const scrollTopBefore = container.scrollTop
    const scrollHeightBefore = container.scrollHeight

    setIsLoadingMessages(true)
    const messagesRef = collection(db, "chats", chatId, "messages")
    const q = query(messagesRef, orderBy("createdAt", "desc"), startAfter(lastVisibleMessage), limit(50))

    try {
      const snapshot = await getDocs(q)
      const moreMessages = snapshot.docs.map((doc) => doc.data() as Message)
      setMessages((prev) => [...moreMessages.reverse(), ...prev])
      setLastVisibleMessage(snapshot.docs[snapshot.docs.length - 1])
      setHasMoreMessages(snapshot.docs.length === 50)

      if (container) {
        const scrollHeightAfter = container.scrollHeight
        const scrollDifference = scrollHeightAfter - scrollHeightBefore

        if (scrollTopBefore < 50) {
          container.scrollTop = scrollTopBefore
        } else {
          container.scrollTop = scrollTopBefore + scrollDifference
        }
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsLoadingMessages(false)
    }
  }

  useEffect(() => {
    const container = messagesContainerRef.current
    if (container && shouldAutoScroll) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages, shouldAutoScroll])

  useEffect(() => {
    if (!chatId) return

    if (textareaWrapperRef.current) {
      const textarea = textareaWrapperRef.current.querySelector("textarea") as HTMLTextAreaElement
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(text.length, text.length)
      }
    }
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
            toastIdRef.current = toast.info(`${user.username} is calling for you!`, {
              onClick: () => {
                window.open(
                  `/call?callId=${change.doc.id}&chatId=${chatId}&callerId=${callData.callerId}&receiverId=${callData.receiverId}`,
                  "VideoCall",
                  "width=800,height=600"
                )
              },
              autoClose: false
            })
          }
        } else if (change.type === "modified") {
          const callData = change.doc.data()

          if (callData.status === "ended" && toastIdRef.current) {
            toast.dismiss(toastIdRef.current)
            toastIdRef.current = null
          }
        }
      })
    })

    return () => unsubscribe()
  }, [currentUser, user, group, chatId])

  useEffect(() => {
    if (img.file || audioBlob) {
      setShouldAutoScroll(true)
    }
  }, [img.file, audioBlob])

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
      return
    }
  }, [])

  const handleEmoji = useCallback((e: { emoji: string }) => {
    setText((prev) => prev + e.emoji)
  }, [])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImg({ file: e.target.files[0], url: URL.createObjectURL(e.target.files[0]) })
      e.target.value = ""
    }
  }, [])

  const handleSend = useCallback(async () => {
    if (!chatId || !currentUser || (!user && !group) || (!text && !img.file && !audioBlob)) return
    setIsSending(true)
    setShouldAutoScroll(true)

    setText("")

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
        createdAt: serverTimestamp(),
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

      handleRemoveFile()

      const messagesRef = collection(db, "chats", chatId, "messages")
      addDoc(messagesRef, message)

      const memberIds = group ? group.memberIds : [currentUser.id, user!.id]
      const batch = writeBatch(db)

      const userChatsDataPromises = memberIds!.map(async (id: string): Promise<UserChatsResult | null> => {
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

      batch.commit()
      onSend(message)
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

      const callWindow = window.open(
        `/call?callId=${callRef.id}&chatId=${chatId}&callerId=${currentUser.id}&receiverId=${user.id}`,
        "VideoCall",
        "width=800,height=600"
      )

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!isDisabled) {
        handleSend()
      }
    }
  }

  const handleToggleUserChat = () => {
    toggleUserChat()
    resetChat()
  }

  return {
    messages,
    isSending,
    text,
    setText,
    img,
    isRecording,
    audioBlob,
    recordTime,
    isLoadingMembers,
    memberInfo,
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
    user,
    handleKeyDown,
    toggleProfile,
    handleToggleUserChat,
    textareaWrapperRef,
    messagesContainerRef,
    isLoadingMessages,
    error
  }
}

export default ChatContainer
