/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios"
import { toast } from "react-toastify"

import { getErrorMessage } from "~/utils"

interface ApiClientOptions {
  baseURL: string
  headers?: Record<string, string>
  timeout?: number
  customInterceptors?: {
    request?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig
    response?: (response: AxiosResponse) => AxiosResponse
    error?: (error: any) => Promise<any>
  }
}

class ApiClient {
  private instance: AxiosInstance

  constructor(options: ApiClientOptions) {
    const { baseURL, headers = { "Content-Type": "application/json" }, timeout = 10000, customInterceptors } = options

    this.instance = axios.create({
      baseURL,
      headers,
      timeout
    })

    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        let locale: string

        if (typeof window !== "undefined") {
          locale = localStorage.getItem("locale") || "en"
        } else {
          locale = (config as any).locale || "en"
        }

        config.headers["Accept-Language"] = locale

        if (customInterceptors?.request) {
          config = customInterceptors.request(config)
        }

        return config
      },
      (error) => Promise.reject(error)
    )

    this.instance.interceptors.response.use(
      (response) => {
        return customInterceptors?.response ? customInterceptors.response(response) : response
      },
      (error) => {
        if (error.response?.status === 401) {
          toast.error(getErrorMessage(error))
        }
        return customInterceptors?.error ? customInterceptors.error(error) : Promise.reject(error)
      }
    )
  }

  async get<T>(url: string, config?: AxiosRequestConfig & { locale?: string }): Promise<T> {
    const response = await this.instance.get<T>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig & { locale?: string }): Promise<T> {
    const response = await this.instance.post<T>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig & { locale?: string }): Promise<T> {
    const response = await this.instance.put<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig & { locale?: string }): Promise<T> {
    const response = await this.instance.delete<T>(url, config)
    return response.data
  }
}

const defaultApiClient = new ApiClient({
  baseURL: import.meta.env.BASE_URL || "",
  headers: { "Content-Type": "application/json" },
  timeout: 10000
})

export { defaultApiClient }
