interface ChatData {
  id: string
  createdAt: Timestamp
  messages: Message[]
}

interface Message {
  id?: string
  chatId: string
  senderId: string
  text?: string
  createdAt: Timestamp
  img?: string
  audio?: string
  file?: string
  type: "text" | "image" | "audio" | "video" | "file"
}
interface ImgState {
  file: File | null
  url: string
}
