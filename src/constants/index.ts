import { mergeQueryKeys } from "@lukemorales/query-key-factory"

import { USER_CHAT_KEYS } from "~/constants/user-chats.const"

export const QUERY_KEYS = mergeQueryKeys(USER_CHAT_KEYS)
