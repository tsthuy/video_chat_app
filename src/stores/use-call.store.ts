import { create } from "zustand"

export type FilterLevel = "off" | "light" | "medium" | "strong"

interface CallState {
  isMuted: boolean
  isCameraOff: boolean
  filterLevel: FilterLevel
  supportsFilter: boolean
  currentFps: number
  isFilterAutoDisabled: boolean
  toggleMic: () => void
  toggleCamera: () => void
  setFilterLevel: (level: FilterLevel) => void
  setSupportsFilter: (supported: boolean) => void
  setCurrentFps: (fps: number) => void
  resetCallState: () => void
}

const initialState = {
  isMuted: false,
  isCameraOff: false,
  filterLevel: "off" as FilterLevel,
  supportsFilter: true,
  currentFps: 30,
  isFilterAutoDisabled: false
}

const FILTER_DISABLE_FPS = 24
const FILTER_RECOVER_FPS = 28

export const useCallStore = create<CallState>((set, get) => ({
  ...initialState,
  toggleMic: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleCamera: () => set((state) => ({ isCameraOff: !state.isCameraOff })),
  setFilterLevel: (level) =>
    set((state) => ({
      filterLevel: level,
      isFilterAutoDisabled: level === "off" ? state.isFilterAutoDisabled : false
    })),
  setSupportsFilter: (supported) => set(() => ({ supportsFilter: supported })),
  setCurrentFps: (fps: number) => {
    const { filterLevel, isFilterAutoDisabled } = get()

    if (fps < FILTER_DISABLE_FPS && filterLevel !== "off") {
      set({ currentFps: fps, filterLevel: "off", isFilterAutoDisabled: true })
      return
    }

    if (isFilterAutoDisabled && fps >= FILTER_RECOVER_FPS) {
      set({ currentFps: fps, isFilterAutoDisabled: false })
      return
    }

    set({ currentFps: fps })
  },
  resetCallState: () => set(initialState)
}))
