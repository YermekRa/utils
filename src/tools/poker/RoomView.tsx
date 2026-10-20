import { useEffect, useState } from 'react'
import CopyButton from '../../components/CopyButton'
import { api, ApiError, type Deck, type Participant, type Session } from './api'
import { fmt, summarize } from './stats'
import { useRoom } from './useRoom'

interface Props {
  roomId: string
  session: Session
  onLeave: (reason?: string) => void
}

export default function RoomView({ roomId, session, onLeave }: Props) {
  const { room, connection } = useRoom(roomId, session, onLeave)
  const [decks, setDecks] = useState<Deck[]>([])
  const [error, setError] = useState('')
  // Черновик названия задачи, пока поле в фокусе; иначе показываем значение с сервера
  const [storyDraft, setStoryDraft] = useState<string | null>(null)

  useEffect(() => {
    api.decks().then(setDecks, () => {})
  }, [])

  if (!room) {
    return <p className="muted">{connection === 'offline' ? 'Нет связи с сервером, переподключаемся…' : 'Подключение…'}</p>
  }

  const run = async (action: (token: string) => Promise<unknown>) => {
    setError('')
    try {
      await action(session.token)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onLeave('Сессия устарела — войдите снова')
      else setError((e as Error).message)
    }
  }

  const me = room.participants.find((p) => p.id === session.participantId)!
  const voters = room.participants.filter((p) => p.role === 'VOTER')
  const spectators = room.participants.filter((p) => p.role === 'SPECTATOR')
  const votes = voters.map((p) => p.vote).filter((v): v is string => v !== null)
  const votedCount = voters.filter((p) => p.voted).length
  const stats = summarize(votes)
  const consensus = room.revealed && votes.length > 1 && stats.distribution.length === 1
  const isSpectator = me.role === 'SPECTATOR'
  const link = `${window.location.origin}${window.location.pathname}#poker/${room.id}`

  const saveStory = () => {
    const story = storyDraft?.trim()
    setStoryDraft(null)
    if (story !== undefined && story !== room.story) run((t) => api.updateRoom(roomId, t, { story }))
  }

  return (
    <div className="stack">
      <div className="toolbar spread">
        <div className="toolbar">
          <span className="room-code">
            Комната <b>{room.id}</b>
          </span>
          <span className={`status-dot ${connection}`} title={connection === 'online' ? 'Онлайн' : 'Нет связи'} />
          <CopyButton text={link} label="Копировать ссылку" />
        </div>
        <div className="toolbar">
          <span className="muted">
            Вы: <b>{me.name}</b> · {isSpectator ? '👁 зритель' : '🃏 участник'}
          </span>
          <button
            onClick={() => run((t) => api.updateMe(roomId, t, { role: isSpectator ? 'VOTER' : 'SPECTATOR' }))}
          >
            {isSpectator ? 'Стать участником' : 'Перейти в зрители'}
          </button>
          <button
            onClick={() =>
              run(async (t) => {
                await api.remove(roomId, t, me.id)
                onLeave()
              })
            }
          >
            Выйти
          </button>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="toolbar">
        <label className="inline grow">
          Задача
          <input
            value={storyDraft ?? room.story}
            maxLength={500}
            onFocus={() => setStoryDraft(room.story)}
            onChange={(e) => setStoryDraft(e.target.value)}
            onBlur={saveStory}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder="Например: JIRA-123 Авторизация через SSO"
          />
        </label>
        <label className="inline">
          Колода
          <select value={room.deck} onChange={(e) => run((t) => api.updateRoom(roomId, t, { deck: e.target.value }))}>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="card">
        <h3>
          Участники <span className="muted">({votedCount}/{voters.length} проголосовали)</span>
        </h3>
        {voters.length === 0 ? (
          <p className="muted">Пока нет голосующих участников. Отправьте команде ссылку на комнату.</p>
        ) : (
          <div className="table">
            {voters.map((p) => (
              <PlayerCard
                key={p.id}
                p={p}
                me={p.id === me.id}
                revealed={room.revealed}
                onRemove={() => run((t) => api.remove(roomId, t, p.id))}
              />
            ))}
          </div>
        )}
        {spectators.length > 0 && (
          <div className="spectators">
            <span className="muted">👁 Зрители ({spectators.length}):</span>
            {spectators.map((p) => (
              <span key={p.id} className={`chip ${p.online ? '' : 'away'}`}>
                {p.name}
                {p.id === me.id && ' (вы)'}
                {p.id !== me.id && (
                  <button className="link" title="Удалить" onClick={() => run((t) => api.remove(roomId, t, p.id))}>
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        {isSpectator ? (
          <p className="muted">
            Вы в режиме зрителя: видите ход голосования и результаты, но не голосуете. Вскрывать карты и начинать новый
            раунд можно.
          </p>
        ) : (
          <>
            <h3>{room.revealed ? 'Карты вскрыты' : 'Ваш голос'}</h3>
            <div className="deck">
              {room.cards.map((card) => (
                <button
                  key={card}
                  className={`poker-card ${me.vote === card ? 'picked' : ''}`}
                  disabled={room.revealed}
                  onClick={() => run((t) => api.vote(roomId, t, me.vote === card ? null : card))}
                >
                  {card}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="toolbar">
          <button
            className="primary"
            disabled={!votedCount || room.revealed}
            onClick={() => run((t) => api.reveal(roomId, t))}
          >
            Вскрыть карты ({votedCount}/{voters.length})
          </button>
          <button disabled={!room.revealed} onClick={() => run((t) => api.reset(roomId, t, true))}>
            Сохранить и следующая задача
          </button>
          <button disabled={!votedCount} onClick={() => run((t) => api.reset(roomId, t, false))}>
            Переголосовать
          </button>
        </div>
      </section>

      {room.revealed && (
        <section className="card">
          <h3>Результаты {consensus && <span className="badge">🎉 Консенсус</span>}</h3>
          <div className="stats">
            <div><span className="muted">Среднее</span><b>{fmt(stats.average)}</b></div>
            <div><span className="muted">Медиана</span><b>{fmt(stats.median)}</b></div>
            <div><span className="muted">Мин</span><b>{fmt(stats.min)}</b></div>
            <div><span className="muted">Макс</span><b>{fmt(stats.max)}</b></div>
          </div>
          <div className="bars">
            {stats.distribution.map(([card, count]) => (
              <div key={card} className="bar-row">
                <span className="bar-label">{card}</span>
                <div className="bar" style={{ width: `${(count / votes.length) * 100}%` }} />
                <span className="muted">{count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {room.history.length > 0 && (
        <section className="card">
          <div className="toolbar spread">
            <h3>История оценок</h3>
            <button className="link" onClick={() => run((t) => api.clearHistory(roomId, t))}>
              Очистить
            </button>
          </div>
          <ul className="history">
            {room.history.map((h) => (
              <li key={h.createdAt}>
                <span>{h.story}</span>
                <span className="muted">{h.votesCount} гол.</span>
                <b>{Number.isNaN(Number(h.result)) ? h.result : fmt(Number(h.result))}</b>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function PlayerCard({ p, me, revealed, onRemove }: { p: Participant; me: boolean; revealed: boolean; onRemove: () => void }) {
  const face = revealed || me ? p.vote : null
  return (
    <div className={`player ${me ? 'selected' : ''} ${p.online ? '' : 'away'}`} title={p.online ? 'Онлайн' : 'Не в сети'}>
      <div className={`mini-card ${p.voted ? (face ? 'shown' : 'hidden') : 'empty'}`}>{p.voted ? (face ?? '✓') : ''}</div>
      <span className="player-name">
        {p.name}
        {me && ' (вы)'}
      </span>
      {!me && (
        <button className="link" title="Удалить" onClick={onRemove}>
          ✕
        </button>
      )}
    </div>
  )
}
