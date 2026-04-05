import { onAuthStateChanged } from "firebase/auth"
import { useEffect } from "react"
import { BrowserRouter, Route, Routes } from "react-router"
import { ToastContainer } from "react-toastify"

import { IncomingCallOverlay } from "~/components/call/incoming-call-overlay"
import { ProtectedRoute } from "~/components/layouts/protected-route"
import { TestDiv } from "~/components/test/test-div"
import { useGlobalCallListener } from "~/hooks"
import { auth } from "~/libs"
import { CallPages, HomePage, LoginPages, SheetDemo, SignUpPage } from "~/pages"
import { useUserStore } from "~/stores"

export default function App() {
  const fetchUserInfo = useUserStore((state) => state.fetchUserInfo)
  const currentUser = useUserStore((state) => state.currentUser)

  const { incomingCall, acceptCall, declineCall } = useGlobalCallListener(currentUser?.id)

  useEffect(() => {
    const unSub = onAuthStateChanged(auth, (user) => {
      fetchUserInfo(user?.uid)
    })

    return () => {
      unSub()
    }
  }, [fetchUserInfo])

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path='/login' element={<LoginPages />} />
          <Route path='/signup' element={<SignUpPage />} />
          <Route
            path='/'
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route path='/call' element={<CallPages />} />
          <Route path='/test' element={<TestDiv />} />
          <Route path='/shadcn' element={<SheetDemo />} />
        </Routes>
      </BrowserRouter>

      {/* Global Incoming Call Overlay */}
      {incomingCall && (
        <IncomingCallOverlay
          callerName={incomingCall.callerName}
          callerAvatar={incomingCall.callerAvatar}
          callType={incomingCall.callType}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}

      <ToastContainer autoClose={3000} position='top-center' />
    </>
  )
}
