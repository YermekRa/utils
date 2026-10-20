import { useEffect, useState } from 'react'
import { api, ApiError, type Room, type Session } from './api'

export type Connection = 'connecting' | 'online' | 'offline'

/**
 * Живое состояние комнаты через SSE. Вызывает onLost, если участник больше не в комнате
 * (его удалили или комната исчезла).
 */
export function useRoom(roomId: string, session: Session, onLost: (reason: string) => void) {
  const [room, setRoom] = useState<Room | null>(null)
  const [connection, setConnection] = useState<Connection>('connecting')

  useEffect(() => {
    let source: EventSource | null = null
    let retry: ReturnType<typeof setTimeout> | undefined
    let disposed = false

    const accept = (next: Room) => {
      if (!next.participants.some((p) => p.id === session.participantId)) {
        onLost('Вас удалили из комнаты — войдите снова')
        return
      }
      setRoom(next)
    }

    const connect = () => {
      setConnection('connecting')
      source = new EventSource(api.eventsUrl(roomId, session.token))
      source.addEventListener('open', () => setConnection('online'))
      source.addEventListener('room', (e) => accept(JSON.parse((e as MessageEvent).data)))
      source.addEventListener('error', () => {
        setConnection('offline')
        // EventSource сам переподключается, кроме случаев, когда сервер ответил ошибкой
        if (source?.readyState !== EventSource.CLOSED) return
        api
          .room(roomId, session.token)
          .then((r) => {
            accept(r)
            if (!disposed) retry = setTimeout(connect, 3000)
          })
          .catch((err) => {
            if (err instanceof ApiError && err.status === 404) onLost('Комната не найдена')
            else if (!disposed) retry = setTimeout(connect, 3000)
          })
      })
    }

    connect()
    return () => {
      disposed = true
      clearTimeout(retry)
      source?.close()
    }
    // onLost намеренно не в зависимостях: переподключаемся только при смене комнаты или сессии
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, session.token, session.participantId])

  return { room, connection }
}
