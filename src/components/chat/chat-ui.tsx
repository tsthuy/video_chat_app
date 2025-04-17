import EmojiPicker from "emoji-picker-react"
import { ArrowLeft, Columns2, Mic, Paperclip, SmilePlus, Trash2, Video } from "lucide-react"
import { memo, useRef, useState } from "react"
import { toast } from "react-toastify"

import ChatContainer from "~/components/chat/chat-logic"
import { Loader8 } from "~/components/loader/loader8"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover"
import { Textarea } from "~/components/ui/textarea"
import { cn } from "~/libs"
import { renderMessages } from "~/utils/render-messages.util"

const ChatUI = ({
  error,
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
  messagesContainerRef
}: ReturnType<typeof ChatContainer>) => {
  const isDisabled = isSending || isRecording || isLoadingMembers
  const [micPopoverOpen, setMicPopoverOpen] = useState(false)
  const toastIdRef = useRef<string | number | null>(null)

  return (
    <div className='flex flex-col h-full border-l flex-1 border-gray-200 overflow-hidden'>
      <div className='flex items-center justify-between border-b min-h-[70px] px-2'>
        <div className='flex items-center gap-1'>
          <button
            onClick={handleToggleUserChat}
            className='cursor-pointer p-0 rounded-lg block md:hidden'
            title='Toggle User Chat'
          >
            <ArrowLeft className='size-6 text-black' />
          </button>

          <figure className='flex items-center w-fit'>
            <img
              className='rounded-full w-[50px] h-[50px] border object-contain'
              src={group ? group.imgUrl || "/group-default.png" : user?.avatar}
              alt='avatar'
            />
          </figure>

          <h3 className='font-medium'>{group ? group.groupName : user?.username}</h3>
        </div>

        <div className='flex'>
          <button
            onClick={handleVideoCall}
            className='cursor-pointer p-2 rounded-lg disabled:opacity-50'
            disabled={isDisabled}
            title='Video Call'
          >
            <Video className='size-6 text-black' />
          </button>
          <button type='button' onClick={toggleProfile} className='cursor-pointer p-2 rounded-lg'>
            <Columns2 className='size-6 text-black' />
          </button>
        </div>
      </div>

      {error && <div className='text-red-500 text-center'>{error}</div>}

      {messages.length === 0 ? (
        <p className='text-center items-center h-full flex justify-center'>Say hello to start the conversation</p>
      ) : (
        <div ref={messagesContainerRef} className='flex-1 overflow-y-auto p-4'>
          {isLoadingMembers ? (
            <p className='text-center'>Loading...</p>
          ) : (
            renderMessages(messages, currentUser, memberInfo, user)
          )}
        </div>
      )}

      <form
        className='flex flex-col border-t px-2 py-4'
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
      >
        {(img.url || audioBlob) && (
          <div className='flex mb-4 pt-2 ml-2'>
            <div
              className={cn(
                audioBlob || img.file?.type.startsWith("application")
                  ? "max-w-[260px] bg-blue-500 p-2"
                  : "max-w-[150px] border border-black",
                " rounded-lg  text-white relative"
              )}
            >
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
                <audio
                  src={URL.createObjectURL(audioBlob)}
                  controls
                  className='min-w-[80px] max-w-[200px] sm:max-w-[240px] '
                />
              )}

              {!isSending ? (
                <button
                  onClick={handleRemoveFile}
                  className='absolute -top-2 -left-2 p-[2px] bg-red-500 text-white rounded'
                >
                  <Trash2 />
                </button>
              ) : (
                <button type='button' className='absolute inset-0 flex items-center justify-center bg-black/50 rounded'>
                  <Loader8 />
                </button>
              )}
            </div>
          </div>
        )}
        <div className='flex items-center gap-2   border-gray-200 bg-white'>
          <div
            className={cn(
              "gap-1 sm:gap-2 relative items-center flex-shrink-0",
              (img.file || audioBlob) && "cursor-not-allowed pointer-events-none opacity-50"
            )}
          >
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <SmilePlus className='size-6 text-black cursor-pointer' />
              </PopoverTrigger>
              <PopoverContent className='p-0 mb-4 w-fit border-none shadow-lg border-red-600'>
                <EmojiPicker open={open} onEmojiClick={handleEmoji} />
              </PopoverContent>
            </Popover>
          </div>

          <div ref={textareaWrapperRef} className='flex-1 items-center min-w-0'>
            <Textarea
              placeholder={!!img.file || !!audioBlob ? "Please address the pre-review file" : "Type a message..."}
              value={text}
              onKeyDown={handleKeyDown}
              onChange={(e) => setText(e.target.value)}
              disabled={isCurrentUserBlocked || isReceiverBlocked || !!img.file || !!audioBlob}
              className='w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 min-h-[40px] max-h-[80px] sm:max-h-[120px] resize-none'
              style={{ minWidth: "200px", maxWidth: "100%" }}
            />
          </div>

          <div className='flex gap-2 items-center flex-shrink-0'>
            <div className={cn("flex items-center justify-center", (text || img.file || audioBlob) && "hidden")}>
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
                <Popover
                  open={micPopoverOpen}
                  onOpenChange={(newOpen) => {
                    if (isRecording && !newOpen) {
                      if (!toast.isActive(toastIdRef!.current!)) {
                        toastIdRef.current = toast.warn("You are recording!!!", {
                          autoClose: 3000
                        })
                      }
                      return
                    }
                    setMicPopoverOpen(newOpen)
                    if (!newOpen) {
                      toastIdRef.current = null
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <button type='button' className='p-1'>
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
                          onClick={() => {
                            stopRecording()
                            setMicPopoverOpen(false)
                          }}
                          className='px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600'
                        >
                          Stop
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

            <button
              type='submit'
              className={cn(
                !text && !img.file && !audioBlob && "hidden",
                "px-4 py-2 sm:block  bg-blue-500 hover:opacity-80 cursor-pointer text-white rounded-lg disabled:bg-gray-400"
              )}
            >
              Send
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default memo(ChatUI)
