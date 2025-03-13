interface Message {
  chatId: string
  senderId: string
  text: string
  createdAt: Timestamp
  img?: string
}

interface ChatData {
  messages: Message[]
}

interface ImgState {
  file: File | null
  url: string
}
