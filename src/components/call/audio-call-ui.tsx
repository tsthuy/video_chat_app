import { Phone, User } from "lucide-react"
import { memo, useEffect, useRef, useState } from "react"

import { CallControls } from "~/components/call/call-controls"
import { useCallStore } from "~/stores/use-call.store"

interface AudioCallUIProps {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  callerName: string
  callerAvatar?: string
  callStatus: string
  onHangUp: () => void
  onSwitchToVideo?: () => void
  onAccept?: () => void
  showAcceptButton?: boolean
}

const AudioCallUI = memo(
  ({
    localStream,
    remoteStream,
    callerName,
    callerAvatar,
    callStatus,
    onHangUp,
    onSwitchToVideo,
    onAccept,
    showAcceptButton
  }: AudioCallUIProps) => {
    const remoteAudioRef = useRef<HTMLAudioElement>(null)
    const [callDuration, setCallDuration] = useState(0)
    const isMuted = useCallStore((state) => state.isMuted)

    useEffect(() => {
      const remoteAudioElement = remoteAudioRef.current
      if (!remoteAudioElement) {
        return
      }

      if (remoteAudioElement.srcObject !== remoteStream) {
        remoteAudioElement.srcObject = remoteStream
      }

      if (remoteStream) {
        void remoteAudioElement.play().catch(() => {
          // Ignore autoplay errors because user interaction already exists in call flows.
        })
      }
    }, [remoteStream])

    useEffect(() => {
      if (!localStream) {
        return
      }

      localStream.getAudioTracks().forEach((audioTrack) => {
        audioTrack.enabled = !isMuted
      })
    }, [localStream, isMuted])

    useEffect(() => {
      if (callStatus !== "accepted") return

      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)

      return () => clearInterval(interval)
    }, [callStatus])

    const formatDuration = (seconds: number): string => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }

    return (
      <div className='flex flex-col items-center justify-center h-svh bg-gradient-to-b from-slate-900 to-slate-800 text-white'>
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Avatar */}
        <div className='relative mb-6'>
          {callerAvatar ? (
            <img
              src={callerAvatar}
              alt={callerName}
              className='w-32 h-32 rounded-full object-cover border-4 border-white/20'
            />
          ) : (
            <div className='w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center border-4 border-white/20'>
              <User className='w-16 h-16 text-slate-400' />
            </div>
          )}

          {/* Calling animation rings */}
          {callStatus === "pending" && (
            <>
              <div className='absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-75' />
              <div className='absolute inset-0 rounded-full border-4 border-green-400 animate-pulse' />
            </>
          )}

          {/* Connected indicator */}
          {callStatus === "accepted" && (
            <div className='absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center'>
              <Phone className='w-3 h-3' />
            </div>
          )}
        </div>

        {/* Name */}
        <h2 className='text-2xl font-semibold mb-2'>{callerName}</h2>

        {/* Status */}
        <p className='text-slate-400 mb-4'>
          {callStatus === "pending" && "Đang kết nối..."}
          {callStatus === "accepted" && formatDuration(callDuration)}
          {callStatus === "ended" && "Cuộc gọi đã kết thúc"}
        </p>

        {/* Audio wave animation */}
        {callStatus === "accepted" && (
          <div className='flex items-end gap-1 h-8 mb-8'>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className='w-1 bg-green-400 rounded-full animate-pulse'
                style={{
                  height: `${Math.random() * 24 + 8}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: "0.5s"
                }}
              />
            ))}
          </div>
        )}

        {/* Accept/Reject buttons for receiver */}
        {showAcceptButton && callStatus === "pending" && onAccept && (
          <div className='flex gap-4 mb-8'>
            <button
              type='button'
              onClick={onAccept}
              className='px-8 py-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors flex items-center gap-2'
            >
              <Phone className='w-5 h-5' />
              Chấp nhận
            </button>
            <button
              type='button'
              onClick={onHangUp}
              className='px-8 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center gap-2'
            >
              <Phone className='w-5 h-5 rotate-[135deg]' />
              Từ chối
            </button>
          </div>
        )}

        {/* Call controls */}
        {(callStatus === "accepted" || (callStatus === "pending" && !showAcceptButton)) && (
          <CallControls onHangUp={onHangUp} onSwitchToVideo={onSwitchToVideo} isAudioOnly showFilterControl={false} />
        )}
      </div>
    )
  }
)

AudioCallUI.displayName = "AudioCallUI"

export { AudioCallUI }
