import { useEffect, useState } from 'react'

const DECKS = {
  fibonacci: { title: 'Фибоначчи', cards: ['0', '½', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'] },
  modified: { title: 'Модиф. Фибоначчи', cards: ['0', '½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'] },
  tshirt: { title: 'Размеры футболок', cards: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'] },
  powers: { title: 'Степени двойки', cards: ['0', '1', '2', '4', '8', '16', '32', '64', '?', '☕'] },
} as const

type DeckId = keyof typeof DECKS

interface Participant {
  id: string
  name: string
  vote: string | null
}

interface HistoryItem {
  story: string
  result: string
}

interface State {
  deck: DeckId
  story: string
  revealed: boolean
  participants: Participant[]
  history: HistoryItem[]
}

const STORAGE_KEY = 'planning-poker'
const INITIAL: State = { deck: 'fibonacci', story: '', revealed: false, participants: [], history: [] }

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...INITIAL, ...JSON.parse(raw) } : INITIAL
  } catch {
    return INITIAL
  }
}

function toNumber(card: string): number | null {
  if (card === '½') return 0.5
  const n = Number(card)
  return Number.isFinite(n) ? n : null
}

function summarize(votes: string[]) {
  const numbers = votes.map(toNumber).filter((n): n is number => n !== null).sort((a, b) => a - b)
  const counts = new Map<string, number>()
  for (const v of votes) counts.set(v, (counts.get(v) ?? 0) + 1)
  const distribution = [...counts.entries()].sort((a, b) => b[1] - a[1])
  if (!numbers.length) return { distribution, average: null, median: null, min: null, max: null }
  const average = numbers.reduce((s, n) => s + n, 0) / numbers.length
  const mid = Math.floor(numbers.length / 2)
  const median = numbers.length % 2 ? numbers[mid] : (numbers[mid - 1] + numbers[mid]) / 2
  return { distribution, average, median, min: numbers[0], max: numbers[numbers.length - 1] }
}

const fmt = (n: number | null) => (n === null ? '—' : Number(n.toFixed(2)).toLocaleString('ru'))

export default function PlanningPoker() {
  const [state, setState] = useState<State>(load)
  const [newName, setNewName] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable */
    }
  }, [state])

  // Синхронизация между вкладками одного браузера
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) setState({ ...INITIAL, ...JSON.parse(e.newValue) })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const update = (patch: Partial<State>) => setState((s) => ({ ...s, ...patch }))
  const { participants, revealed } = state
  const selected = participants.find((p) => p.id === selectedId) ?? null
  const votes = participants.map((p) => p.vote).filter((v): v is string => v !== null)
  const stats = summarize(votes)
  const consensus = revealed && votes.length > 1 && stats.distribution.length === 1

  const addParticipant = () => {
    const name = newName.trim()
    if (!name) return
    const p: Participant = { id: crypto.randomUUID(), name, vote: null }
    update({ participants: [...participants, p] })
    setSelectedId(p.id)
    setNewName('')
  }

  const vote = (card: string) => {
    if (!selected || revealed) return
    update({
      participants: participants.map((p) =>
        p.id === selected.id ? { ...p, vote: p.vote === card ? null : card } : p,
      ),
    })
  }

  const newRound = (save: boolean) => {
    const history =
      save && votes.length
        ? [
            {
              story: state.story || 'Без названия',
              result: stats.median !== null ? fmt(stats.median) : stats.distribution[0][0],
            },
            ...state.history,
          ]
        : state.history
    update({
      revealed: false,
      story: save ? '' : state.story,
      history,
      participants: participants.map((p) => ({ ...p, vote: null })),
    })
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <label className="inline grow">
          Задача
          <input
            value={state.story}
            onChange={(e) => update({ story: e.target.value })}
            placeholder="Например: JIRA-123 Авторизация через SSO"
          />
        </label>
        <label className="inline">
          Колода
          <select
            value={state.deck}
            onChange={(e) => {
              update({ deck: e.target.value as DeckId, revealed: false, participants: participants.map((p) => ({ ...p, vote: null })) })
            }}
          >
            {Object.entries(DECKS).map(([id, d]) => (
              <option key={id} value={id}>
                {d.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="card">
        <h3>Участники</h3>
        <form
          className="toolbar"
          onSubmit={(e) => {
            e.preventDefault()
            addParticipant()
          }}
        >
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Имя участника" />
          <button type="submit" disabled={!newName.trim()}>
            Добавить
          </button>
        </form>
        {participants.length === 0 ? (
          <p className="muted">Добавьте участников, затем выберите участника и его карту.</p>
        ) : (
          <div className="table">
            {participants.map((p) => (
              <div
                key={p.id}
                className={`player ${p.id === selectedId ? 'selected' : ''}`}
                onClick={() => setSelectedId(p.id)}
              >
                <div className={`mini-card ${p.vote ? (revealed ? 'shown' : 'hidden') : 'empty'}`}>
                  {p.vote ? (revealed ? p.vote : '✓') : ''}
                </div>
                <span className="player-name">{p.name}</span>
                <button
                  className="link"
                  title="Удалить"
                  onClick={(e) => {
                    e.stopPropagation()
                    update({ participants: participants.filter((x) => x.id !== p.id) })
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h3>{selected ? `Голос: ${selected.name}` : 'Выберите участника, чтобы проголосовать'}</h3>
        <div className="deck">
          {DECKS[state.deck].cards.map((card) => (
            <button
              key={card}
              className={`poker-card ${selected?.vote === card ? 'picked' : ''}`}
              disabled={!selected || revealed}
              onClick={() => vote(card)}
            >
              {card}
            </button>
          ))}
        </div>
        <div className="toolbar">
          <button className="primary" disabled={!votes.length || revealed} onClick={() => update({ revealed: true })}>
            Вскрыть карты ({votes.length}/{participants.length})
          </button>
          <button disabled={!revealed} onClick={() => newRound(true)}>
            Сохранить и следующая задача
          </button>
          <button disabled={!votes.length} onClick={() => newRound(false)}>
            Переголосовать
          </button>
        </div>
      </section>

      {revealed && (
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

      {state.history.length > 0 && (
        <section className="card">
          <div className="toolbar spread">
            <h3>История оценок</h3>
            <button className="link" onClick={() => update({ history: [] })}>
              Очистить
            </button>
          </div>
          <ul className="history">
            {state.history.map((h, i) => (
              <li key={i}>
                <span>{h.story}</span>
                <b>{h.result}</b>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
