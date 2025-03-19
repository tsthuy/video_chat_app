"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { memo, useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router"
import { toast } from "react-toastify"
import * as z from "zod"

import { Loader8 } from "~/components/loader/loader8"
import { Button } from "~/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form"
import { Input } from "~/components/ui/input"
import { auth, db, googleProvider } from "~/lib/firebase"
import { useUserStore } from "~/stores/use-user.store"
import { getErrorMessage } from "~/utils"

const formSchema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1)
})

export const LoginForm = memo(function LoginForm() {
  const navigate = useNavigate()

  const fetchUserInfo = useUserStore((state) => state.fetchUserInfo)

  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema)
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true)
    try {
      const res = await signInWithEmailAndPassword(auth, values.email, values.password)

      await fetchUserInfo(res.user.uid)

      navigate("/")
      toast.success("Login Successfully!!!")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoginWithGoogle = async () => {
    setIsGoogleLoading(true)
    try {
      const res = await signInWithPopup(auth, googleProvider)
      const userRef = doc(db, "users", res.user.uid)
      const userChatsRef = doc(db, "userchats", res.user.uid)

      const userDocSnap = await getDoc(userRef)

      if (!userDocSnap.exists()) {
        await setDoc(userRef, {
          username: res.user.displayName || "Anonymous",
          email: res.user.email,
          avatar: res.user.photoURL || "https://via.placeholder.com/150",
          id: res.user.uid,
          blocked: []
        })

        await setDoc(userChatsRef, {
          chats: []
        })
      }
      navigate("/")

      toast.success("Login Successfully!!!")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8 py-10 min-w-[50%] lg:min-w-[40%]'>
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input disabled={isGoogleLoading || isLoading} placeholder='' type='' {...field} />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input disabled={isGoogleLoading || isLoading} placeholder='' type='password' {...field} />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />
        <div className='flex flex-col gap-4'>
          <Button disabled={isGoogleLoading || isLoading} className='py-5 ' type='submit'>
            {isLoading && <Loader8 />}Login
          </Button>
          <Button onClick={handleLoginWithGoogle} disabled={isGoogleLoading || isLoading} className='py-5'>
            <img src='/images/google.png' alt='Login with Google' />
            {isGoogleLoading && <Loader8 />}Login with Google
          </Button>
          <p className='text-right '>
            You dont have an account?{" "}
            <Link className='text-blue-700 hover:underline' to={"/signup"}>
              Create an account
            </Link>
          </p>
        </div>
      </form>
    </Form>
  )
})
