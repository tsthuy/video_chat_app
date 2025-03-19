import React, { memo, useLayoutEffect } from "react"
import { useNavigate } from "react-router"

import { Loader8 } from "~/components/loader/loader8"
import { useUserStore } from "~/stores/use-user.store"

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute = memo(({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate()
  const currentUser = useUserStore((state) => state.currentUser)
  const isLoading = useUserStore((state) => state.isLoading)
  useLayoutEffect(() => {
    if (!isLoading && !currentUser) {
      navigate("/login", { replace: true })
    }
  }, [currentUser, isLoading, navigate])
  if (isLoading)
    return (
      <div className='flex justify-center items-center h-svh'>
        <Loader8 />
      </div>
    )

  if (!currentUser) {
    return null
  }

  return <>{children}</>
})

export { ProtectedRoute }
