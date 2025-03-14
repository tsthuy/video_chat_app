import { AspectRatio } from "~/components/ui/aspect-ratio"

export function AspectRatioDemo() {
  return (
    <div className='w-[450px]'>
      <AspectRatio ratio={1 / 1} className='bg-muted'>
        <img
          src='https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80'
          alt='Photo by Drew Beamer'
          className='h-full w-full rounded-md object-cover'
        />
      </AspectRatio>
    </div>
  )
}
