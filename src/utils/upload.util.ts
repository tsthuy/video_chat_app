interface CloudinaryResponse {
  secure_url: string
}

const upload = async (file: File): Promise<string> => {
  const date = new Date()
  const cloudName = "dvtegyldl"
  const uploadPreset = "video-chat-app"
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`

  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", uploadPreset)
  formData.append("public_id", `images/${date + file.name}`)

  return new Promise<string>((resolve, reject) => {
    fetch(url, {
      method: "POST",
      body: formData
    })
      .then((response) => response.json() as Promise<CloudinaryResponse>)
      .then((data) => {
        if (data.secure_url) {
          console.log("Upload done, mầy! Here’s the URL:", data.secure_url)
          resolve(data.secure_url)
        } else {
          reject(new Error("Upload failed, mầy! No URL returned."))
        }
      })
      .catch((error: Error) => {
        reject(new Error("Something went wrong, mầy! " + error.message))
      })
  })
}

export default upload
