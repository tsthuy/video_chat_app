import { addDoc, collection, doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"

import { AudioCallUI } from "~/components/call/audio-call-ui"
import { VideoCallUI } from "~/components/call/video-call-ui"
import { CALL_FEATURE_FLAGS } from "~/constants"
import { db } from "~/libs"
import { useUserStore } from "~/stores"
import { useCallStore } from "~/stores/use-call.store"
import { getErrorMessage } from "~/utils"

const servers: RTCConfiguration = {
  iceServers: [
    { urls: "stun:freestun.net:3478" },
    { urls: "turn:freestun.net:3478", username: "free", credential: "free" },
    {
      urls: [
        "stun:stun.cloudflare.com:3478",
        "turn:turn.cloudflare.com:3478?transport=udp",
        "turn:turn.cloudflare.com:3478?transport=tcp",
        "turns:turn.cloudflare.com:5349?transport=tcp"
      ],
      username: "g0d02fc4be4367ee62e1c59b70c82a8262347d3b65bb00b6a6c624f613b7b55d",
      credential: "2277485491e5debabbdbd4ff2e10f343d43e7559d722f2505a9dd2953649751e"
    }
  ],
  iceCandidatePoolSize: 5
}

const AUTO_ACCEPT_RETRY_INTERVAL_MS = 300
const AUTO_ACCEPT_MAX_RETRIES = 30

const Call = () => {
  const { currentUser } = useUserStore()
  const resetCallState = useCallStore((state) => state.resetCallState)

  const searchParams = new URLSearchParams(window.location.search)
  const [callId] = useState<string | null>(searchParams.get("callId"))
  const [chatId] = useState<string | null>(searchParams.get("chatId"))
  const [callerId] = useState<string | null>(searchParams.get("callerId"))
  const [receiverId] = useState<string | null>(searchParams.get("receiverId"))
  const [initialCallType] = useState<"video" | "audio">((searchParams.get("callType") as "video" | "audio") || "video")
  const [isAutoAcceptEnabled] = useState<boolean>(searchParams.get("autoAccept") === "1")

  const [callType, setCallType] = useState<"video" | "audio">(initialCallType)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [callStatus, setCallStatus] = useState<string>("pending")
  const [remoteUserInfo, setRemoteUserInfo] = useState<{ name: string; avatar?: string }>({ name: "User" })

  const pc = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const filteredStreamRef = useRef<MediaStream | null>(null)
  const trackReplaceQueueRef = useRef<Promise<void>>(Promise.resolve())
  const isAutoAcceptInProgressRef = useRef(false)

  const isCaller = currentUser?.id === callerId
  const isReceiver = currentUser?.id === receiverId

  useEffect(() => {
    localStreamRef.current = localStream
  }, [localStream])

  useEffect(() => {
    remoteStreamRef.current = remoteStream
  }, [remoteStream])

  const stopStreamTracks = useCallback((stream: MediaStream | null) => {
    if (!stream) {
      return
    }

    stream.getTracks().forEach((track) => {
      track.stop()
    })
  }, [])

  const queueReplaceTrack = useCallback((sender: RTCRtpSender, track: MediaStreamTrack | null) => {
    trackReplaceQueueRef.current = trackReplaceQueueRef.current
      .then(async () => {
        await sender.replaceTrack(track)
      })
      .catch((error) => {
        console.error("🔄 [Call] Failed queued replaceTrack:", error)
      })

    return trackReplaceQueueRef.current
  }, [])

  const cleanupMedia = useCallback(() => {
    stopStreamTracks(localStreamRef.current)
    stopStreamTracks(remoteStreamRef.current)
    stopStreamTracks(filteredStreamRef.current)

    localStreamRef.current = null
    remoteStreamRef.current = null
    filteredStreamRef.current = null

    if (pc.current) {
      pc.current.close()
      pc.current = null
    }

    resetCallState()
  }, [resetCallState, stopStreamTracks])

  const hangUp = useCallback(async () => {
    if (callId) {
      try {
        await updateDoc(doc(db, "calls", callId), { status: "ended" })
      } catch (error) {
        console.error("Failed to update call status to ended:", error)
      }
    }

    cleanupMedia()
    window.close()
  }, [callId, cleanupMedia])

  // Fetch remote user info
  useEffect(() => {
    const fetchRemoteUser = async () => {
      const remoteUserId = isCaller ? receiverId : callerId
      if (!remoteUserId) return

      try {
        const userDoc = await getDoc(doc(db, "users", remoteUserId))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setRemoteUserInfo({
            name: userData.username || "User",
            avatar: userData.avatar
          })
        }
      } catch (error) {
        console.error("Error fetching remote user:", error)
      }
    }

    fetchRemoteUser()
  }, [isCaller, receiverId, callerId])

  // Setup call
  useEffect(() => {
    if (!callId || !chatId || !currentUser || !callerId || !receiverId) {
      return
    }

    let isDisposed = false
    const unsubscribers: Array<() => void> = []

    const setupCall = async () => {
      try {
        const callDocRef = doc(db, "calls", callId)
        const callSnap = await getDoc(callDocRef)
        const callData = callSnap.data()
        if (!callData) {
          toast.error("Call data not found")
          window.close()
          return
        }

        setCallStatus(callData.status || "pending")
        const resolvedCallType: "video" | "audio" = callData.callType === "audio" ? "audio" : initialCallType
        setCallType(resolvedCallType)

        const offerCandidates = collection(callDocRef, "offerCandidates")
        const answerCandidates = collection(callDocRef, "answerCandidates")

        const mediaConstraints: MediaStreamConstraints =
          resolvedCallType === "audio" ? { video: false, audio: true } : { video: true, audio: true }

        const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)

        const hasAudioTrack = stream.getAudioTracks().length > 0
        const hasVideoTrack = stream.getVideoTracks().length > 0

        if (!hasAudioTrack || (resolvedCallType === "video" && !hasVideoTrack)) {
          stopStreamTracks(stream)
          toast.error("Không thể truy cập thiết bị media cho cuộc gọi")
          window.close()
          return
        }

        if (isDisposed) {
          stopStreamTracks(stream)
          return
        }

        setLocalStream(stream)
        localStreamRef.current = stream

        const remoteStreamObj = new MediaStream()

        const pcInstance = new RTCPeerConnection(servers)
        pc.current = pcInstance

        stream.getTracks().forEach((track) => {
          if (pcInstance.signalingState !== "closed") {
            pcInstance.addTrack(track, stream)
          }
        })

        pcInstance.ontrack = (event) => {
          event.streams[0].getTracks().forEach((track) => {
            remoteStreamObj.addTrack(track)
          })
          remoteStreamRef.current = remoteStreamObj
          setRemoteStream(remoteStreamObj)
        }

        if (isCaller) {
          pcInstance.onicecandidate = (event) => {
            if (event.candidate) {
              addDoc(offerCandidates, event.candidate.toJSON())
            }
          }

          const offerDescription = await pcInstance.createOffer()
          await pcInstance.setLocalDescription(offerDescription)

          const offer = { sdp: offerDescription.sdp, type: offerDescription.type }
          await setDoc(
            callDocRef,
            { offer, callerId, receiverId, chatId, status: "pending", callType: resolvedCallType },
            {
              merge: true
            }
          )

          const unsubscribeCall = onSnapshot(callDocRef, (snapshot) => {
            const data = snapshot.data()
            if (!pc.current?.currentRemoteDescription && data?.answer && data.status === "accepted") {
              const answerDescription = new RTCSessionDescription(data.answer)
              pc.current?.setRemoteDescription(answerDescription)
            }
            setCallStatus(data?.status || "pending")
            if (data?.callType) setCallType(data.callType)
            if (data?.status === "ended") window.close()
          })
          unsubscribers.push(unsubscribeCall)

          const unsubscribeAnswerCandidates = onSnapshot(answerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added") {
                const candidate = new RTCIceCandidate(change.doc.data())
                pc.current?.addIceCandidate(candidate)
              }
            })
          })
          unsubscribers.push(unsubscribeAnswerCandidates)
        } else {
          pcInstance.onicecandidate = (event) => {
            if (event.candidate) {
              addDoc(answerCandidates, event.candidate.toJSON())
            }
          }

          const unsubscribeCall = onSnapshot(callDocRef, (snapshot) => {
            const data = snapshot.data()
            if (data?.offer && !pc.current?.remoteDescription && data.status === "pending") {
              const offerDescription = new RTCSessionDescription(data.offer)
              pc.current?.setRemoteDescription(offerDescription)
            }
            setCallStatus(data?.status || "pending")
            if (data?.callType) setCallType(data.callType)
            if (data?.status === "ended") window.close()
          })
          unsubscribers.push(unsubscribeCall)

          const unsubscribeOfferCandidates = onSnapshot(offerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added") {
                const candidate = new RTCIceCandidate(change.doc.data())
                pc.current?.addIceCandidate(candidate)
              }
            })
          })
          unsubscribers.push(unsubscribeOfferCandidates)
        }

        pcInstance.onconnectionstatechange = () => {
          if (pcInstance.connectionState === "disconnected" || pcInstance.connectionState === "failed") {
            void hangUp()
          }
        }
      } catch (error) {
        toast.error(getErrorMessage(error))
        window.close()
      }
    }

    setupCall()

    return () => {
      isDisposed = true
      unsubscribers.forEach((unsubscribe) => unsubscribe())
      cleanupMedia()
    }
  }, [
    callId,
    chatId,
    currentUser,
    callerId,
    receiverId,
    isCaller,
    initialCallType,
    cleanupMedia,
    hangUp,
    stopStreamTracks
  ])

  const attemptAcceptCall = useCallback(async (): Promise<"accepted" | "offer-missing" | "skip"> => {
    if (!pc.current || !callId || isCaller || (callStatus !== "pending" && callStatus !== "connecting")) {
      return "skip"
    }

    const callDocRef = doc(db, "calls", callId)
    const callData = (await getDoc(callDocRef)).data()
    if (!callData?.offer) {
      return "offer-missing"
    }

    if (!pc.current.remoteDescription) {
      const offerDescription = new RTCSessionDescription(callData.offer)
      await pc.current.setRemoteDescription(offerDescription)
    }

    const answerDescription = await pc.current.createAnswer()
    await pc.current.setLocalDescription(answerDescription)

    const answer = { type: answerDescription.type, sdp: answerDescription.sdp }
    await updateDoc(callDocRef, { answer, status: "accepted" })
    return "accepted"
  }, [callId, callStatus, isCaller])

  const handleAcceptCall = useCallback(() => {
    void attemptAcceptCall().then((result) => {
      if (result === "offer-missing") {
        toast.info("Đang thiết lập cuộc gọi, vui lòng chờ...")
      }
    })
  }, [attemptAcceptCall])

  useEffect(() => {
    if (!isAutoAcceptEnabled || !isReceiver || isCaller || !localStream) {
      return
    }

    if (callStatus !== "pending" && callStatus !== "connecting") {
      return
    }

    if (isAutoAcceptInProgressRef.current) {
      return
    }

    let isCancelled = false
    isAutoAcceptInProgressRef.current = true

    const autoAcceptWithRetry = async () => {
      for (let attempt = 0; attempt < AUTO_ACCEPT_MAX_RETRIES; attempt += 1) {
        if (isCancelled) {
          isAutoAcceptInProgressRef.current = false
          return
        }

        const result = await attemptAcceptCall()

        if (result === "accepted" || result === "skip") {
          isAutoAcceptInProgressRef.current = false
          return
        }

        await new Promise((resolve) => {
          setTimeout(resolve, AUTO_ACCEPT_RETRY_INTERVAL_MS)
        })
      }

      isAutoAcceptInProgressRef.current = false

      if (!isCancelled) {
        toast.error("Không thể bắt máy. Vui lòng thử lại cuộc gọi.")
      }
    }

    void autoAcceptWithRetry()

    return () => {
      isCancelled = true
      isAutoAcceptInProgressRef.current = false
    }
  }, [attemptAcceptCall, callStatus, isAutoAcceptEnabled, isCaller, isReceiver, localStream])

  const switchToVideo = useCallback(async () => {
    if (!CALL_FEATURE_FLAGS.enableAudioToVideoUpgrade) {
      return
    }

    if (!localStreamRef.current || !pc.current || !callId) return

    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
      const videoTrack = videoStream.getVideoTracks()[0]
      if (!videoTrack) {
        toast.error("Không tìm thấy video track")
        return
      }

      const sender = pc.current.getSenders().find((s) => s.track?.kind === "video")
      if (sender) {
        await queueReplaceTrack(sender, videoTrack)
      } else {
        pc.current.addTrack(videoTrack, localStreamRef.current)
      }

      const newLocalStream = new MediaStream()
      localStreamRef.current.getAudioTracks().forEach((track) => newLocalStream.addTrack(track))
      newLocalStream.addTrack(videoTrack)

      localStreamRef.current
        .getVideoTracks()
        .filter((track) => track.id !== videoTrack.id)
        .forEach((track) => track.stop())

      localStreamRef.current = newLocalStream
      setLocalStream(newLocalStream)
      setCallType("video")

      await updateDoc(doc(db, "calls", callId), { callType: "video" })
    } catch (error) {
      toast.error("Không thể bật camera: " + getErrorMessage(error))
    }
  }, [callId, queueReplaceTrack])

  const handleFilteredStreamChange = useCallback(
    async (filteredStream: MediaStream | null) => {
      if (!pc.current) {
        return
      }

      try {
        const videoSender = pc.current.getSenders().find((sender) => sender.track?.kind === "video")

        if (!videoSender) {
          return
        }

        if (filteredStream) {
          const filteredTrack = filteredStream.getVideoTracks()[0]
          if (!filteredTrack) {
            return
          }

          await queueReplaceTrack(videoSender, filteredTrack)

          if (filteredStreamRef.current && filteredStreamRef.current !== filteredStream) {
            stopStreamTracks(filteredStreamRef.current)
          }

          filteredStreamRef.current = filteredStream
          return
        }

        const originalTrack = localStreamRef.current?.getVideoTracks()[0] || null
        await queueReplaceTrack(videoSender, originalTrack)

        if (filteredStreamRef.current) {
          stopStreamTracks(filteredStreamRef.current)
          filteredStreamRef.current = null
        }
      } catch (error) {
        console.error("🔄 [Call] Failed to replace video track:", error)
      }
    },
    [queueReplaceTrack, stopStreamTracks]
  )

  if (!callId || !chatId || !callerId || !receiverId) {
    return (
      <div className='flex items-center justify-center h-svh bg-slate-900 text-white'>
        <p>Cuộc gọi không hợp lệ</p>
      </div>
    )
  }

  // Render appropriate UI based on call type
  if (callType === "audio") {
    return (
      <AudioCallUI
        localStream={localStream}
        remoteStream={remoteStream}
        callerName={remoteUserInfo.name}
        callerAvatar={remoteUserInfo.avatar}
        callStatus={callStatus}
        onHangUp={hangUp}
        onSwitchToVideo={CALL_FEATURE_FLAGS.enableAudioToVideoUpgrade ? switchToVideo : undefined}
        onAccept={handleAcceptCall}
        showAcceptButton={isReceiver && !isAutoAcceptEnabled}
      />
    )
  }

  return (
    <VideoCallUI
      localStream={localStream}
      remoteStream={remoteStream}
      callStatus={callStatus}
      callerName={remoteUserInfo.name}
      callerAvatar={remoteUserInfo.avatar}
      onHangUp={hangUp}
      onAccept={handleAcceptCall}
      showAcceptButton={isReceiver && !isAutoAcceptEnabled}
      onFilteredStreamChange={handleFilteredStreamChange}
    />
  )
}

export default Call
