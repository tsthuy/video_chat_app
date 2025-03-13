import { onAuthStateChanged } from "firebase/auth"
import { useEffect } from "react"
import { BrowserRouter, Route, Routes } from "react-router"
import { ToastContainer } from "react-toastify"

import { ProtectedRoute } from "~/components/layouts/protected-route"
import { auth } from "~/lib/firebase"
import { HomePage } from "~/pages/home"
import { LoginPages } from "~/pages/login"
import { SignUpPage } from "~/pages/signup"
import { useUserStore } from "~/stores/use-user.store"

export default function App() {
  const fetchUserInfo = useUserStore((state) => state.fetchUserInfo)
  const currentUser = useUserStore((state) => state.currentUser)

  useEffect(() => {
    const unSub = onAuthStateChanged(auth, (user) => {
      fetchUserInfo(user?.uid)
    })

    return () => {
      unSub()
    }
  }, [fetchUserInfo])

  console.log(currentUser)
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
        </Routes>
      </BrowserRouter>
      <ToastContainer position='top-center' />
    </>
  )
}
