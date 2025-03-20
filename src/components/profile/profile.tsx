import "yet-another-react-lightbox/styles.css"
import "yet-another-react-lightbox/plugins/thumbnails.css"

import { doc, onSnapshot } from "firebase/firestore"
import { useEffect, useRef, useState } from "react"
import Lightbox from "yet-another-react-lightbox"
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails"
import Video from "yet-another-react-lightbox/plugins/video"
import Zoom from "yet-another-react-lightbox/plugins/zoom"

import { Loader8 } from "~/components/loader/loader8"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion"
import { Button } from "~/components/ui/button"
import { db } from "~/lib/firebase"
import { useChatStore } from "~/stores"

interface ProfileProps {
  user: User | null
  group: UserChatItem
}

const PAGE_SIZE = {
  imagesAndVideos: 2,
  files: 2,
  audios: 2
}

const Profile = ({ user, group }: ProfileProps) => {
  console.log(user, group)
  const chatId = useChatStore((state) => state.chatId)
  const [chatData, setChatData] = useState<ChatData | null>(null)
  const [imagesAndVideos, setImagesAndVideos] = useState<Message[]>([])
  const [files, setFiles] = useState<Message[]>([])
  const [audios, setAudios] = useState<Message[]>([])
  const [imagePage, setImagePage] = useState(1)
  const [filePage, setFilePage] = useState(1)
  const [audioPage, setAudioPage] = useState(1)
  const [hasMoreImages, setHasMoreImages] = useState(true)
  const [hasMoreFiles, setHasMoreFiles] = useState(true)
  const [hasMoreAudios, setHasMoreAudios] = useState(true)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chatId) return

    setIsLoading(true)
    const chatRef = doc(db, "chats", chatId)
    const unsubscribe = onSnapshot(
      chatRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setChatData(snapshot.data() as ChatData)
        }
        setIsLoading(false)
      },
      (error) => {
        console.error("Error fetching chat data:", error)
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [chatId])

  useEffect(() => {
    if (!chatData?.messages) return

    // Sắp xếp messages theo createdAt (mới nhất trước)
    const sortedMessages = [...chatData.messages].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())

    // Images and Videos
    const allImagesAndVideos = sortedMessages.filter((msg) => msg.type === "image" || msg.type === "video")
    const initialImages = allImagesAndVideos.slice(0, PAGE_SIZE.imagesAndVideos * imagePage)
    console.log("initialImages", initialImages)
    console.log("filePages", imagePage)
    setImagesAndVideos(initialImages)
    setHasMoreImages(initialImages.length < allImagesAndVideos.length)

    // Files
    const allFiles = sortedMessages.filter((msg) => msg.type === "file")
    const initialFiles = allFiles.slice(0, PAGE_SIZE.files * filePage)
    setFiles(initialFiles)
    setHasMoreFiles(initialFiles.length < allFiles.length)

    // Audios
    const allAudios = sortedMessages.filter((msg) => msg.type === "audio")
    const initialAudios = allAudios.slice(0, PAGE_SIZE.audios * audioPage)
    setAudios(initialAudios)
    setHasMoreAudios(initialAudios.length < allAudios.length)
  }, [chatData, imagePage, filePage, audioPage])

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && (hasMoreImages || hasMoreFiles || hasMoreAudios)) {
          loadMoreData()
        }
      },
      { threshold: 0.1 }
    )

    observerRef.current.observe(loadMoreRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMoreImages, hasMoreFiles, hasMoreAudios])

  const loadMoreData = () => {
    if (hasMoreImages) setImagePage((prev) => prev + 1)
    if (hasMoreFiles) setFilePage((prev) => prev + 1)
    if (hasMoreAudios) setAudioPage((prev) => prev + 1)
  }

  const lightboxSlides = imagesAndVideos.map((msg) => {
    const isVideo = msg.type === "video"
    return isVideo
      ? { type: "video" as const, sources: [{ src: msg.img!, type: "video/mp4" }] }
      : { src: msg.img!, width: 800, height: 800 }
  })

  const handleImageClick = (index: number) => {
    setPhotoIndex(index)
    setIsLightboxOpen(true)
  }

  return (
    <div className='border-l border-gray-200 h-full flex flex-col min-w-[344px] w-[344px]'>
      <div className='flex items-center justify-center border-b min-h-[70px] px-2'>
        <h2 className='text-center font-medium'>Chat Information</h2>
      </div>

      <div className='flex-1 p-4 overflow-y-auto'>
        {isLoading ? (
          <div className='flex justify-center mb-4'>
            <Loader8 />
          </div>
        ) : (
          <Accordion type='single' collapsible className='w-full' defaultValue='images-and-videos'>
            {/* Ảnh & Video */}
            <AccordionItem value='images-and-videos'>
              <AccordionTrigger>Ảnh & Video</AccordionTrigger>
              <AccordionContent>
                <div className='grid grid-cols-3 gap-2'>
                  {imagesAndVideos.map((msg, index) => (
                    <div key={msg.createdAt} onClick={() => handleImageClick(index)} className='cursor-pointer'>
                      {msg.type === "video" ? (
                        <video src={msg.img} className='w-full h-[80px] object-cover rounded-lg' muted />
                      ) : (
                        <img src={msg.img} alt='media' className='w-full h-[80px] object-cover rounded-lg' />
                      )}
                    </div>
                  ))}
                </div>
                {hasMoreImages && (
                  <Button variant='link' className='mt-2' onClick={loadMoreData}>
                    Xem thêm
                  </Button>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* File */}
            <AccordionItem value='files'>
              <AccordionTrigger>File</AccordionTrigger>
              <AccordionContent>
                <div className='space-y-2'>
                  {files.map((msg) => (
                    <a
                      key={msg.createdAt.toMillis()}
                      href={msg.file}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-500 underline block truncate'
                    >
                      {msg.file?.split("/").pop()}
                    </a>
                  ))}
                </div>
                {hasMoreFiles && (
                  <Button variant='link' className='mt-2' onClick={loadMoreData}>
                    Xem thêm
                  </Button>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Audio */}
            <AccordionItem value='audios'>
              <AccordionTrigger>Audio</AccordionTrigger>
              <AccordionContent>
                <div className='space-y-2'>
                  {audios.map((msg) => (
                    <audio key={msg.createdAt.toMillis()} src={msg.audio} controls className='w-full' />
                  ))}
                </div>
                {hasMoreAudios && (
                  <Button variant='link' className='mt-2' onClick={loadMoreData}>
                    Xem thêm
                  </Button>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {isLightboxOpen && (
          <Lightbox
            open={isLightboxOpen}
            close={() => setIsLightboxOpen(false)}
            slides={lightboxSlides}
            index={photoIndex}
            plugins={[Thumbnails, Video, Zoom]}
            zoom={{
              maxZoomPixelRatio: 3,
              zoomInMultiplier: 2,
              doubleClickDelay: 300,
              doubleTapDelay: 300,
              doubleClickMaxStops: 2
            }}
            styles={{
              root: {
                backgroundColor: "rgba(0, 0, 0, 0.5)"
              },
              container: {
                height: "90%",
                width: "90%",
                margin: "auto",
                borderRadius: "10px",
                maxWidth: "1200px"
              },
              toolbar: {
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                color: "white"
              },
              navigationPrev: { color: "white" },
              navigationNext: { color: "white" }
            }}
          />
        )}

        <div ref={loadMoreRef} className='h-1' />
      </div>
    </div>
  )
}

export { Profile }
