import { onAuthStateChanged } from "firebase/auth"
import { useEffect, useRef } from "react"
import { BrowserRouter, Route, Routes } from "react-router"
import { ToastContainer } from "react-toastify"

import { IncomingCallOverlay } from "~/components/call/incoming-call-overlay"
import { ProtectedRoute } from "~/components/layouts/protected-route"
import { TestDiv } from "~/components/test/test-div"
import { useGlobalCallListener, useUnreadCount } from "~/hooks"
import { auth } from "~/libs"
import { CallPages, HomePage, LoginPages, SheetDemo, SignUpPage } from "~/pages"
import { useUserStore } from "~/stores"
import { resetFavicon, updateDocumentTitle, updateFaviconBadge } from "~/utils"

const ORIGINAL_TITLE = "Video Chat App"

export default function App() {
  const fetchUserInfo = useUserStore((state) => state.fetchUserInfo)
  const currentUser = useUserStore((state) => state.currentUser)

  const { unreadCount } = useUnreadCount(currentUser?.id)
  const { incomingCall, acceptCall, declineCall } = useGlobalCallListener(currentUser?.id)

  const lastUnreadCount = useRef(0)

  useEffect(() => {
    const unSub = onAuthStateChanged(auth, (user) => {
      fetchUserInfo(user?.uid)
    })

    return () => {
      unSub()
    }
  }, [fetchUserInfo])

  useEffect(() => {
    if (unreadCount !== lastUnreadCount.current) {
      lastUnreadCount.current = unreadCount
    }

    if (unreadCount > 0) {
      updateFaviconBadge(unreadCount)
      updateDocumentTitle(unreadCount, ORIGINAL_TITLE)
    } else {
      resetFavicon()
      document.title = ORIGINAL_TITLE
    }

    return () => {
      resetFavicon()
      document.title = ORIGINAL_TITLE
    }
  }, [unreadCount])

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
