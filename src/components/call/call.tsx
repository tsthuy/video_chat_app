import { addDoc, collection, doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore"
import { useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"

import { db } from "~/lib/firebase"
import { useUserStore } from "~/stores/use-user.store"
import { getErrorMessage } from "~/utils"

const servers: RTCConfiguration = {
  iceServers: [
    { urls: "stun:freestun.net:3478" },
    { urls: "turn:freestun.net:3478", username: "free", credential: "free" }
  ],
  iceCandidatePoolSize: 5
}

const Call = () => {
  const { currentUser } = useUserStore()
  const [callId] = useState<string | null>(new URLSearchParams(window.location.search).get("callId"))
  const [chatId] = useState<string | null>(new URLSearchParams(window.location.search).get("chatId"))
  const [callerId] = useState<string | null>(new URLSearchParams(window.location.search).get("callerId"))
  const [receiverId] = useState<string | null>(new URLSearchParams(window.location.search).get("receiverId"))
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [callStatus, setCallStatus] = useState<string>("pending")

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const pc = useRef<RTCPeerConnection | null>(null)

  const isCaller = currentUser?.id === callerId

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  useEffect(() => {
    if (!callId || !chatId || !currentUser || !callerId || !receiverId) {
      console.error("Invalid call parameters", callId, chatId, currentUser, callerId, receiverId)
      return
    }

    const setupCall = async () => {
      try {
        const callDocRef = doc(db, "calls", callId)
        const callSnap = await getDoc(callDocRef)
        const callData = callSnap.data()
        if (!callData) {
          console.error("Call data not found")
          window.close()
          return
        }

        setCallStatus(callData.status || "pending")

        const offerCandidates = collection(callDocRef, "offerCandidates")
        const answerCandidates = collection(callDocRef, "answerCandidates")

        const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        setLocalStream(localStream)
        const remoteStream = new MediaStream()

        pc.current = new RTCPeerConnection(servers)
        localStream.getTracks().forEach((track) => {
          if (pc.current && pc.current.signalingState !== "closed") {
            pc.current.addTrack(track, localStream)
          }
        })

        pc.current.ontrack = (event) => {
          event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
          })
          setRemoteStream(remoteStream)
        }

        if (isCaller) {
          pc.current.onicecandidate = (event) => {
            if (event.candidate) {
              addDoc(offerCandidates, event.candidate.toJSON())
            }
          }

          const offerDescription = await pc.current.createOffer()
          await pc.current.setLocalDescription(offerDescription)

          const offer = { sdp: offerDescription.sdp, type: offerDescription.type }
          await setDoc(callDocRef, { offer, callerId, receiverId, status: "pending" }, { merge: true })

          onSnapshot(callDocRef, (snapshot) => {
            const data = snapshot.data()
            if (!pc.current?.currentRemoteDescription && data?.answer && data.status === "accepted") {
              const answerDescription = new RTCSessionDescription(data.answer)
              pc.current?.setRemoteDescription(answerDescription)
            }
            setCallStatus(data?.status || "pending")
            if (data?.status === "ended") window.close()
          })

          onSnapshot(answerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added") {
                const candidate = new RTCIceCandidate(change.doc.data())
                pc.current?.addIceCandidate(candidate)
              }
            })
          })
        } else {
          pc.current.onicecandidate = (event) => {
            if (event.candidate) {
              addDoc(answerCandidates, event.candidate.toJSON())
            }
          }

          onSnapshot(callDocRef, (snapshot) => {
            const data = snapshot.data()
            if (data?.offer && !pc.current?.remoteDescription && data.status === "pending") {
              const offerDescription = new RTCSessionDescription(data.offer)
              pc.current?.setRemoteDescription(offerDescription)
            }
            setCallStatus(data?.status || "pending")
            if (data?.status === "ended") window.close()
          })

          onSnapshot(offerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added") {
                const candidate = new RTCIceCandidate(change.doc.data())
                pc.current?.addIceCandidate(candidate)
              }
            })
          })
        }

        pc.current.onconnectionstatechange = () => {
          if (pc.current?.connectionState === "disconnected") {
            hangUp()
          }
        }
      } catch (error) {
        toast.error(getErrorMessage(error))
        window.close()
      }
    }

    setupCall()

    return () => {
      if (localStream) localStream.getTracks().forEach((track) => track.stop())
      if (remoteStream) remoteStream.getTracks().forEach((track) => track.stop())
      if (pc.current) pc.current.close()
    }
  }, [callId, chatId, currentUser, callerId, receiverId])

  const handleAcceptCall = async () => {
    if (!pc.current || !callId || isCaller || callStatus !== "pending") return

    const callDocRef = doc(db, "calls", callId)
    const callData = (await getDoc(callDocRef)).data()
    if (!callData?.offer) return

    const offerDescription = new RTCSessionDescription(callData.offer)
    await pc.current.setRemoteDescription(offerDescription)

    const answerDescription = await pc.current.createAnswer()
    await pc.current.setLocalDescription(answerDescription)

    const answer = { type: answerDescription.type, sdp: answerDescription.sdp }
    await updateDoc(callDocRef, { answer, status: "accepted" })
  }

  const hangUp = async () => {
    if (callId) {
      await updateDoc(doc(db, "calls", callId), { status: "ended" })
      window.close()
    }
    if (pc.current) pc.current.close()
    if (localStream) localStream.getTracks().forEach((track) => track.stop())
    if (remoteStream) remoteStream.getTracks().forEach((track) => track.stop())
  }

  if (!callId || !chatId || !callerId || !receiverId) return <p>Invalid call</p>

  return (
    <div className='flex flex-col h-svh p-4'>
      <h2 className='text-xl mb-4 text-center'>Video Call</h2>
      {callStatus === "pending" && <p className='text-center'>Connecting...</p>}

      <div className='flex flex-col sm:flex-row gap-4'>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className='sm:w-1/2 h-[30%] sm:h-full w-full  rounded-lg border'
        />
        <video ref={remoteVideoRef} autoPlay playsInline className='sm:w-1/2 w-full rounded-lg border justify-end' />
      </div>
      <div className='mt-4 flex justify-center gap-4'>
        {isCaller ? (
          <div>
            <button onClick={hangUp} className='px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600'>
              Hang Up
            </button>
          </div>
        ) : callStatus === "pending" && currentUser?.id === receiverId ? (
          <div className='flex gap-2'>
            <button onClick={handleAcceptCall} className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'>
              Accept
            </button>
            <button onClick={hangUp} className='px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600'>
              Reject
            </button>
          </div>
        ) : callStatus === "accepted" ? (
          <>
            <button onClick={hangUp} className='px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600'>
              Hang Up
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default Call
