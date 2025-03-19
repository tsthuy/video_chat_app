import { toast } from "react-toastify"

import { getErrorMessage } from "~/utils"

interface CloudinaryResponse {
  secure_url: string
}

export const upload = async (file: File): Promise<string> => {
  const date = new Date()
  const cloudName = "dvtegyldl"
  const uploadPreset = "video-chat-app"
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`

  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", uploadPreset)
  formData.append("public_id", `${file.type.split("/")[0]}/${date.getTime()}-${file.name}`)

  return new Promise<string>((resolve, reject) => {
    fetch(url, {
      method: "POST",
      body: formData
    })
      .then((response) => response.json() as Promise<CloudinaryResponse>)
      .then((data) => {
        if (data.secure_url) {
          resolve(data.secure_url)
        } else {
          reject(new Error())
        }
      })
      .catch((error: Error) => {
        toast.error(getErrorMessage(error))
        reject(new Error("Something went wrong" + error.message))
      })
  })
}
