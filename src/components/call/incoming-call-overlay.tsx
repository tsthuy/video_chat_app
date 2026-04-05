import { Phone, PhoneOff, User, Video } from "lucide-react"
import { memo, useEffect, useState } from "react"

interface IncomingCallOverlayProps {
  callerName: string
  callerAvatar?: string
  callType: "audio" | "video"
  onAccept: () => void
  onDecline: () => void
}

const IncomingCallOverlay = memo<IncomingCallOverlayProps>(
  ({ callerName, callerAvatar, callType, onAccept, onDecline }) => {
    const [isPulsing, setIsPulsing] = useState(true)

    // Pulsing animation effect
    useEffect(() => {
      const interval = setInterval(() => {
        setIsPulsing((prev) => !prev)
      }, 1000)
      return () => clearInterval(interval)
    }, [])

    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.code === "Space") {
          event.preventDefault()
          onAccept()
        } else if (event.code === "Escape") {
          event.preventDefault()
          onDecline()
        }
      }

      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }, [onAccept, onDecline])

    return (
      <div className='fixed inset-0 z-50 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center'>
        {/* Background blur overlay */}
        <div className='absolute inset-0 bg-black/60 backdrop-blur-sm' />

        {/* Content */}
        <div className='relative z-10 flex flex-col items-center text-white'>
          {/* Call type indicator */}
          <div className='mb-8'>
            <div className='flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full'>
              {callType === "video" ? <Video className='w-4 h-4' /> : <Phone className='w-4 h-4' />}
              <span className='text-sm font-medium'>{callType === "video" ? "Video Call" : "Voice Call"}</span>
            </div>
          </div>

          {/* Caller Avatar */}
          <div className={`mb-8 transition-transform duration-1000 ${isPulsing ? "scale-105" : "scale-100"}`}>
            {callerAvatar ? (
              <img
                src={callerAvatar}
                alt={callerName}
                className='w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-white/20 shadow-2xl'
              />
            ) : (
              <div className='w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-slate-700 border-4 border-white/20 shadow-2xl flex items-center justify-center'>
                <User className='w-16 h-16 sm:w-20 sm:h-20 text-slate-300' />
              </div>
            )}

            {/* Pulsing ring effect */}
            <div
              className={`absolute -inset-2 border-2 border-white/30 rounded-full transition-all duration-1000 ${isPulsing ? "scale-110 opacity-30" : "scale-100 opacity-60"}`}
            />
          </div>

          {/* Caller Name */}
          <h2 className='text-2xl sm:text-3xl font-semibold mb-2 text-center px-4'>{callerName}</h2>

          {/* Call status */}
          <p className='text-lg text-white/80 mb-16 text-center'>Incoming {callType} call...</p>

          {/* Action Buttons */}
          <div className='flex items-center justify-center gap-16 sm:gap-20'>
            {/* Decline Button */}
            <button
              type='button'
              onClick={onDecline}
              className='group relative w-16 h-16 sm:w-18 sm:h-18 bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95'
              aria-label='Decline call'
            >
              <PhoneOff className='w-8 h-8 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' />

              {/* Ripple effect */}
              <div className='absolute inset-0 rounded-full bg-red-400 opacity-30 animate-ping' />
            </button>

            {/* Accept Button */}
            <button
              type='button'
              onClick={onAccept}
              className='group relative w-16 h-16 sm:w-18 sm:h-18 bg-green-500 hover:bg-green-600 rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95'
              aria-label='Accept call'
            >
              <Phone className='w-8 h-8 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' />

              {/* Ripple effect */}
              <div className='absolute inset-0 rounded-full bg-green-400 opacity-30 animate-ping' />
            </button>
          </div>

          {/* Swipe hint for mobile */}
          <div className='mt-12 text-center sm:hidden'>
            <p className='text-sm text-white/60'>Tap to answer or decline</p>
          </div>
        </div>

        {/* Keyboard shortcuts */}
        <div className='absolute bottom-4 left-4 text-xs text-white/40 hidden sm:block'>
          <p>Press Space to accept, Esc to decline</p>
        </div>
      </div>
    )
  }
)

IncomingCallOverlay.displayName = "IncomingCallOverlay"

export { IncomingCallOverlay }
