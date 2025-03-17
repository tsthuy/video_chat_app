"use client"
import EmojiPicker from "emoji-picker-react"
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  DocumentSnapshot,
  getDoc,
  onSnapshot,
  Timestamp,
  updateDoc
} from "firebase/firestore"
import { Info, Mic, Paperclip, SmilePlus, Video, X } from "lucide-react"
import { memo, useCallback, useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover"
import { Textarea } from "~/components/ui/textarea"
import { useMembersChatGroup } from "~/hooks/use-user-chats.hook"
import { db } from "~/lib/firebase"
import { useChatStore } from "~/stores/use-chat.store"
import { useUserStore } from "~/stores/use-user.store"
import { getErrorMessage } from "~/utils/get-error-messages.util"
import { renderMessages } from "~/utils/render-messages.util"
import upload from "~/utils/upload.util"

const Chat = memo(() => {
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

    const callsRef = collection(db, "calls")
    const unsubscribe = onSnapshot(callsRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const callData = change.doc.data()
          if (callData.receiverId === currentUser.id && callData.status === "pending") {
            toast.info(`${user.username} đang gọi video cho bạn!`, {
              onClick: () => {
                window.open(`/call?callId=${change.doc.id}&chatId=${chatId}`, "VideoCall", "width=800,height=600")
              },
              autoClose: false
            })
          }
        }
      })
    })

    return () => unsubscribe()
  }, [currentUser, user, group, chatId])

  const startRecording = async () => {
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
      toast.error("Không thể ghi âm: " + getErrorMessage(err))
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      micTriggerRef.current?.click()
    }
  }

  const handleEmoji = (e: { emoji: string }) => {
    setText((prev) => prev + e.emoji)
    setOpen(false)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImg({ file: e.target.files[0], url: URL.createObjectURL(e.target.files[0]) })
      e.target.value = ""
    }
  }

  const handleRemoveFile = () => {
    setImg({ file: null, url: "" })
    setAudioBlob(null)
  }

  const handleSend = useCallback(async () => {
    if (!chatId || !currentUser || (!user && !group) || (!text && !img.file && !audioBlob)) return
    setIsSending(true)
    let imgUrl: string | null = null
    let audioUrl: string | null = null
    let fileUrl: string | null = null

    try {
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

      await updateDoc(doc(db, "chats", chatId), { messages: arrayUnion(message) })
      const memberIds = group ? group.memberIds : [currentUser.id, user!.id]
      await Promise.all(
        memberIds.map(async (id) => {
          const userChatsRef = doc(db, "userchats", id)
          const userChatsSnapshot = await getDoc(userChatsRef)
          if (userChatsSnapshot.exists()) {
            const userChatsData = userChatsSnapshot.data() as { chats: UserChatItem[] }
            const chatIndex = userChatsData.chats.findIndex((c) => c.chatId === chatId)
            if (chatIndex !== -1) {
              userChatsData.chats[chatIndex].lastMessage = text || "Đã gửi một file"
              userChatsData.chats[chatIndex].isSeen = id === currentUser.id
              userChatsData.chats[chatIndex].updatedAt = Date.now()
              await updateDoc(userChatsRef, { chats: userChatsData.chats })
            }
          }
        })
      )

      setText("")
      handleRemoveFile()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsSending(false)
    }
  }, [chatId, currentUser, user, group, text, img, audioBlob])

  const handleVideoCall = async () => {
    if (!chatId || !currentUser || !user || group) {
      toast.error("Chỉ hỗ trợ video call cho chat 1vs1!")
      return
    }

    const callRef = await addDoc(collection(db, "calls"), {
      callerId: currentUser.id,
      receiverId: user.id,
      status: "pending",
      createdAt: Timestamp.now()
    })

    const callWindow = window.open(`/call?callId=${callRef.id}&chatId=${chatId}`, "VideoCall", "width=800,height=600")

    if (!callWindow) {
      toast.error("Vui lòng cho phép popup để thực hiện cuộc gọi!")
      return
    }

    const checkWindowClosed = setInterval(() => {
      if (callWindow.closed) {
        clearInterval(checkWindowClosed)
        updateDoc(doc(db, "calls", callRef.id), { status: "ended" })
      }
    }, 500)
  }

  return (
    <div className='flex flex-col h-full border-l border-gray-200 w-[600px] overflow-hidden'>
      <div className='flex items-center pt-4 justify-between pl-2 border-b pb-2'>
        <div className='flex items-center gap-2'>
          <figure className='flex items-center'>
            <img
              className='rounded-full w-[50px] h-[50px]'
              src={group ? group.imgUrl || "/group-default.png" : user?.avatar}
              alt='avatar'
            />
          </figure>
          <h3>{group ? group.groupName : user?.username}</h3>
        </div>
        <div className='flex'>
          <button
            onClick={handleVideoCall}
            className='cursor-pointer p-2 rounded-lg disabled:opacity-50'
            disabled={isCurrentUserBlocked || isReceiverBlocked || !!group}
            title='Video Call'
          >
            <Video className='size-6 text-black' />
          </button>
          <button className='cursor-pointer p-2 rounded-lg'>
            <Info className='size-6 text-black' />
          </button>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-4 max-w-[600px]'>
        {isLoadingMembers ? <p>Đang tải thông tin thành viên...</p> : renderMessages(chat, currentUser, memberInfo)}
        {(img.url || audioBlob) && (
          <div className='flex justify-end mb-4'>
            <div className='max-w-xs p-3 rounded-lg bg-blue-500 text-white relative'>
              {img.url && (
                <>
                  {img.file?.type.startsWith("image") && (
                    <img src={img.url} alt='preview' className='w-full rounded-lg' />
                  )}
                  {img.file?.type.startsWith("video") && <video src={img.url} controls className='w-full rounded-lg' />}
                  {!["image", "video"].some((t) => img.file?.type.startsWith(t)) && (
                    <a href={img.url} target='_blank' rel='noopener noreferrer' className='text-white underline'>
                      {img.file?.name}
                    </a>
                  )}
                </>
              )}
              {audioBlob && !img.url && (
                <audio src={URL.createObjectURL(audioBlob)} controls className='min-w-[80px]' />
              )}
              <button onClick={handleRemoveFile} className='absolute -top-2 -left-2 p-2 bg-red-500 text-white rounded'>
                <X />
              </button>
            </div>
          </div>
        )}
        <div ref={endRef}></div>
      </div>

      <form
        className='flex items-center gap-2 p-4 border-t border-gray-200 bg-white'
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
      >
        <div className='flex gap-2 relative items-center flex-shrink-0'>
          <label htmlFor='file' className='cursor-pointer'>
            <Paperclip className='size-6 text-black' />
          </label>
          <input
            type='file'
            id='file'
            className='hidden'
            onChange={handleFile}
            accept='image/*,video/*,application/pdf,application/msword,application/vnd.ms-excel'
          />
          <div className='relative flex items-center'>
            <Popover>
              <PopoverTrigger asChild>
                <button type='button' ref={micTriggerRef} className='p-1'>
                  <Mic className='size-6 text-black' />
                </button>
              </PopoverTrigger>
              <PopoverContent className='p-4 flex items-center justify-center'>
                {isRecording ? (
                  <div className='flex gap-2 items-center'>
                    <p className='text-sm'>
                      {Math.floor(recordTime / 60)}:{(recordTime % 60).toString().padStart(2, "0")}
                    </p>
                    <button
                      type='button'
                      onClick={stopRecording}
                      className='px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600'
                    >
                      Dừng
                    </button>
                  </div>
                ) : audioBlob ? (
                  <div className='flex gap-2 items-center'>
                    <button
                      type='button'
                      onClick={handleSend}
                      className='px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600'
                    >
                      Gửi
                    </button>
                    <button
                      type='button'
                      onClick={handleRemoveFile}
                      className='px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600'
                    >
                      Xóa
                    </button>
                  </div>
                ) : (
                  <button
                    type='button'
                    onClick={startRecording}
                    className='px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 w-full'
                  >
                    Start
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className='flex-1 items-center min-w-0'>
          <Textarea
            rows={1}
            placeholder={isCurrentUserBlocked || isReceiverBlocked ? "You cannot send a message" : "Type a message..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isCurrentUserBlocked || isReceiverBlocked}
            className='w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 resize-vertical min-h-[40px] max-h-[120px]'
            style={{ minWidth: "200px", maxWidth: "100%" }}
          />
        </div>
        <div className='flex gap-2 items-center flex-shrink-0'>
          <div className='relative'>
            <SmilePlus onClick={() => setOpen((prev) => !prev)} className='size-6 text-black cursor-pointer' />
            <div className='absolute bottom-12 right-0'>
              <EmojiPicker open={open} onEmojiClick={handleEmoji} />
            </div>
          </div>
          <button
            type='submit'
            className='px-4 py-2 bg-blue-500 hover:opacity-80 cursor-pointer text-white rounded-lg disabled:bg-gray-400'
            disabled={isCurrentUserBlocked || isReceiverBlocked || isSending}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
})

export { Chat }
