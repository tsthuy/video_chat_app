// eslint-disable-next-line check-file/filename-naming-convention
import { formatTime } from "~/utils"

export const renderMessages = (
  messages: Message[],
  currentUser: User | null,
  memberInfo: Record<string, User>,
  user?: User | null
) => {
  if (!messages || messages.length === 0) return null

  return messages.map((message, index) => {
    const isSender = message.senderId === currentUser?.id
    const sender = isSender ? null : memberInfo[message.senderId]
    const isLastInGroup = index === messages.length - 1 || messages[index + 1]?.senderId !== message.senderId
    const isFirstInGroup = index === 0 || messages[index - 1]?.senderId !== message.senderId

    return (
      <div key={message.createdAt} className={`flex ${isSender ? "justify-end" : "justify-start"} mb-2`}>
        <div className='flex gap-2'>
          {(!sender || !isFirstInGroup) && !user && <div className='w-8 h-8 flex-shrink-0' />}
          {sender && isFirstInGroup && (
            <img
              src={sender.avatar || user?.avatar}
              alt={sender.username || user?.username}
              className='w-8 h-8 rounded-full'
            />
          )}
          <div
            className={`sm:max-w-[300px] max-w-[250px] p-3 rounded-lg ${isSender ? "bg-[#dbebff] text-black" : "bg-gray-200 text-gray-800"}`}
          >
            {sender && isFirstInGroup && <p className='text-xs font-bold'>{sender.username}</p>}
            {message.type === "text" && <p className='text-wrap break-words'>{message.text}</p>}
            {message.type === "image" && <img src={message.img} alt='image' className='w-full rounded-lg mb-2' />}
            {message.type === "video" && <video src={message.img} controls className='w-full rounded-lg mb-2' />}
            {message.type === "audio" && (
              <audio src={message.audio} controls className='min-w-[40px] sm:max-w-[240px] max-w-[200px] mb-2' />
            )}
            {message.type === "file" && (
              <a
                href={message.file}
                target='_blank'
                rel='noopener noreferrer'
                className='underline mb-2 block text-wrap break-words hover:text-blue-500'
              >
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
