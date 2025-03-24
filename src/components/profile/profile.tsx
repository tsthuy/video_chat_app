import "yet-another-react-lightbox/styles.css"
import "yet-another-react-lightbox/plugins/thumbnails.css"

import {
  collection,
  DocumentData,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  startAfter,
  Timestamp,
  where
} from "firebase/firestore"
import { ArrowLeft } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "react-toastify"
import Lightbox from "yet-another-react-lightbox"
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails"
import Video from "yet-another-react-lightbox/plugins/video"
import Zoom from "yet-another-react-lightbox/plugins/zoom"

import { Loader8 } from "~/components/loader/loader8"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion"
import { Button } from "~/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { db } from "~/libs"
import { cn } from "~/libs"
import { useChatStore } from "~/stores"
import { getErrorMessage } from "~/utils"

const INITIAL_DISPLAY_SIZE = 6
const FETCH_SIZE = 50

interface Message {
  id: string
  chatId: string
  senderId: string
  text?: string
  createdAt: Timestamp
  img?: string
  audio?: string
  file?: string
  type: "text" | "image" | "audio" | "video" | "file"
}

const Profile = () => {
  const chatId = useChatStore((state) => state.chatId)

  const [imagesAndVideos, setImagesAndVideos] = useState<Message[]>([])
  const [files, setFiles] = useState<Message[]>([])
  const [audios, setAudios] = useState<Message[]>([])

  const [lastVisibleImage, setLastVisibleImage] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [lastVisibleFile, setLastVisibleFile] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [lastVisibleAudio, setLastVisibleAudio] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)

  const [hasMoreImages, setHasMoreImages] = useState(true)
  const [hasMoreFiles, setHasMoreFiles] = useState(true)
  const [hasMoreAudios, setHasMoreAudios] = useState(true)

  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [isTabView, setIsTabView] = useState(false)
  const [activeTab, setActiveTab] = useState<"imagesAndVideos" | "files" | "audios">("imagesAndVideos")

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const fetchedImageIds = useRef<Set<string>>(new Set())
  const fetchedFileIds = useRef<Set<string>>(new Set())
  const fetchedAudioIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!chatId) return

    setIsLoading(true)
    fetchedImageIds.current.clear()
    fetchedFileIds.current.clear()
    fetchedAudioIds.current.clear()
    setImagesAndVideos([])
    setFiles([])
    setAudios([])
    setLastVisibleImage(null)
    setLastVisibleFile(null)
    setLastVisibleAudio(null)
    setHasMoreImages(true)
    setHasMoreFiles(true)
    setHasMoreAudios(true)

    const messagesRef = collection(db, "chats", chatId, "messages")

    const imagesQuery = query(
      messagesRef,
      orderBy("createdAt", "desc"),
      limit(FETCH_SIZE),
      where("type", "in", ["image", "video"])
    )
    const unsubscribeImages = onSnapshot(
      imagesQuery,
      (snapshot) => {
        const initialImages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Message).reverse()
        setImagesAndVideos((prev) => {
          const newImages = initialImages.filter((msg) => !fetchedImageIds.current.has(msg.id))
          newImages.forEach((msg) => fetchedImageIds.current.add(msg.id))
          return [...prev, ...newImages]
        })
        if (snapshot.docs.length > 0) {
          setLastVisibleImage(snapshot.docs[snapshot.docs.length - 1])
        }
        setHasMoreImages(snapshot.docs.length === FETCH_SIZE)
        setIsLoading(false)
      },
      (error) => {
        toast.error(getErrorMessage(error))
        setIsLoading(false)
      }
    )

    const filesQuery = query(messagesRef, orderBy("createdAt", "desc"), limit(FETCH_SIZE), where("type", "==", "file"))
    const unsubscribeFiles = onSnapshot(
      filesQuery,
      (snapshot) => {
        const initialFiles = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Message).reverse()
        setFiles((prev) => {
          const newFiles = initialFiles.filter((msg) => !fetchedFileIds.current.has(msg.id))
          newFiles.forEach((msg) => fetchedFileIds.current.add(msg.id))
          return [...prev, ...newFiles]
        })
        if (snapshot.docs.length > 0) {
          setLastVisibleFile(snapshot.docs[snapshot.docs.length - 1])
        }
        setHasMoreFiles(snapshot.docs.length === FETCH_SIZE)
      },
      (error) => {
        toast.error(getErrorMessage(error))
      }
    )

    const audiosQuery = query(
      messagesRef,
      orderBy("createdAt", "desc"),
      limit(FETCH_SIZE),
      where("type", "==", "audio")
    )
    const unsubscribeAudios = onSnapshot(
      audiosQuery,
      (snapshot) => {
        const initialAudios = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Message).reverse()
        setAudios((prev) => {
          const newAudios = initialAudios.filter((msg) => !fetchedAudioIds.current.has(msg.id))
          newAudios.forEach((msg) => fetchedAudioIds.current.add(msg.id))
          return [...prev, ...newAudios]
        })
        if (snapshot.docs.length > 0) {
          setLastVisibleAudio(snapshot.docs[snapshot.docs.length - 1])
        }
        setHasMoreAudios(snapshot.docs.length === FETCH_SIZE)
      },
      (error) => {
        toast.error(getErrorMessage(error))
      }
    )

    return () => {
      unsubscribeImages()
      unsubscribeFiles()
      unsubscribeAudios()
    }
  }, [chatId])

  useEffect(() => {
    if (!loadMoreRef.current || !isTabView) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingMore) {
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
  }, [activeTab, isTabView])

  const fetchMoreImages = async () => {
    if (!chatId || !lastVisibleImage || !hasMoreImages || isFetchingMore) return

    setIsFetchingMore(true)
    try {
      const messagesRef = collection(db, "chats", chatId, "messages")
      const imagesQuery = query(
        messagesRef,
        orderBy("createdAt", "desc"),
        startAfter(lastVisibleImage),
        limit(FETCH_SIZE),
        where("type", "in", ["image", "video"])
      )

      const snapshot = await getDocs(imagesQuery)
      const moreImages = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Message)
        .filter((msg) => !fetchedImageIds.current.has(msg.id))
        .reverse()

      if (moreImages.length === 0) {
        setHasMoreImages(false)
        return
      }

      setImagesAndVideos((prev) => [...prev, ...moreImages])
      moreImages.forEach((msg) => fetchedImageIds.current.add(msg.id))
      if (snapshot.docs.length > 0) {
        setLastVisibleImage(snapshot.docs[snapshot.docs.length - 1])
      }
      setHasMoreImages(true)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsFetchingMore(false)
    }
  }

  const fetchMoreFiles = async () => {
    if (!chatId || !lastVisibleFile || !hasMoreFiles || isFetchingMore) return

    setIsFetchingMore(true)
    try {
      const messagesRef = collection(db, "chats", chatId, "messages")
      const filesQuery = query(
        messagesRef,
        orderBy("createdAt", "desc"),
        startAfter(lastVisibleFile),
        limit(FETCH_SIZE),
        where("type", "==", "file")
      )

      const snapshot = await getDocs(filesQuery)
      const moreFiles = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Message)
        .filter((msg) => !fetchedFileIds.current.has(msg.id))
        .reverse()

      if (moreFiles.length === 0) {
        setHasMoreFiles(false)
        return
      }

      setFiles((prev) => [...prev, ...moreFiles])
      moreFiles.forEach((msg) => fetchedFileIds.current.add(msg.id))
      if (snapshot.docs.length > 0) {
        setLastVisibleFile(snapshot.docs[snapshot.docs.length - 1])
      }
      setHasMoreFiles(true)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsFetchingMore(false)
    }
  }

  const fetchMoreAudios = async () => {
    if (!chatId || !lastVisibleAudio || !hasMoreAudios || isFetchingMore) return

    setIsFetchingMore(true)
    try {
      const messagesRef = collection(db, "chats", chatId, "messages")
      const audiosQuery = query(
        messagesRef,
        orderBy("createdAt", "desc"),
        startAfter(lastVisibleAudio),
        limit(FETCH_SIZE),
        where("type", "==", "audio")
      )

      const snapshot = await getDocs(audiosQuery)
      const moreAudios = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Message)
        .filter((msg) => !fetchedAudioIds.current.has(msg.id))
        .reverse()

      if (moreAudios.length === 0) {
        setHasMoreAudios(false)
        return
      }

      setAudios((prev) => [...prev, ...moreAudios])
      moreAudios.forEach((msg) => fetchedAudioIds.current.add(msg.id))
      if (snapshot.docs.length > 0) {
        setLastVisibleAudio(snapshot.docs[snapshot.docs.length - 1])
      }
      setHasMoreAudios(true)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsFetchingMore(false)
    }
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
              <ArrowLeft className='size-6' />
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
            <TabsList className='grid w-full grid-cols-3 gap-1'>
              <TabsTrigger
                className={cn(
                  "px-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white",
                  "data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-700"
                )}
                value='imagesAndVideos'
              >
                Medias
              </TabsTrigger>
              <TabsTrigger
                className={cn(
                  "data-[state=active]:bg-blue-500 data-[state=active]:text-white",
                  "data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-700"
                )}
                value='files'
              >
                Files
              </TabsTrigger>
              <TabsTrigger
                className={cn(
                  "data-[state=active]:bg-blue-500 data-[state=active]:text-white",
                  "data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-700"
                )}
                value='audios'
              >
                Audios
              </TabsTrigger>
            </TabsList>

            <TabsContent value='imagesAndVideos'>
              {imagesAndVideos.length === 0 ? (
                <p className='text-center text-gray-500'>No items found</p>
              ) : (
                <div className='grid grid-cols-3 gap-2'>
                  {imagesAndVideos.map((msg, index) => (
                    <div key={msg.id} onClick={() => handleImageClick(index)} className='cursor-pointer'>
                      {msg.type === "video" ? (
                        <video src={msg.img} className='w-full h-[80px] object-cover rounded-lg' muted />
                      ) : (
                        <img src={msg.img} alt='media' className='w-full h-[80px] object-cover rounded-lg' />
                      )}
                    </div>
                  ))}
                </div>
              )}
              {isFetchingMore ? (
                <div className='flex justify-center py-4'>
                  <Loader8 />
                </div>
              ) : !hasMoreImages && imagesAndVideos.length > 0 ? (
                <p className='text-center text-gray-500 py-4'>No more items to load</p>
              ) : null}
              <div ref={loadMoreRef} className='h-1' />
            </TabsContent>

            <TabsContent value='files'>
              {files.length === 0 ? (
                <p className='text-center text-gray-500'>No Items found</p>
              ) : (
                <div className='space-y-2'>
                  {files.map((msg) => (
                    <a
                      key={msg.id}
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
              {isFetchingMore ? (
                <div className='flex justify-center py-4'>
                  <Loader8 />
                </div>
              ) : !hasMoreFiles && files.length > 0 ? (
                <p className='text-center text-gray-500 py-4'>No more items to load</p>
              ) : null}
              <div ref={loadMoreRef} className='h-1' />
            </TabsContent>

            <TabsContent value='audios'>
              {audios.length === 0 ? (
                <p className='text-center text-gray-500'>No Items Found</p>
              ) : (
                <div className='space-y-2'>
                  {audios.map((msg) => (
                    <audio key={msg.id} src={msg.audio} controls className='w-full' />
                  ))}
                </div>
              )}
              {isFetchingMore ? (
                <div className='flex justify-center py-4'>
                  <Loader8 />
                </div>
              ) : !hasMoreAudios && audios.length > 0 ? (
                <p className='text-center text-gray-500 py-4'>No more items to load</p>
              ) : null}
              <div ref={loadMoreRef} className='h-1' />
            </TabsContent>
          </Tabs>
        ) : (
          <Accordion type='multiple' className='w-full' defaultValue={["images-and-videos"]}>
            <AccordionItem value='images-and-videos'>
              <AccordionTrigger>Medias</AccordionTrigger>
              <AccordionContent>
                {imagesAndVideos.length === 0 ? (
                  <p className='text-center text-gray-500'>No Items Found</p>
                ) : (
                  <>
                    <div className='grid grid-cols-3 gap-2'>
                      {imagesAndVideos.slice(0, INITIAL_DISPLAY_SIZE).map((msg, index) => (
                        <div key={msg.id} onClick={() => handleImageClick(index)} className='cursor-pointer'>
                          {msg.type === "video" ? (
                            <video src={msg.img} className='w-full h-[80px] object-cover rounded-lg' muted />
                          ) : (
                            <img src={msg.img} alt='media' className='w-full h-[80px] object-cover rounded-lg' />
                          )}
                        </div>
                      ))}
                    </div>
                    {imagesAndVideos.length > INITIAL_DISPLAY_SIZE && (
                      <div className='flex justify-center items-center text-center w-full'>
                        <Button
                          variant='link'
                          className='mt-2 flex justify-center items-center'
                          onClick={() => handleViewMore("imagesAndVideos")}
                        >
                          More
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value='files'>
              <AccordionTrigger>Files</AccordionTrigger>
              <AccordionContent>
                {files.length === 0 ? (
                  <p className='text-center text-gray-500'>No Items Found</p>
                ) : (
                  <>
                    <div className='space-y-2'>
                      {files.slice(0, INITIAL_DISPLAY_SIZE).map((msg) => (
                        <a
                          key={msg.id}
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
                      <div className='flex justify-center items-center text-center w-full'>
                        <Button variant='link' className='mt-2' onClick={() => handleViewMore("files")}>
                          More
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value='audios'>
              <AccordionTrigger>Audios</AccordionTrigger>
              <AccordionContent>
                {audios.length === 0 ? (
                  <p className='text-center text-gray-500'>No Items Found</p>
                ) : (
                  <>
                    <div className='space-y-2'>
                      {audios.slice(0, INITIAL_DISPLAY_SIZE).map((msg) => (
                        <audio key={msg.id} src={msg.audio} controls className='w-full' />
                      ))}
                    </div>
                    {audios.length > INITIAL_DISPLAY_SIZE && (
                      <div className='flex justify-center items-center text-center w-full'>
                        <Button variant='link' className='mt-2' onClick={() => handleViewMore("audios")}>
                          More
                        </Button>
                      </div>
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
