export type Role = 'VOTER' | 'SPECTATOR'

export interface Deck {
  id: string
  title: string
  cards: string[]
}

export interface Participant {
  id: string
  name: string
  role: Role
  voted: boolean
  vote: string | null
  online: boolean
}

export interface Estimate {
  story: string
  result: string
  votesCount: number
  createdAt: string
}

export interface Room {
  id: string
  deck: string
  cards: string[]
  story: string
  revealed: boolean
  participants: Participant[]
  history: Estimate[]
}

export interface Session {
  participantId: string
  token: string
}

const BASE = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers['X-Participant-Token'] = token
  let res: Response
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Сервер недоступен')
  }
  if (!res.ok) {
    const problem = await res.json().catch(() => null)
    throw new ApiError(res.status, problem?.detail || `Ошибка ${res.status}`)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  decks: () => request<Deck[]>('GET', '/decks'),
  createRoom: (deck: string) => request<Room>('POST', '/rooms', { deck }),
  room: (roomId: string, token?: string) => request<Room>('GET', `/rooms/${roomId}`, undefined, token),
  join: (roomId: string, name: string, role: Role) =>
    request<Session & { room: Room }>('POST', `/rooms/${roomId}/participants`, { name, role }),
  updateMe: (roomId: string, token: string, patch: { name?: string; role?: Role }) =>
    request<void>('PATCH', `/rooms/${roomId}/participants/me`, patch, token),
  remove: (roomId: string, token: string, participantId: string) =>
    request<void>('DELETE', `/rooms/${roomId}/participants/${participantId}`, undefined, token),
  vote: (roomId: string, token: string, card: string | null) =>
    request<void>('PUT', `/rooms/${roomId}/vote`, { card }, token),
  reveal: (roomId: string, token: string) => request<void>('POST', `/rooms/${roomId}/reveal`, undefined, token),
  reset: (roomId: string, token: string, save: boolean) =>
    request<void>('POST', `/rooms/${roomId}/reset`, { save }, token),
  updateRoom: (roomId: string, token: string, patch: { story?: string; deck?: string }) =>
    request<void>('PATCH', `/rooms/${roomId}`, patch, token),
  clearHistory: (roomId: string, token: string) =>
    request<void>('DELETE', `/rooms/${roomId}/history`, undefined, token),
  eventsUrl: (roomId: string, token: string) => `${BASE}/api/rooms/${roomId}/events?token=${token}`,
}

const sessionKey = (roomId: string) => `poker-session:${roomId}`

export function loadSession(roomId: string): Session | null {
  try {
    const raw = localStorage.getItem(sessionKey(roomId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSession(roomId: string, session: Session | null) {
  try {
    if (session) localStorage.setItem(sessionKey(roomId), JSON.stringify(session))
    else localStorage.removeItem(sessionKey(roomId))
  } catch {
    /* storage unavailable */
  }
}
