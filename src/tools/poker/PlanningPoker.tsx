import { useEffect, useState } from 'react'
import { api, ApiError, loadSession, saveSession, type Deck, type Role, type Session } from './api'
import RoomView from './RoomView'

const NAME_KEY = 'poker-name'

function storedName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export default function PlanningPoker({ param }: { param?: string }) {
  return param ? <RoomPage key={param} roomId={param} /> : <Lobby />
}

function Lobby() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [deck, setDeck] = useState('FIBONACCI')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.decks().then(setDecks, (e) => setError(e.message))
  }, [])

  const create = async () => {
    setBusy(true)
    setError('')
    try {
      const room = await api.createRoom(deck)
      window.location.hash = `poker/${room.id}`
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const join = () => {
    const id = code.trim().split(/[/#]/).filter(Boolean).pop()
    if (id) window.location.hash = `poker/${id}`
  }

  return (
    <div className="stack">
      {error && <div className="alert error">{error}</div>}
      <div className="split">
        <section className="card">
          <h3>Новая комната</h3>
          <p className="muted">Создайте комнату и отправьте ссылку команде.</p>
          <label className="inline">
            Колода
            <select value={deck} onChange={(e) => setDeck(e.target.value)}>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}: {d.cards.join(' ')}
                </option>
              ))}
            </select>
          </label>
          <div className="toolbar">
            <button className="primary" onClick={create} disabled={busy || !decks.length}>
              Создать комнату
            </button>
          </div>
        </section>
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault()
            join()
          }}
        >
          <h3>Войти в комнату</h3>
          <p className="muted">Вставьте код комнаты или ссылку на неё.</p>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Например: k7m2xq9p" />
          <div className="toolbar">
            <button type="submit" disabled={!code.trim()}>
              Войти
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RoomPage({ roomId }: { roomId: string }) {
  const [session, setSession] = useState<Session | null>(() => loadSession(roomId))
  const [notice, setNotice] = useState('')

  const update = (next: Session | null, message = '') => {
    saveSession(roomId, next)
    setSession(next)
    setNotice(message)
  }

  if (session) {
    return <RoomView roomId={roomId} session={session} onLeave={(reason) => update(null, reason ?? '')} />
  }
  return <JoinForm roomId={roomId} notice={notice} onJoined={(s) => update(s)} />
}

function JoinForm({ roomId, notice, onJoined }: { roomId: string; notice: string; onJoined: (s: Session) => void }) {
  const [name, setName] = useState(storedName)
  const [role, setRole] = useState<Role>('VOTER')
  const [error, setError] = useState('')
  const [missing, setMissing] = useState(false)
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    api.room(roomId).then(
      (r) => setCount(r.participants.length),
      (e) => (e instanceof ApiError && e.status === 404 ? setMissing(true) : setError(e.message)),
    )
  }, [roomId])

  const submit = async () => {
    setError('')
    try {
      const joined = await api.join(roomId, name.trim(), role)
      try {
        localStorage.setItem(NAME_KEY, name.trim())
      } catch {
        /* storage unavailable */
      }
      onJoined({ participantId: joined.participantId, token: joined.token })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (missing) {
    return (
      <div className="stack">
        <div className="alert error">Комната «{roomId}» не найдена.</div>
        <div className="toolbar">
          <a className="button" href="#poker">
            ← К созданию комнаты
          </a>
        </div>
      </div>
    )
  }

  return (
    <form
      className="card narrow"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <h3>Комната {roomId}</h3>
      {count !== null && <p className="muted">Сейчас в комнате: {count}</p>}
      {notice && <div className="alert error">{notice}</div>}
      {error && <div className="alert error">{error}</div>}
      <label className="field">
        <span>Ваше имя</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
      </label>
      <div className="role-picker">
        <label className={role === 'VOTER' ? 'selected' : ''}>
          <input type="radio" checked={role === 'VOTER'} onChange={() => setRole('VOTER')} />
          <b>🃏 Участник</b>
          <span className="muted">Голосует картами</span>
        </label>
        <label className={role === 'SPECTATOR' ? 'selected' : ''}>
          <input type="radio" checked={role === 'SPECTATOR'} onChange={() => setRole('SPECTATOR')} />
          <b>👁 Зритель</b>
          <span className="muted">Наблюдает, не голосует</span>
        </label>
      </div>
      <div className="toolbar">
        <button type="submit" className="primary" disabled={!name.trim()}>
          Войти
        </button>
        <a className="button" href="#poker">
          Отмена
        </a>
      </div>
    </form>
  )
}
