import "firebase/firestore"

import EmojiPicker from "emoji-picker-react"
import { arrayUnion, doc, DocumentSnapshot, getDoc, onSnapshot, Timestamp, updateDoc } from "firebase/firestore"
import { Camera, Image, Info, Mic, Phone, SmilePlus, Video, X } from "lucide-react"
import { memo, useEffect, useRef, useState } from "react"

import { Input } from "~/components/ui/input"
import { db } from "~/lib/firebase"
import { useChatStore } from "~/stores/use-chat.store"
import { useUserStore } from "~/stores/use-user.store"
import { formatTime } from "~/utils/format-time.util"
import upload from "~/utils/upload.util"

const Chat = memo(() => {
  const [chat, setChat] = useState<ChatData | undefined>(undefined)
  const [isSending, setIsSending] = useState<boolean>(false)
  const [open, setOpen] = useState<boolean>(false)
  const [text, setText] = useState<string>("")
  const [img, setImg] = useState<ImgState>({
    file: null,
    url: ""
  })

  const { currentUser } = useUserStore()
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked } = useChatStore()

  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chat?.messages])

  useEffect(() => {
    if (!chatId) return

    const unSub = onSnapshot(doc(db, "chats", chatId), (res: DocumentSnapshot) => {
      setChat(res.data() as ChatData)
    })

    return () => {
      unSub()
    }
  }, [chatId])

  const handleEmoji = (e: { emoji: string }) => {
    setText((prev) => prev + e.emoji)
    setOpen(false)
  }

  const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImg({
        file: e.target.files[0],
        url: URL.createObjectURL(e.target.files[0])
      })
    }
  }

  const handleRemoveImage = () => {
    setImg({
      file: null,
      url: ""
    })
  }

  const handleSend = async () => {
    if ((text === "" && !img.file) || !chatId || !currentUser || !user) return

    setIsSending(true)

    let imgUrl: string | null = null
    setText("")
    handleRemoveImage()

    try {
      if (img.file) {
        imgUrl = await upload(img.file)
      }

      await updateDoc(doc(db, "chats", chatId), {
        messages: arrayUnion({
          senderId: currentUser.id,
          text,
          createdAt: Timestamp.now(),
          ...(imgUrl && { img: imgUrl })
        })
      })

      const userIDs = [currentUser.id, user.id]

      await Promise.all(
        userIDs.map(async (id) => {
          const userChatsRef = doc(db, "userchats", id)
          const userChatsSnapshot = await getDoc(userChatsRef)

          if (userChatsSnapshot.exists()) {
            const userChatsData = userChatsSnapshot.data() as { chats: Omit<ChatWithUser, "user">[] }

            const chatIndex = userChatsData.chats.findIndex((c) => c.chatId === chatId)

            if (chatIndex !== -1) {
              userChatsData.chats[chatIndex].lastMessage = text
              userChatsData.chats[chatIndex].isSeen = id === currentUser.id
              userChatsData.chats[chatIndex].updatedAt = Date.now()

              await updateDoc(userChatsRef, {
                chats: userChatsData.chats
              })
            }
          }
        })
      )
    } catch (err) {
      console.error("Error sending message:", err)
    } finally {
      setIsSending(false)
    }
  }

  const renderMessages = () => {
    if (!chat?.messages) return null

    const groupedMessages: JSX.Element[] = []

    chat.messages.forEach((message, index) => {
      const isLastInGroup =
        index === chat.messages.length - 1 || chat.messages[index + 1]?.senderId !== message.senderId

      groupedMessages.push(
        <div
          key={message.createdAt.toString()}
          className={`flex ${message.senderId === currentUser?.id ? "justify-end" : "justify-start"} mb-2`}
        >
          <div
            className={`max-w-xs p-3 rounded-lg ${
              message.senderId === currentUser?.id ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
            }`}
          >
            {message.img && <img src={message.img} alt='message' className='w-full rounded-lg mb-2' />}
            <p className='text-wrap break-words'>{message.text}</p>
            {isLastInGroup && <span className='text-xs opacity-75 mt-1 block'>{formatTime(message.createdAt)}</span>}
          </div>
        </div>
      )
    })

    return groupedMessages
  }

  return (
    <div className='flex flex-col h-full border-l border-gray-200 w-[600px] overflow-hidden'>
      <div className='flex items-center pt-4 justify-between p l-2 border-b pb-2'>
        <div className='flex items-center gap-2'>
          <figure className='flex items-center'>
            <img className='rounded-full w-[50px] h-[50px]' src={user?.avatar} alt='avatar' />
          </figure>
          <h3>{user?.username}</h3>
        </div>

        <div className='flex'>
          {" "}
          <button className='cursor-pointer p-2 rounded-lg'>
            <Phone className='size-6 text-black ' />
          </button>
          <button className='cursor-pointer p-2 rounded-lg'>
            <Video className='size-6 text-black ' />
          </button>
          <button className='cursor-pointer p-2 rounded-lg'>
            <Info className='size-6 text-black ' />
          </button>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-4 max-w-[600px]'>
        {renderMessages()}
        {img.url && (
          <div className='flex justify-end mb-4'>
            <div className='max-w-xs p-3 rounded-lg bg-blue-500 text-white relative'>
              <img src={img.url} alt='preview' className='w-full rounded-lg' />
              <button onClick={handleRemoveImage} className='absolute top-0 left-0 p-2'>
                <X />
              </button>
            </div>
          </div>
        )}
        <div ref={endRef}></div>
      </div>

      <div className='flex items-center gap-2 p-4 border-t border-gray-200 bg-white'>
        <div className='flex gap-2'>
          <label htmlFor='file' className='cursor-pointer'>
            <Image className='size-6 text-black ' />
          </label>

          <input type='file' id='file' className='hidden' onChange={handleImg} />

          <Camera className='size-6 text-black ' />

          <Mic className='size-6 text-black ' />
        </div>

        <Input
          type='text'
          placeholder={isCurrentUserBlocked || isReceiverBlocked ? "You cannot send a message" : "Type a message..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isCurrentUserBlocked || isReceiverBlocked}
          className='flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
        />

        <div className='relative'>
          <SmilePlus onClick={() => setOpen((prev) => !prev)} className='size-6 text-black ' />
          <div className='absolute bottom-12 right-0'>
            <EmojiPicker open={open} onEmojiClick={handleEmoji} />
          </div>
        </div>

        <button
          className='px-4 py-2 bg-blue-500 hover:opacity-80 cursor-pointer text-white rounded-lg disabled:bg-gray-400'
          onClick={handleSend}
          disabled={isCurrentUserBlocked || isReceiverBlocked || isSending}
        >
          Send
        </button>
      </div>
    </div>
  )
})

export { Chat }
