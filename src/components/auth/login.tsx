import { Cat } from "lucide-react"
import { memo } from "react"

import { LoginForm } from "~/components/forms/login-form"

const Login = memo(() => {
  return (
    <>
      <div className='h-dvh items-center flex flex-col justify-center w-dvw'>
        <h1 className='font-bold text-xl text-[#0096FF] lg:text-3xl text-center flex justify-center items-center gap-2'>
          WELCOME TO VIDEO CHAT APP SYSTEM <Cat />
        </h1>
        <LoginForm />
      </div>
    </>
  )
})

export { Login }
