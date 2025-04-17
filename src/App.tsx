import { onAuthStateChanged } from "firebase/auth"
import { useEffect } from "react"
import { BrowserRouter, Route, Routes } from "react-router"
import { ToastContainer } from "react-toastify"

import { ProtectedRoute } from "~/components/layouts/protected-route"
import { TestDiv } from "~/components/test/test-div"
import { auth } from "~/libs"
import { CallPages } from "~/pages"
import { HomePage } from "~/pages"
import { LoginPages } from "~/pages"
import { SheetDemo } from "~/pages"
import { SignUpPage } from "~/pages"
import { useUserStore } from "~/stores"

export default function App() {
  const fetchUserInfo = useUserStore((state) => state.fetchUserInfo)

  useEffect(() => {
    const unSub = onAuthStateChanged(auth, (user) => {
      console.log("user", user)
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
      <ToastContainer autoClose={3000} position='top-center' />
    </>
  )
}
