// eslint-disable-next-line check-file/filename-naming-convention
import { formatTime } from "~/utils/format-time.util"

export const renderMessages = (
  chat: ChatData | undefined,
  currentUser: User | null,
  memberInfo: Record<string, User>
) => {
  if (!chat?.messages) return null

  return chat.messages.map((message, index) => {
    const isSender = message.senderId === currentUser?.id
    const sender = isSender ? null : memberInfo[message.senderId]
    const isLastInGroup = index === chat.messages.length - 1 || chat.messages[index + 1]?.senderId !== message.senderId
    const isFirstInGroup = index === 0 || chat.messages[index - 1]?.senderId !== message.senderId

    return (
      <div key={message.createdAt.toString()} className={`flex ${isSender ? "justify-end" : "justify-start"} mb-2`}>
        <div className='flex gap-2'>
          {(!sender || !isFirstInGroup) && <div className='w-8 h-8 flex-shrink-0' />}
          {sender && isFirstInGroup && (
            <img src={sender.avatar} alt={sender.username} className='w-8 h-8 rounded-full' />
          )}
          <div
            className={`max-w-xs p-3 rounded-lg ${isSender ? "bg-[#dbebff] text-black" : "bg-gray-200 text-gray-800"}`}
          >
            {sender && isFirstInGroup && <p className='text-xs font-bold'>{sender.username}</p>}
            {message.type === "text" && <p className='text-wrap break-words'>{message.text}</p>}
            {message.type === "image" && <img src={message.img} alt='image' className='w-full rounded-lg mb-2' />}
            {message.type === "video" && <video src={message.img} controls className='w-full rounded-lg mb-2' />}
            {message.type === "audio" && <audio src={message.audio} controls className='min-w-[60px] mb-2' />}
            {message.type === "file" && (
              <a href={message.file} target='_blank' rel='noopener noreferrer' className='underline mb-2 block'>
                Tải file: {message.file?.split("/").pop()}
              </a>
            )}
            {isLastInGroup && <span className='text-xs opacity-75 mt-1 block'>{formatTime(message.createdAt)}</span>}
          </div>
        </div>
      </div>
    )
  })
}
