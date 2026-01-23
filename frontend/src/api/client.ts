import type { ApiError } from './types'

const BASE_URL = '/api'

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: unknown
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail: unknown
    try {
      const errorBody: ApiError = await response.json()
      detail = errorBody.detail
    } catch {
      detail = response.statusText
    }

    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((e) => e.msg).join(', ')
          : `Request failed: ${response.status}`

    throw new ApiClientError(message, response.status, detail)
  }

  return response.json()
}

interface RequestOptions {
  signal?: AbortSignal
}

export const apiClient = {
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: options?.signal,
    })
    return handleResponse<T>(response)
  },

  async post<T, D = unknown>(path: string, data: D, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: options?.signal,
    })
    return handleResponse<T>(response)
  },

  async delete(path: string, options?: RequestOptions): Promise<void> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: options?.signal,
    })

    if (!response.ok) {
      let detail: unknown
      try {
        const errorBody = await response.json()
        detail = errorBody.detail
      } catch {
        detail = response.statusText
      }

      const message =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((e) => e.msg).join(', ')
            : `Request failed: ${response.status}`

      throw new ApiClientError(message, response.status, detail)
    }
    // 204 No Content - no body to parse
  },

  async patch<T, D = unknown>(path: string, data: D, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: options?.signal,
    })
    return handleResponse<T>(response)
  },
}
