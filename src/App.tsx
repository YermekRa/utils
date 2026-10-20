import { useEffect, useState } from 'react'
import PlanningPoker from './tools/PlanningPoker'
import Base64Converter from './tools/Base64Converter'
import JsonFormatter from './tools/JsonFormatter'

const TOOLS = [
  { id: 'poker', title: 'Покер планирование', icon: '🃏', component: PlanningPoker },
  { id: 'base64', title: 'Конвертер Base64', icon: '🔁', component: Base64Converter },
  { id: 'json', title: 'JSON валидатор', icon: '🧾', component: JsonFormatter },
] as const

type ToolId = (typeof TOOLS)[number]['id']

function readHash(): ToolId {
  const id = window.location.hash.slice(1)
  return TOOLS.some((t) => t.id === id) ? (id as ToolId) : TOOLS[0].id
}

export default function App() {
  const [active, setActive] = useState<ToolId>(readHash)

  useEffect(() => {
    const onHash = () => setActive(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const tool = TOOLS.find((t) => t.id === active)!
  const Active = tool.component

  return (
    <div className="layout">
      <header className="header">
        <h1>Утилиты</h1>
        <nav className="tabs">
          {TOOLS.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className={t.id === active ? 'tab active' : 'tab'}
            >
              <span aria-hidden>{t.icon}</span> {t.title}
            </a>
          ))}
        </nav>
      </header>
      <main className="content">
        <h2>{tool.title}</h2>
        <Active />
      </main>
    </div>
  )
}
