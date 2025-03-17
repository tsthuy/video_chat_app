"use client"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc
} from "firebase/firestore"
import { useEffect, useRef, useState } from "react"

import { db } from "~/lib/firebase"
import { useUserStore } from "~/stores/use-user.store"

const servers: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" }
  ],
  iceCandidatePoolSize: 10
}

const Call = () => {
  const { currentUser } = useUserStore()
  const [callId] = useState<string | null>(new URLSearchParams(window.location.search).get("callId"))
  const [chatId] = useState<string | null>(new URLSearchParams(window.location.search).get("chatId"))
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isCaller, setIsCaller] = useState<boolean>(false)
  const [callStatus, setCallStatus] = useState<string>("pending")

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const pc = useRef<RTCPeerConnection | null>(null)

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
    if (!callId || !chatId || !currentUser) {
      console.error("Invalid call parameters or user not found")
      return
    }

    const setupSources = async () => {
      try {
        const callDocRef = doc(db, "calls", callId)
        const callSnap = await getDoc(callDocRef)
        const callData = callSnap.data()
        if (!callData) {
          console.error("Call data not found")
          return
        }

        const isCallerLocal = callData.callerId === currentUser.id
        setIsCaller(isCallerLocal)
        setCallStatus(callData.status || "pending")

        const offerCandidates = collection(callDocRef, "offerCandidates")
        const answerCandidates = collection(callDocRef, "answerCandidates")

        const localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })
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

        if (localVideoRef.current) localVideoRef.current.srcObject = localStream
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream

        if (isCallerLocal) {
          pc.current.onicecandidate = (event) => {
            if (event.candidate) {
              addDoc(offerCandidates, event.candidate.toJSON())
            }
          }

          const offerDescription = await pc.current.createOffer()
          await pc.current.setLocalDescription(offerDescription)

          const offer = {
            sdp: offerDescription.sdp,
            type: offerDescription.type
          }
          await setDoc(callDocRef, { offer, callerId: currentUser.id, status: "pending" }, { merge: true })

          onSnapshot(callDocRef, (snapshot) => {
            const data = snapshot.data()
            if (!pc.current?.currentRemoteDescription && data?.answer && data.status === "accepted") {
              const answerDescription = new RTCSessionDescription(data.answer)
              pc.current?.setRemoteDescription(answerDescription)
            }
            setCallStatus(data?.status || "pending")
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
              console.log("Candidate from remote:", event.candidate)
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
        console.error("Error setting up sources:", error)
      }
    }

    setupSources()

    return () => {
      if (localStream) localStream.getTracks().forEach((track) => track.stop())
      if (remoteStream) remoteStream.getTracks().forEach((track) => track.stop())
      if (pc.current) pc.current.close()
    }
  }, [callId, chatId, currentUser])

  const handleAcceptCall = async () => {
    if (!pc.current || !callId || isCaller || callStatus !== "pending") return

    const callDocRef = doc(db, "calls", callId)
    const callData = (await getDoc(callDocRef)).data()
    if (!callData?.offer) return

    const offerDescription = new RTCSessionDescription(callData.offer)
    await pc.current.setRemoteDescription(offerDescription)

    const answerDescription = await pc.current.createAnswer()
    await pc.current.setLocalDescription(answerDescription)

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp
    }
    await updateDoc(callDocRef, { answer, status: "accepted" })
  }

  const handleRejectCall = async () => {
    if (!callId) return
    await updateDoc(doc(db, "calls", callId), { status: "ended" })
    hangUp()
  }

  const hangUp = async () => {
    if (pc.current) pc.current.close()

    if (callId) {
      const roomRef = doc(db, "calls", callId)
      const answerCandidates = collection(roomRef, "answerCandidates")
      const offerCandidates = collection(roomRef, "offerCandidates")

      const answerSnapshot = await getDocs(query(answerCandidates))
      const offerSnapshot = await getDocs(query(offerCandidates))

      answerSnapshot.forEach((doc) => deleteDoc(doc.ref))
      offerSnapshot.forEach((doc) => deleteDoc(doc.ref))
      await deleteDoc(roomRef)
    }

    if (localStream) localStream.getTracks().forEach((track) => track.stop())
    if (remoteStream) remoteStream.getTracks().forEach((track) => track.stop())
    window.location.reload()
  }

  if (!callId || !chatId) return <p>Invalid call</p>

  return (
    <div className='flex flex-col h-screen p-4'>
      <h2 className='text-xl mb-4'>Video Call</h2>
      <div className='flex flex-1 gap-4'>
        <video ref={localVideoRef} autoPlay playsInline muted className='w-1/2 rounded-lg border' />
        <video ref={remoteVideoRef} autoPlay playsInline className='w-1/2 rounded-lg border' />
      </div>
      <div className='mt-4 flex justify-center gap-4'>
        {callStatus === "pending" && !isCaller && (
          <>
            <button onClick={handleAcceptCall} className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'>
              Chấp nhận
            </button>
            <button onClick={handleRejectCall} className='px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600'>
              Từ chối
            </button>
          </>
        )}
        <button onClick={hangUp} className='px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600'>
          Hủy cuộc gọi
        </button>
      </div>
    </div>
  )
}

export default Call
