// eslint-disable-next-line check-file/filename-naming-convention
import { formatTime } from "~/utils/format-time.util"

export const renderMessages = (chat: ChatData | undefined, currentUser: User | null) => {
  if (!chat?.messages) return null

  const groupedMessages: JSX.Element[] = []

  chat.messages.forEach((message, index) => {
    const isLastInGroup = index === chat.messages.length - 1 || chat.messages[index + 1]?.senderId !== message.senderId
    const isSender = message.senderId === currentUser?.id

    groupedMessages.push(
      <div key={message.createdAt.toString()} className={`flex ${isSender ? "justify-end" : "justify-start"} mb-2`}>
        <div
          className={`max-w-xs p-3 rounded-lg ${isSender ? "bg-[#dbebff] text-black" : "bg-gray-200 text-gray-800"}`}
        >
          {(message.type === "text" || !message.type) && <p className='text-wrap break-words'>{message.text}</p>}
          {message.type === "image" && <img src={message.img} alt='image' className='w-full rounded-lg mb-2' />}
          {message.type === "video" && <video src={message.img} controls className='w-full rounded-lg mb-2' />}
          {message.type === "audio" && <audio src={message.audio} controls className='min-w-[80px] mb-2' />}
          {message.type === "file" && (
            <a
              href={message.file}
              target='_blank'
              rel='noopener noreferrer'
              className='hover:underline mb-2 block text-blue-600'
            >
              {message.file?.split("/").pop()}
            </a>
          )}
          {isLastInGroup && <span className='text-xs opacity-75 mt-1 block'>{formatTime(message.createdAt)}</span>}
        </div>
      </div>
    )
  })

  return groupedMessages
}
