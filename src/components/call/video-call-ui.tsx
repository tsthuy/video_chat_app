import { User } from "lucide-react"
import { forwardRef, memo, useEffect, useRef, useState } from "react"

import { CallControls } from "~/components/call/call-controls"
import { CALL_FEATURE_FLAGS } from "~/constants"
import { useVideoFilter } from "~/hooks/use-video-filter.hook"
import { useCallStore } from "~/stores/use-call.store"

interface VideoCallUIProps {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  callStatus: string
  callerName: string
  callerAvatar?: string
  onHangUp: () => void
  onAccept?: () => void
  showAcceptButton?: boolean
  onFilteredStreamChange?: (stream: MediaStream | null) => void | Promise<void>
}

const VideoCallUI = memo(
  forwardRef<{ localVideoRef: HTMLVideoElement | null; remoteVideoRef: HTMLVideoElement | null }, VideoCallUIProps>(
    ({
      localStream,
      remoteStream,
      callStatus,
      callerName,
      callerAvatar,
      onHangUp,
      onAccept,
      showAcceptButton,
      onFilteredStreamChange
    }) => {
      const localVideoRef = useRef<HTMLVideoElement>(null)
      const remoteVideoRef = useRef<HTMLVideoElement>(null)
      const filterCanvasRef = useRef<HTMLCanvasElement>(null)

      const isCameraOff = useCallStore((state) => state.isCameraOff)
      const isMuted = useCallStore((state) => state.isMuted)
      const filterLevel = useCallStore((state) => state.filterLevel)
      const setCurrentFps = useCallStore((state) => state.setCurrentFps)
      const isVideoFilterEnabled = CALL_FEATURE_FLAGS.enableVideoFilter && filterLevel !== "off"

      const [callDuration, setCallDuration] = useState(0)

      // Apply video filter
      const { canvasRef, filteredStream } = useVideoFilter({
        videoRef: localVideoRef,
        filterLevel,
        enabled: CALL_FEATURE_FLAGS.enableVideoFilter && !isCameraOff && filterLevel !== "off",
        onFpsUpdate: setCurrentFps
      })

      // Set local stream
      useEffect(() => {
        const localVideoElement = localVideoRef.current
        if (!localVideoElement) {
          return
        }

        if (localVideoElement.srcObject !== localStream) {
          localVideoElement.srcObject = localStream
        }

        if (localStream && !isCameraOff) {
          void localVideoElement.play().catch(() => {
            // Ignore autoplay errors because the local video is muted and only used for preview/filter.
          })
        }
      }, [localStream, isCameraOff])

      // Set remote stream
      useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream
        }
      }, [remoteStream])

      // Handle mute
      useEffect(() => {
        if (localStream) {
          const audioTrack = localStream.getAudioTracks()[0]
          if (audioTrack) {
            audioTrack.enabled = !isMuted
          }
        }
      }, [localStream, isMuted])

      // Camera toggle must affect outbound track, not only local preview.
      useEffect(() => {
        if (!localStream) {
          return
        }

        localStream.getVideoTracks().forEach((videoTrack) => {
          videoTrack.enabled = !isCameraOff
        })
      }, [localStream, isCameraOff])

      // Notify parent when filtered stream changes
      useEffect(() => {
        if (onFilteredStreamChange) {
          void onFilteredStreamChange(filteredStream)
        }
      }, [filteredStream, onFilteredStreamChange])

      // Call duration timer
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
        <div className='relative h-svh bg-black overflow-hidden'>
          {/* Remote Video (Full screen) */}
          <video ref={remoteVideoRef} autoPlay playsInline className='absolute inset-0 w-full h-full object-cover' />

          {/* Remote placeholder when no stream */}
          {!remoteStream && (
            <div className='absolute inset-0 flex items-center justify-center bg-slate-900'>
              {callerAvatar ? (
                <img
                  src={callerAvatar}
                  alt={callerName}
                  className='w-32 h-32 rounded-full object-cover border-4 border-white/20'
                />
              ) : (
                <div className='w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center'>
                  <User className='w-16 h-16 text-slate-400' />
                </div>
              )}
            </div>
          )}

          {/* Local Video (Picture-in-picture) */}
          <div className='absolute top-4 right-4 w-32 h-44 sm:w-48 sm:h-64 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg'>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover -scale-x-100 ${isCameraOff || isVideoFilterEnabled ? "hidden" : ""}`}
            />
            {/* Filtered canvas output */}
            <canvas
              ref={canvasRef}
              className={`w-full h-full object-cover -scale-x-100 ${isCameraOff || !isVideoFilterEnabled ? "hidden" : ""}`}
            />
            {isCameraOff && (
              <div className='absolute inset-0 bg-slate-800 flex items-center justify-center'>
                <User className='w-12 h-12 text-slate-400' />
              </div>
            )}
          </div>

          {/* Hidden canvas for filter processing */}
          <canvas ref={filterCanvasRef} className='hidden' />

          {/* Status bar */}
          <div className='absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full'>
            <p className='text-white text-sm'>
              {callStatus === "pending" && "Đang kết nối..."}
              {callStatus === "accepted" && formatDuration(callDuration)}
            </p>
          </div>

          {/* Accept/Reject for receiver */}
          {showAcceptButton && callStatus === "pending" && onAccept && (
            <div className='absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-4'>
              <button
                type='button'
                onClick={onAccept}
                className='px-8 py-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors'
              >
                Chấp nhận
              </button>
              <button
                type='button'
                onClick={onHangUp}
                className='px-8 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors'
              >
                Từ chối
              </button>
            </div>
          )}

          {/* Call controls */}
          {(callStatus === "accepted" || (callStatus === "pending" && !showAcceptButton)) && (
            <CallControls onHangUp={onHangUp} showFilterControl={CALL_FEATURE_FLAGS.enableVideoFilter} />
          )}
        </div>
      )
    }
  )
)

VideoCallUI.displayName = "VideoCallUI"

export { VideoCallUI }
