/* eslint-disable @typescript-eslint/no-explicit-any */
import "yet-another-react-lightbox/styles.css"
import "yet-another-react-lightbox/plugins/thumbnails.css"

import { collection, getDocs, limit, orderBy, query, startAfter, where } from "firebase/firestore"
import { ArrowLeft } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import Lightbox from "yet-another-react-lightbox"
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails"
import Video from "yet-another-react-lightbox/plugins/video"
import Zoom from "yet-another-react-lightbox/plugins/zoom"

import { Loader8 } from "~/components/loader/loader8"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion"
import { Button } from "~/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { db } from "~/lib/firebase"
import { useChatStore } from "~/stores"

const INITIAL_DISPLAY_SIZE = 6
const FETCH_SIZE = 50

const Profile = () => {
  const chatId = useChatStore((state) => state.chatId)
  const [imagesAndVideos, setImagesAndVideos] = useState<Message[]>([])
  const [files, setFiles] = useState<Message[]>([])
  const [audios, setAudios] = useState<Message[]>([])
  const [lastVisibleImage, setLastVisibleImage] = useState<any>(null)
  const [lastVisibleFile, setLastVisibleFile] = useState<any>(null)
  const [lastVisibleAudio, setLastVisibleAudio] = useState<any>(null)
  const [hasMoreImages, setHasMoreImages] = useState(true)
  const [hasMoreFiles, setHasMoreFiles] = useState(true)
  const [hasMoreAudios, setHasMoreAudios] = useState(true)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isTabView, setIsTabView] = useState(false)
  const [activeTab, setActiveTab] = useState<"imagesAndVideos" | "files" | "audios">("imagesAndVideos")
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Fetch initial 50 items for each type
  useEffect(() => {
    if (!chatId) return

    const fetchInitialData = async () => {
      setIsLoading(true)

      const messagesRef = collection(db, "chats", chatId, "messages")

      try {
        // Fetch images and videos
        const imagesQuery = query(
          messagesRef,
          orderBy("createdAt", "desc"),
          limit(FETCH_SIZE),
          where("type", "in", ["image", "video"])
        )
        const imagesSnapshot = await getDocs(imagesQuery)
        const initialImages = imagesSnapshot.docs.map((doc) => doc.data() as Message).reverse()
        setImagesAndVideos(initialImages)
        setLastVisibleImage(imagesSnapshot.docs[imagesSnapshot.docs.length - 1])
        setHasMoreImages(imagesSnapshot.docs.length === FETCH_SIZE)

        // Fetch files
        const filesQuery = query(
          messagesRef,
          orderBy("createdAt", "desc"),
          limit(FETCH_SIZE),
          where("type", "==", "file")
        )
        const filesSnapshot = await getDocs(filesQuery)
        const initialFiles = filesSnapshot.docs.map((doc) => doc.data() as Message).reverse()
        setFiles(initialFiles)
        setLastVisibleFile(filesSnapshot.docs[filesSnapshot.docs.length - 1])
        setHasMoreFiles(filesSnapshot.docs.length === FETCH_SIZE)

        // Fetch audios
        const audiosQuery = query(
          messagesRef,
          orderBy("createdAt", "desc"),
          limit(FETCH_SIZE),
          where("type", "==", "audio")
        )
        const audiosSnapshot = await getDocs(audiosQuery)
        const initialAudios = audiosSnapshot.docs.map((doc) => doc.data() as Message).reverse()
        setAudios(initialAudios)
        setLastVisibleAudio(audiosSnapshot.docs[audiosSnapshot.docs.length - 1])
        setHasMoreAudios(audiosSnapshot.docs.length === FETCH_SIZE)
      } catch (error) {
        console.error("Error fetching initial data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchInitialData()
  }, [chatId])

  // Infinite scroll for the active tab
  useEffect(() => {
    if (!loadMoreRef.current || !isTabView) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (activeTab === "imagesAndVideos" && hasMoreImages) {
            fetchMoreImages()
          } else if (activeTab === "files" && hasMoreFiles) {
            fetchMoreFiles()
          } else if (activeTab === "audios" && hasMoreAudios) {
            fetchMoreAudios()
          }
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
  }, [activeTab, hasMoreImages, hasMoreFiles, hasMoreAudios, isTabView])

  const fetchMoreImages = async () => {
    if (!chatId || !lastVisibleImage) return

    const messagesRef = collection(db, "chats", chatId, "messages")
    const imagesQuery = query(
      messagesRef,
      orderBy("createdAt", "desc"),
      startAfter(lastVisibleImage),
      limit(FETCH_SIZE),
      where("type", "in", ["image", "video"])
    )

    const snapshot = await getDocs(imagesQuery)
    const moreImages = snapshot.docs.map((doc) => doc.data() as Message).reverse()
    setImagesAndVideos((prev) => [...prev, ...moreImages])
    setLastVisibleImage(snapshot.docs[snapshot.docs.length - 1])
    setHasMoreImages(snapshot.docs.length === FETCH_SIZE)
  }

  const fetchMoreFiles = async () => {
    if (!chatId || !lastVisibleFile) return

    const messagesRef = collection(db, "chats", chatId, "messages")
    const filesQuery = query(
      messagesRef,
      orderBy("createdAt", "desc"),
      startAfter(lastVisibleFile),
      limit(FETCH_SIZE),
      where("type", "==", "file")
    )

    const snapshot = await getDocs(filesQuery)
    const moreFiles = snapshot.docs.map((doc) => doc.data() as Message).reverse()
    setFiles((prev) => [...prev, ...moreFiles])
    setLastVisibleFile(snapshot.docs[snapshot.docs.length - 1])
    setHasMoreFiles(snapshot.docs.length === FETCH_SIZE)
  }

  const fetchMoreAudios = async () => {
    if (!chatId || !lastVisibleAudio) return

    const messagesRef = collection(db, "chats", chatId, "messages")
    const audiosQuery = query(
      messagesRef,
      orderBy("createdAt", "desc"),
      startAfter(lastVisibleAudio),
      limit(FETCH_SIZE),
      where("type", "==", "audio")
    )

    const snapshot = await getDocs(audiosQuery)
    const moreAudios = snapshot.docs.map((doc) => doc.data() as Message).reverse()
    setAudios((prev) => [...prev, ...moreAudios])
    setLastVisibleAudio(snapshot.docs[snapshot.docs.length - 1])
    setHasMoreAudios(snapshot.docs.length === FETCH_SIZE)
  }

  const handleViewMore = (type: "imagesAndVideos" | "files" | "audios") => {
    setIsTabView(true)
    setActiveTab(type)
  }

  const handleBackToAccordion = () => {
    setIsTabView(false)
  }

  const handleImageClick = (index: number) => {
    setPhotoIndex(index)
    setIsLightboxOpen(true)
  }

  const lightboxSlides = useMemo(() => {
    return imagesAndVideos.map((msg) => {
      const isVideo = msg.type === "video"
      return isVideo
        ? { type: "video" as const, sources: [{ src: msg.img!, type: "video/mp4" }] }
        : { src: msg.img!, width: 800, height: 800 }
    })
  }, [imagesAndVideos])

  return (
    <div className='border-l border-gray-200 h-full flex flex-col min-w-[344px] w-[344px]'>
      <div className='flex items-center border-b min-h-[70px] px-2'>
        {isTabView ? (
          <>
            <Button variant='ghost' onClick={handleBackToAccordion} className='p-2'>
              <ArrowLeft className='w-5 h-5' />
            </Button>
            <h2 className='flex-1 text-center font-medium'>Storages</h2>
          </>
        ) : (
          <h2 className='flex-1 text-center font-medium'>Chat Information</h2>
        )}
      </div>

      <div className='flex-1 p-4 overflow-y-auto'>
        {isLoading ? (
          <div className='flex justify-center mb-4'>
            <Loader8 />
          </div>
        ) : isTabView ? (
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "imagesAndVideos" | "files" | "audios")}
            className='w-full'
          >
            <TabsList className='grid w-full grid-cols-3'>
              <TabsTrigger value='imagesAndVideos'>Images/Video</TabsTrigger>
              <TabsTrigger value='files'>Files</TabsTrigger>
              <TabsTrigger value='audios'>Audios</TabsTrigger>
            </TabsList>

            <TabsContent value='imagesAndVideos'>
              {imagesAndVideos.length === 0 ? (
                <p className='text-center text-gray-500'>Không có hình ảnh hoặc video</p>
              ) : (
                <div className='grid grid-cols-3 gap-2'>
                  {imagesAndVideos.map((msg, index) => (
                    <div
                      key={msg.createdAt.toMillis()}
                      onClick={() => handleImageClick(index)}
                      className='cursor-pointer'
                    >
                      {msg.type === "video" ? (
                        <video src={msg.img} className='w-full h-[80px] object-cover rounded-lg' muted />
                      ) : (
                        <img src={msg.img} alt='media' className='w-full h-[80px] object-cover rounded-lg' />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div ref={loadMoreRef} className='h-1' />
            </TabsContent>

            <TabsContent value='files'>
              {files.length === 0 ? (
                <p className='text-center text-gray-500'>Không có file</p>
              ) : (
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
              )}
              <div ref={loadMoreRef} className='h-1' />
            </TabsContent>

            <TabsContent value='audios'>
              {audios.length === 0 ? (
                <p className='text-center text-gray-500'>Không có audio</p>
              ) : (
                <div className='space-y-2'>
                  {audios.map((msg) => (
                    <audio key={msg.createdAt.toMillis()} src={msg.audio} controls className='w-full' />
                  ))}
                </div>
              )}
              <div ref={loadMoreRef} className='h-1' />
            </TabsContent>
          </Tabs>
        ) : (
          <Accordion type='single' collapsible className='w-full' defaultValue='images-and-videos'>
            <AccordionItem value='images-and-videos'>
              <AccordionTrigger>Ảnh & Video</AccordionTrigger>
              <AccordionContent>
                {imagesAndVideos.length === 0 ? (
                  <p className='text-center text-gray-500'>Không có hình ảnh hoặc video</p>
                ) : (
                  <>
                    <div className='grid grid-cols-3 gap-2'>
                      {imagesAndVideos.slice(0, INITIAL_DISPLAY_SIZE).map((msg, index) => (
                        <div
                          key={msg.createdAt.toMillis()}
                          onClick={() => handleImageClick(index)}
                          className='cursor-pointer'
                        >
                          {msg.type === "video" ? (
                            <video src={msg.img} className='w-full h-[80px] object-cover rounded-lg' muted />
                          ) : (
                            <img src={msg.img} alt='media' className='w-full h-[80px] object-cover rounded-lg' />
                          )}
                        </div>
                      ))}
                    </div>
                    {imagesAndVideos.length > INITIAL_DISPLAY_SIZE && (
                      <Button variant='link' className='mt-2' onClick={() => handleViewMore("imagesAndVideos")}>
                        Xem thêm ({imagesAndVideos.length - INITIAL_DISPLAY_SIZE} mục)
                      </Button>
                    )}
                  </>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value='files'>
              <AccordionTrigger>File</AccordionTrigger>
              <AccordionContent>
                {files.length === 0 ? (
                  <p className='text-center text-gray-500'>Không có file</p>
                ) : (
                  <>
                    <div className='space-y-2'>
                      {files.slice(0, INITIAL_DISPLAY_SIZE).map((msg) => (
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
                    {files.length > INITIAL_DISPLAY_SIZE && (
                      <Button variant='link' className='mt-2' onClick={() => handleViewMore("files")}>
                        Xem thêm ({files.length - INITIAL_DISPLAY_SIZE} mục)
                      </Button>
                    )}
                  </>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value='audios'>
              <AccordionTrigger>Audio</AccordionTrigger>
              <AccordionContent>
                {audios.length === 0 ? (
                  <p className='text-center text-gray-500'>Không có audio</p>
                ) : (
                  <>
                    <div className='space-y-2'>
                      {audios.slice(0, INITIAL_DISPLAY_SIZE).map((msg) => (
                        <audio key={msg.createdAt.toMillis()} src={msg.audio} controls className='w-full' />
                      ))}
                    </div>
                    {audios.length > INITIAL_DISPLAY_SIZE && (
                      <Button variant='link' className='mt-2' onClick={() => handleViewMore("audios")}>
                        Xem thêm ({audios.length - INITIAL_DISPLAY_SIZE} mục)
                      </Button>
                    )}
                  </>
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
      </div>
    </div>
  )
}

export { Profile }
