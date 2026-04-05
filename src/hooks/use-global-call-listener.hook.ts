import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from "firebase/firestore"
import { useCallback, useEffect, useRef, useState } from "react"

import { db } from "~/libs"

interface IncomingCall {
  callId: string
  callerId: string
  callerName: string
  callerAvatar?: string
  callType: "audio" | "video"
  chatId: string
}

interface UseGlobalCallListenerReturn {
  incomingCall: IncomingCall | null
  acceptCall: () => void
  declineCall: () => void
}

interface CallDocData {
  callerId?: string
  receiverId?: string
  status?: string
  callType?: "audio" | "video"
  chatId?: string
}

export const useGlobalCallListener = (userId?: string): UseGlobalCallListenerReturn => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const currentUserIdRef = useRef<string | undefined>(userId)
  const incomingCallRef = useRef<IncomingCall | null>(null)
  const processedCallIdsRef = useRef<Set<string>>(new Set())
  const acceptedCallIdsRef = useRef<Set<string>>(new Set())

  // Update ref when userId changes
  useEffect(() => {
    currentUserIdRef.current = userId
  }, [userId])

  useEffect(() => {
    incomingCallRef.current = incomingCall
  }, [incomingCall])

  useEffect(() => {
    if (!userId) {
      setIncomingCall(null)
      processedCallIdsRef.current.clear()
      acceptedCallIdsRef.current.clear()
      return
    }

    // Listen for incoming calls where current user is the receiver
    const callsQuery = query(
      collection(db, "calls"),
      where("receiverId", "==", userId),
      where("status", "==", "pending")
    )

    const processedCallIds = processedCallIdsRef.current
    const acceptedCallIds = acceptedCallIdsRef.current

    const unsubscribe = onSnapshot(
      callsQuery,
      async (snapshot) => {
        const calls = snapshot.docs.map((snapshotDoc) => {
          const callData = snapshotDoc.data() as CallDocData
          return {
            id: snapshotDoc.id,
            ...callData
          }
        })

        if (calls.length > 0) {
          const pendingIds = new Set(calls.map((call) => call.id))
          for (const callId of Array.from(processedCallIds)) {
            if (!pendingIds.has(callId)) {
              processedCallIds.delete(callId)
            }
          }
          for (const callId of Array.from(acceptedCallIds)) {
            if (!pendingIds.has(callId)) {
              acceptedCallIds.delete(callId)
            }
          }

          // Get the most recent call that hasn't been processed
          const unprocessedCalls = calls.filter(
            (call) => Boolean(call.callerId) && !processedCallIds.has(call.id) && !acceptedCallIds.has(call.id)
          )

          if (unprocessedCalls.length === 0) {
            return
          }

          const latestCall = unprocessedCalls[unprocessedCalls.length - 1]

          if (!latestCall.chatId) {
            await updateDoc(doc(db, "calls", latestCall.id), { status: "ended" })
            return
          }

          // Mark as processed immediately to prevent duplicates
          processedCallIds.add(latestCall.id)

          try {
            // Fetch caller information
            const callerDoc = await getDoc(doc(db, "users", latestCall.callerId as string))
            const callerData = callerDoc.exists() ? callerDoc.data() : null

            const callType = latestCall.callType === "audio" ? "audio" : "video"

            const callData: IncomingCall = {
              callId: latestCall.id,
              callerId: latestCall.callerId as string,
              callerName: callerData?.username || callerData?.displayName || "Unknown User",
              callerAvatar: callerData?.avatar,
              callType,
              chatId: latestCall.chatId
            }
            setIncomingCall(callData)
          } catch (error) {
            console.error("📞 [CallListener] Error fetching caller data:", error)
            // Remove from processed set if error occurred
            processedCallIds.delete(latestCall.id)
          }
        } else {
          // Clear processed calls when no pending calls
          processedCallIds.clear()
          acceptedCallIds.clear()
          setIncomingCall(null)
        }
      },
      (error) => {
        console.error("📞 [CallListener] Firestore listener error:", error)
      }
    )

    return () => {
      unsubscribe()
      setIncomingCall(null)
      processedCallIds.clear()
      acceptedCallIds.clear()
    }
  }, [userId]) // Only userId in dependencies to avoid infinite loops

  const acceptCall = useCallback(async () => {
    const currentCall = incomingCallRef.current
    const currentUserId = currentUserIdRef.current

    if (!currentCall || !currentUserId || !currentCall.chatId) {
      if (currentCall?.callId) {
        try {
          await updateDoc(doc(db, "calls", currentCall.callId), {
            status: "ended"
          })
        } catch (error) {
          console.error("📞 [CallListener] Failed to end malformed call:", error)
        }
      }

      return
    }

    try {
      acceptedCallIdsRef.current.add(currentCall.callId)

      // Clear the incoming call state first
      setIncomingCall(null)

      // Open call window with proper parameters
      const callUrl = new URL("/call", window.location.origin)
      callUrl.searchParams.set("callId", currentCall.callId)
      callUrl.searchParams.set("chatId", currentCall.chatId)
      callUrl.searchParams.set("callerId", currentCall.callerId)
      callUrl.searchParams.set("receiverId", currentUserId)
      callUrl.searchParams.set("callType", currentCall.callType)
      callUrl.searchParams.set("autoAccept", "1")

      const windowFeatures =
        currentCall.callType === "audio"
          ? "width=420,height=680,scrollbars=no,resizable=yes"
          : "width=1200,height=800,scrollbars=no,resizable=yes"

      // Open in new window (like original implementation)
      const callWindow = window.open(callUrl.toString(), "video-call", windowFeatures)

      if (!callWindow) {
        acceptedCallIdsRef.current.delete(currentCall.callId)
        await updateDoc(doc(db, "calls", currentCall.callId), {
          status: "ended"
        })
      }
    } catch (error) {
      acceptedCallIdsRef.current.delete(currentCall.callId)
      console.error("📞 [CallListener] Error accepting call:", error)
    }
  }, [])

  const declineCall = useCallback(async () => {
    const currentCall = incomingCallRef.current

    if (!currentCall) {
      return
    }

    try {
      // Update call status to ended
      await updateDoc(doc(db, "calls", currentCall.callId), {
        status: "ended"
      })

      // Clear the incoming call state
      setIncomingCall(null)
    } catch (error) {
      console.error("📞 [CallListener] Error declining call:", error)
    }
  }, [])

  return {
    incomingCall,
    acceptCall,
    declineCall
  }
}
