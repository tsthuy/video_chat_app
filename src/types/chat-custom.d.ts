import { DocumentReference } from "firebase/firestore"

export interface UserChatsResult {
  id: string
  ref: DocumentReference
  data: { chats: UserChatItem[] }
}
