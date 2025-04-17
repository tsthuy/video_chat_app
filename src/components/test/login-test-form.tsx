"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "react-toastify"
import * as z from "zod"

import { Checkbox } from "~/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form"
import { Input } from "~/components/ui/input"

const formSchema = z.object({
  email: z.string(),
  password: z.string().min(1),
  remember: z.boolean().default(true).optional()
})

export default function LoginTestForm() {
  const [isShowPassword, setIsShowPassword] = useState<boolean>(false)
  const [isShowEmail, setIsShowEmail] = useState<boolean>(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema)
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      console.log(values)
    } catch (error) {
      console.error("Form submission error", error)
      toast.error("Failed to submit the form. Please try again.")
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6 mx-auto py-10'>
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <div className='relative'>
                  <Input
                    className='bg-[#fff3ed] py-6'
                    placeholder='********'
                    type={isShowEmail ? "email" : "password"}
                    {...field}
                  />

                  <button
                    onClick={() => setIsShowEmail(!isShowEmail)}
                    className='absolute top-1/2 -translate-y-1/2 right-3'
                  >
                    {isShowEmail ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='mb-4'>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className='relative'>
                  <Input
                    className='bg-[#fff3ed] py-6'
                    placeholder='********'
                    type={isShowPassword ? "text" : "password"}
                    {...field}
                  />
                  <button
                    onClick={() => setIsShowPassword(!isShowPassword)}
                    type='button'
                    className='absolute right-3 top-1/2 transform -translate-y-1/2'
                  >
                    {isShowPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <div className='flex items-center justify-between'>
          <FormField
            control={form.control}
            name='remember'
            render={({ field }) => (
              <FormItem className='flex items-center space-x-2'>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className='
                      w-5 h-5 
                    '
                  />
                </FormControl>
                <FormLabel className='text-sm font-normal cursor-pointer'>Remember me</FormLabel>
              </FormItem>
            )}
          />
          <a href='#' className='text-sm text-gray-500 hover:underline'>
            Forgot password?
          </a>
        </div>

        <div className=''>
          <button className="w-full rounded-full text-white h-14 bg-[url('/images/button.png')] bg-cover bg-no-repeat bg-center ">
            Sign in
          </button>
        </div>

        <div className=' w-[80%] mx-auto flex items-center'>
          <div className='flex-grow border border-gray-300'></div>
          <span className='flex-shrink mx-4 text-gray-600'>Or</span>
          <div className='flex-grow border border-gray-300'></div>
        </div>

        <div className=''>
          <button className='bg-[#fff3ed] rounded-md w-full p-3 flex justify-center gap-2'>
            <img src='/images/google1.png' alt='Google' className='w-6 h-6' />
            <span className='font-semibold'>Google</span>
          </button>
        </div>
      </form>
    </Form>
  )
}
