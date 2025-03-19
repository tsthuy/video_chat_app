// ~/components/profile.tsx
import { doc, onSnapshot } from "firebase/firestore"
import { useEffect, useState } from "react"

import { Button } from "~/components/ui/button"
import { db } from "~/lib/firebase"
import { useChatStore } from "~/stores"

interface ProfileProps {
  user: User | null
  group: UserChatItem
}

const Profile = ({ user, group }: ProfileProps) => {
  const chatId = useChatStore((state) => state.chatId)
  const [chatData, setChatData] = useState<ChatData | null>(null)

  useEffect(() => {
    if (!chatId) return

    const chatRef = doc(db, "chats", chatId)
    const unsubscribe = onSnapshot(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        setChatData(snapshot.data() as ChatData)
      }
    })

    return () => unsubscribe()
  }, [chatId])

  const getResources = () => {
    if (!chatData?.messages) return { imagesAndVideos: [], files: [], audios: [] }

    const imagesAndVideos = chatData.messages
      .filter((msg) => msg.img)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 6)

    const files = chatData.messages
      .filter((msg) => msg.file)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 2)

    const audios = chatData.messages
      .filter((msg) => msg.audio)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 2)

    return { imagesAndVideos, files, audios }
  }

  const { imagesAndVideos, files, audios } = getResources()
  console.log(user)
  console.log(group)
  return (
    <div className='border-l border-gray-200 h-full flex flex-col min-w-[344px] w-[344px]'>
      <div className='flex items-center justify-center border-b min-h-[70px] px-2'>
        <h2 className='text-center font-medium'>Chat Information</h2>
      </div>

      <div className='flex-1 p-4'>
        <div className='mb-4'>
          <h4 className=' font-medium mb-2'>Ảnh & Video</h4>
          <div className='grid grid-cols-3 gap-2'>
            {imagesAndVideos.map((msg) => (
              <img key={msg.createdAt} src={msg.img} alt='media' className='w-full h-[80px] object-cover rounded-lg' />
            ))}
          </div>
          {imagesAndVideos.length > 10 && (
            <Button variant='link' className='mt-2'>
              Xem thêm
            </Button>
          )}
        </div>

        <div className='mb-4'>
          <h4 className=' font-medium mb-2'>File</h4>
          <div className='space-y-2'>
            {files.map((msg) => (
              <a
                key={msg.createdAt}
                href={msg.file}
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-500 underline block truncate'
              >
                {msg.file?.split("/").pop()}
              </a>
            ))}
          </div>
          {files.length > 10 && (
            <Button variant='link' className='mt-2'>
              Xem thêm
            </Button>
          )}
        </div>

        <div className='mb-4'>
          <h4 className=' font-medium mb-2'>Audio</h4>
          <div className='space-y-2'>
            {audios.map((msg) => (
              <audio key={msg.createdAt} src={msg.audio} controls className='w-full' />
            ))}
          </div>
          {audios.length > 10 && (
            <Button variant='link' className='mt-2'>
              Xem thêm
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export { Profile }
