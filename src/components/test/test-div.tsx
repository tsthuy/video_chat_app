import LoginTestForm from "~/components/test/login-test-form"

export const TestDiv = () => {
  return (
    <>
      <div className='bg-[#fff3ed] h-screen w-full flex justify-center items-center px-4'>
        <div className='h-full flex justify-center items-center'>
          <img className='object-contain h-[90%] w-full' src='/images/login.png' alt='' />
        </div>
        <div className="bg-[url('/images/background.png')] border min-w-[592px] h-[673px] bg-no-repeat bg-cover flex justify-center items-center">
          <div className='w-[85%] h-[85%] flex flex-col items-center'>
            <div className='flex flex-col gap-5 items-center'>
              <div className=''>
                <img src='/images/logo.png' alt='' />
              </div>
              <div className=''>
                <img src='/images/text-logo.png' alt='' />
              </div>
            </div>

            <div className='w-full'>
              <LoginTestForm />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
