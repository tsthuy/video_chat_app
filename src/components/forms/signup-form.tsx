"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { ImageUp, X } from "lucide-react"
import { memo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router"
import { toast } from "react-toastify"
import * as z from "zod"

import { Loader8 } from "~/components/loader/loader8"
import { Button } from "~/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form"
import { Input } from "~/components/ui/input"
import { auth, db } from "~/lib/firebase"
import { useUserStore } from "~/stores/use-user.store"
import { getErrorMessage } from "~/utils"
import { upload } from "~/utils"

const formSchema = z.object({
  display_name: z.string().min(1),
  email: z.string().min(1).email(),
  password: z.string().min(1)
})

export const SignUpForm = memo(function LoginForm() {
  const navigate = useNavigate()

  const [avatar, setAvatar] = useState<{ file: File | null; url: string }>({
    file: null,
    url: ""
  })

  const fetchUserInfo = useUserStore((state) => state.fetchUserInfo)

  const [loading, setLoading] = useState<boolean>()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      display_name: "",
      email: "",
      password: ""
    }
  })

  const handleAddAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatar({
        file,
        url: URL.createObjectURL(file)
      })
    }
  }

  const handleRemoveImage = () => {
    setAvatar({
      file: null,
      url: ""
    })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!avatar.file) return toast.warn("Please upload an avatar!")
    setLoading(true)

    try {
      const res = await createUserWithEmailAndPassword(auth, values.email, values.password)

      const imgUrl = await upload(avatar.file)
      console.log(imgUrl, values.display_name)
      await setDoc(doc(db, "users", res.user.uid), {
        username: values.display_name,
        email: values.email,
        avatar: imgUrl,
        id: res.user.uid,
        blocked: []
      })

      await setDoc(doc(db, "userchats", res.user.uid), {
        chats: []
      })
      await fetchUserInfo(res.user.uid)

      toast.success("Login Successfully!!!")
      navigate("/")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8 py-10 min-w-[50%] lg:min-w-[40%]'>
        <FormField
          control={form.control}
          name='display_name'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='gap-0'>
                Name<span className='text-red-700'>*</span>
              </FormLabel>
              <FormControl>
                <Input disabled={loading} placeholder='' type='' {...field} />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='gap-0'>
                Email<span className='text-red-700'>*</span>
              </FormLabel>
              <FormControl>
                <Input disabled={loading} placeholder='' type='' {...field} />
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
              <FormLabel className='gap-0'>
                Password<span className='text-red-700'>*</span>
              </FormLabel>
              <FormControl>
                <Input disabled={loading} placeholder='' type='password' {...field} />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <label className='py-2  hover:cursor-pointer flex items-center ' htmlFor='file'>
          <ImageUp className='size-5 mr-1' />
          Choose your avatars <span className='text-red-700'>*</span>
        </label>
        <input
          disabled={loading}
          className='hidden'
          type='file'
          id='file'
          ref={fileInputRef}
          accept='image/*'
          onChange={(e) => {
            handleAddAvatar(e)
          }}
        />

        {avatar.url && (
          <div className='mt-2 relative max-w-fit'>
            <img src={avatar.url} alt='Avatar preview' className='w-24 h-24 object-cover rounded-full' />
            <button className=''>
              <X onClick={handleRemoveImage} className='absolute text-white bg-red-600 rounded-2xl top-0 left-0' />
            </button>
          </div>
        )}

        <div className='flex flex-col gap-4'>
          <Button disabled={loading} className='py-5 ' type='submit'>
            {loading && <Loader8 />}
            Sign Up
          </Button>
          <p className='text-right'>
            Already got a account?
            <Link className='underline text-blue-700 pl-2' to={"/login"}>
              Login
            </Link>
          </p>
        </div>
      </form>
    </Form>
  )
})
