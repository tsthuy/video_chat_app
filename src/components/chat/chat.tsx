import { memo } from "react"

import ChatContainer from "~/components/chat/chat-logic"
import ChatUi from "~/components/chat/chat-ui"

const ChatOptimize = memo(() => {
  const chatProps = ChatContainer({
    onSend: () => {},
    onVideoCall: () => {}
  })

  return <ChatUi {...chatProps} />
})

export { ChatOptimize }
