/**
 * Client for the hosted aihealth-server API.
 *
 * Requests go to `/api/…`, which Vite proxies to the backend. That keeps
 * the browser same-origin, so no CORS origin is ever added server-side.
 */

const BASE = '/api'

// sessionStorage, not localStorage: the token grants access to patient
// health records; this clears when the tab closes.
const TOKEN_KEY = 'aih.token'
const DEVICE_KEY = 'aih.device'
const USER_KEY = 'aih.user'

export const getToken = () => sessionStorage.getItem(TOKEN_KEY)
export const isAuthed = () => Boolean(getToken())

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(DEVICE_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.status = status
    this.body = body
  }
}

async function request(path, { method = 'GET', body, params } = {}) {
  const url = new URL(BASE + path, window.location.origin)
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }

  const headers = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const device = sessionStorage.getItem(DEVICE_KEY)
  if (device) headers['x-device-id'] = device
  if (body) headers['Content-Type'] = 'application/json'

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 60000)
  let res
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: ac.signal,
    })
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new ApiError(`The API did not respond within 60s (${method} ${path}).`, 0, null)
    }
    throw new ApiError('Could not reach the API. Is the dev server proxy running?', 0, null)
  } finally {
    clearTimeout(timer)
  }

  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { /* non-JSON error page */ }

  if (!res.ok) {
    // Only 401 means a bad token; 403 is a permission failure and must
    // not sign the user out.
    if (res.status === 401) clearSession()
    const msg =
      json?.message ||
      json?.detail?.message ||
      (typeof json?.detail === 'string' ? json.detail : null) ||
      json?.detail?.[0]?.msg ||
      `Request failed (HTTP ${res.status})`
    throw new ApiError(msg, res.status, json)
  }

  // Endpoints wrap payloads in SuccessResponse { status, data, message }.
  return json && typeof json === 'object' && 'data' in json ? json.data : json
}

export async function login(email, password) {
  const data = await request('/v1/auth/care-provider/email-login', {
    method: 'POST',
    body: { email, password },
  })
  if (!data?.token) throw new ApiError('Login succeeded but returned no token.', 200, data)
  sessionStorage.setItem(TOKEN_KEY, data.token)
  if (data.device_id) sessionStorage.setItem(DEVICE_KEY, data.device_id)
  if (data.user_id) sessionStorage.setItem(USER_KEY, data.user_id)
  return data
}

export const listPatients = (search) =>
  request('/care-providers/patients', { params: { search } })

const PAGE_SIZE = 100
const MAX_PAGES = 10

/**
 * Fetch every document for a patient (both "report" and "other"
 * categories — classification covers the whole pool). Pages until a
 * short page, capped at MAX_PAGES for safety.
 */
export async function listAllDocuments(patientId) {
  const all = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const batch = await request(
      `/care-providers/patients/${encodeURIComponent(patientId)}/documents`,
      { params: { order: 'desc', limit: PAGE_SIZE, offset: page * PAGE_SIZE } },
    )
    const docs = Array.isArray(batch) ? batch : batch?.documents || []
    all.push(...docs)
    if (docs.length < PAGE_SIZE) break
  }
  return all
}

/** Formats the backend accepts — anything else is rejected before upload. */
export const ACCEPTED_UPLOAD_TYPES =
  '.pdf,.doc,.docx,.csv,.xls,.xlsx,image/*'

/**
 * Upload documents for a patient.
 *
 * Multipart, so Content-Type is left unset — the browser must set it itself to
 * include the boundary. The backend extracts text, summarises, classifies, and
 * embeds each file synchronously in the request, which takes several seconds
 * per file, so the ceiling here is far above the JSON one and scales with the
 * number of files.
 *
 * Uses XHR rather than fetch because fetch cannot report upload progress.
 */
export function uploadDocuments(patientId, files, { documentType = 'report', onProgress } = {}) {
  const form = new FormData()
  for (const f of files) form.append('files', f, f.name)

  const url = new URL(
    `${BASE}/care-providers/patients/${encodeURIComponent(patientId)}/documents/upload`,
    window.location.origin,
  )
  url.searchParams.set('document_type', documentType)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url, true)
    xhr.timeout = 120000 + files.length * 90000
    xhr.setRequestHeader('Accept', 'application/json')
    const token = getToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    const device = sessionStorage.getItem(DEVICE_KEY)
    if (device) xhr.setRequestHeader('x-device-id', device)

    // Progress covers the bytes leaving the browser only. Once they land, the
    // server still has extraction and two model calls to do per file, so the
    // UI switches to an indeterminate "processing" state at 100%.
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total)
    }

    xhr.onload = () => {
      let data = null
      try { data = JSON.parse(xhr.responseText) } catch { /* non-JSON error body */ }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data)
      if (xhr.status === 401) {
        clearSession()
        return reject(new ApiError('Session expired — sign in again.', 401, data))
      }
      const detail = data?.detail
      const message =
        (typeof detail === 'string' && detail) ||
        detail?.message ||
        data?.message ||
        `Upload failed (HTTP ${xhr.status})`
      reject(new ApiError(message, xhr.status, data))
    }
    xhr.onerror = () => reject(new ApiError('Could not reach the API.', 0, null))
    xhr.ontimeout = () =>
      reject(new ApiError('The upload timed out. Try fewer files at once.', 0, null))

    xhr.send(form)
  })
}
