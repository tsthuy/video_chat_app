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
import { Copy, Ellipsis, VideoOff } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { db } from "~/lib/firebase"

const servers: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" }
  ],
  iceCandidatePoolSize: 10
}

// Component App
function TestCall() {
  const [currentPage, setCurrentPage] = useState<"home" | "create" | "join">("home")
  const [joinCode, setJoinCode] = useState<string>("")

  return (
    <div className='app'>
      {currentPage === "home" ? (
        <Menu joinCode={joinCode} setJoinCode={setJoinCode} setPage={setCurrentPage} />
      ) : (
        <Videos mode={currentPage} callId={joinCode} setPage={setCurrentPage} />
      )}
    </div>
  )
}

// Component Menu
interface MenuProps {
  joinCode: string
  setJoinCode: (code: string) => void
  setPage: (page: "home" | "create" | "join") => void
}

function Menu({ joinCode, setJoinCode, setPage }: MenuProps) {
  return (
    <div className='home'>
      <div className='create box'>
        <button onClick={() => setPage("create")}>Create Call</button>
      </div>
      <div className='answer box'>
        <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder='Join with code' />
        <button onClick={() => setPage("join")}>Answer</button>
      </div>
    </div>
  )
}

// Component Videos
interface VideosProps {
  mode: "create" | "join"
  callId: string
  setPage: (page: "home" | "create" | "join") => void
}

function Videos({ mode, callId, setPage }: VideosProps) {
  const [webcamActive, setWebcamActive] = useState<boolean>(false)
  const [roomId, setRoomId] = useState<string>(callId)

  const localRef = useRef<HTMLVideoElement>(null)
  const remoteRef = useRef<HTMLVideoElement>(null)
  const pc = useRef<RTCPeerConnection>(new RTCPeerConnection(servers))

  useEffect(() => {
    if (mode === "create" || (mode === "join" && callId)) {
      setupSources()
    }
  }, [mode, callId])

  const setupSources = async () => {
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })

      const remoteStream = new MediaStream()

      localStream.getTracks().forEach((track) => {
        pc.current.addTrack(track, localStream)
      })

      pc.current.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track)
        })
      }

      if (localRef.current) localRef.current.srcObject = localStream
      if (remoteRef.current) remoteRef.current.srcObject = remoteStream

      setWebcamActive(true)

      if (mode === "create") {
        const callDoc = doc(collection(db, "calls"))
        const offerCandidates = collection(callDoc, "offerCandidates")
        const answerCandidates = collection(callDoc, "answerCandidates")

        setRoomId(callDoc.id)

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

        await setDoc(callDoc, { offer })

        onSnapshot(callDoc, (snapshot) => {
          const data = snapshot.data()
          if (!pc.current.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer)
            pc.current.setRemoteDescription(answerDescription)
          }
        })

        onSnapshot(answerCandidates, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const candidate = new RTCIceCandidate(change.doc.data())
              pc.current.addIceCandidate(candidate)
            }
          })
        })
      } else if (mode === "join") {
        const callDoc = doc(db, "calls", callId)
        const offerCandidates = collection(callDoc, "offerCandidates")
        const answerCandidates = collection(callDoc, "answerCandidates")

        pc.current.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("candidate from remote", event.candidate)
            addDoc(answerCandidates, event.candidate.toJSON())
          }
        }

        const callData = (await getDoc(callDoc)).data()
        const offerDescription = callData?.offer
        if (offerDescription) {
          await pc.current.setRemoteDescription(new RTCSessionDescription(offerDescription))

          const answerDescription = await pc.current.createAnswer()
          await pc.current.setLocalDescription(answerDescription)

          const answer = {
            type: answerDescription.type,
            sdp: answerDescription.sdp
          }

          await updateDoc(callDoc, { answer })

          onSnapshot(offerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added") {
                const data = change.doc.data()
                pc.current.addIceCandidate(new RTCIceCandidate(data))
              }
            })
          })
        }
      }

      pc.current.onconnectionstatechange = () => {
        if (pc.current.connectionState === "disconnected") {
          hangUp()
        }
      }
    } catch (error) {
      console.error("Error setting up sources:", error)
    }
  }

  const hangUp = async () => {
    pc.current.close()

    if (roomId) {
      const roomRef = doc(db, "calls", roomId)
      const answerCandidates = collection(roomRef, "answerCandidates")
      const offerCandidates = collection(roomRef, "offerCandidates")

      const answerSnapshot = await getDocs(query(answerCandidates))
      const offerSnapshot = await getDocs(query(offerCandidates))

      answerSnapshot.forEach((doc) => deleteDoc(doc.ref))
      offerSnapshot.forEach((doc) => deleteDoc(doc.ref))

      await deleteDoc(roomRef)
    }

    window.location.reload()
  }

  return (
    <div className='videos'>
      <div className='flex'>
        <video ref={localRef} autoPlay playsInline className='local' muted />
        <video ref={remoteRef} autoPlay playsInline className='remote border' />
      </div>
      <div className='buttonsContainer'>
        <button onClick={hangUp} disabled={!webcamActive} className='hangup button'>
          <VideoOff />
        </button>
        <div tabIndex={0} role='button' className='more button'>
          <Ellipsis />
          <div className='popover'>
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomId)
              }}
            >
              <Copy /> Copy joining code
            </button>
          </div>
        </div>
      </div>

      {!webcamActive && (
        <div className='modalContainer'>
          <div className='modal'>
            <h3>Turn on your camera and microphone and start the call</h3>
            <div className='container'>
              <button onClick={() => setPage("home")} className='secondary'>
                Cancel
              </button>
              <button onClick={setupSources}>Start</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TestCall
