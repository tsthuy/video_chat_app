import { Camera, CameraOff, Mic, MicOff, Phone, Sparkles, Video } from "lucide-react"
import { memo } from "react"

import { Button } from "~/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover"
import type { FilterLevel } from "~/stores/use-call.store"
import { useCallStore } from "~/stores/use-call.store"

interface CallControlsProps {
  onHangUp: () => void
  onSwitchToVideo?: () => void
  isAudioOnly?: boolean
  showFilterControl?: boolean
}

const FILTER_OPTIONS: { level: FilterLevel; label: string; description: string }[] = [
  { level: "off", label: "Tắt", description: "Không filter" },
  { level: "light", label: "Nhẹ", description: "Sáng nhẹ, mịn da nhẹ" },
  { level: "medium", label: "Vừa", description: "Sáng vừa, mịn da vừa" },
  { level: "strong", label: "Mạnh", description: "Rất sáng, mịn da mạnh" }
]

const CallControls = memo(
  ({ onHangUp, onSwitchToVideo, isAudioOnly = false, showFilterControl = true }: CallControlsProps) => {
    const isMuted = useCallStore((state) => state.isMuted)
    const isCameraOff = useCallStore((state) => state.isCameraOff)
    const filterLevel = useCallStore((state) => state.filterLevel)
    const isFilterAutoDisabled = useCallStore((state) => state.isFilterAutoDisabled)
    const currentFps = useCallStore((state) => state.currentFps)
    const toggleMic = useCallStore((state) => state.toggleMic)
    const toggleCamera = useCallStore((state) => state.toggleCamera)
    const setFilterLevel = useCallStore((state) => state.setFilterLevel)

    return (
      <div className='fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg'>
        {/* Mute Button */}
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size='icon'
          className='rounded-full w-12 h-12'
          onClick={toggleMic}
          title={isMuted ? "Bật mic" : "Tắt mic"}
        >
          {isMuted ? <MicOff className='w-5 h-5' /> : <Mic className='w-5 h-5' />}
        </Button>

        {/* Camera Button - Only for video calls */}
        {!isAudioOnly && (
          <Button
            variant={isCameraOff ? "destructive" : "secondary"}
            size='icon'
            className='rounded-full w-12 h-12'
            onClick={toggleCamera}
            title={isCameraOff ? "Bật camera" : "Tắt camera"}
          >
            {isCameraOff ? <CameraOff className='w-5 h-5' /> : <Camera className='w-5 h-5' />}
          </Button>
        )}

        {/* Switch to Video - Only for audio calls */}
        {isAudioOnly && onSwitchToVideo && (
          <Button
            variant='secondary'
            size='icon'
            className='rounded-full w-12 h-12'
            onClick={onSwitchToVideo}
            title='Bật video'
          >
            <Video className='w-5 h-5' />
          </Button>
        )}

        {/* Filter Button - Only for video calls */}
        {showFilterControl && !isAudioOnly && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={filterLevel !== "off" ? "default" : "secondary"}
                size='icon'
                className={`rounded-full w-12 h-12 transition-all duration-200 ${
                  filterLevel !== "off"
                    ? "bg-primary hover:bg-primary/90 shadow-lg ring-2 ring-primary/30"
                    : "hover:bg-secondary/80"
                }`}
                title={`Beauty Filter ${filterLevel !== "off" ? `(${filterLevel})` : "(Off)"}`}
              >
                <Sparkles
                  className={`w-5 h-5 transition-colors ${filterLevel !== "off" ? "text-primary-foreground" : ""}`}
                />
                {/* Active indicator dot */}
                {filterLevel !== "off" && (
                  <div className='absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background animate-pulse' />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-56 p-2' side='top'>
              <div className='space-y-1'>
                <p className='text-xs text-muted-foreground px-2 pb-2'>
                  Beauty Filter {isFilterAutoDisabled && "(Tự tắt do FPS thấp)"}
                </p>
                {FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.level}
                    type='button'
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-200 ${
                      filterLevel === option.level
                        ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setFilterLevel(option.level)}
                  >
                    <div className='flex items-center justify-between'>
                      <div>
                        <div className='font-medium'>{option.label}</div>
                        <div className='text-xs opacity-70'>{option.description}</div>
                      </div>
                      {filterLevel === option.level && (
                        <div className='w-2 h-2 bg-current rounded-full animate-pulse' />
                      )}
                    </div>
                  </button>
                ))}
                {currentFps < 30 && (
                  <p className='text-xs text-amber-500 px-2 pt-2'>FPS: {currentFps} (có thể bị lag)</p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Hang Up Button */}
        <Button
          variant='destructive'
          size='icon'
          className='rounded-full w-14 h-14'
          onClick={onHangUp}
          title='Kết thúc cuộc gọi'
        >
          <Phone className='w-6 h-6 rotate-[135deg]' />
        </Button>
      </div>
    )
  }
)

CallControls.displayName = "CallControls"

export { CallControls }
