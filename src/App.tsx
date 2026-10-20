import { useEffect, useState, type ComponentType } from 'react'
import PlanningPoker from './tools/poker/PlanningPoker'
import Base64Converter from './tools/Base64Converter'
import JsonFormatter from './tools/JsonFormatter'

interface Tool {
  id: string
  title: string
  icon: string
  component: ComponentType<{ param?: string }>
}

const TOOLS = [
  { id: 'poker', title: 'Покер планирование', icon: '🃏', component: PlanningPoker },
  { id: 'base64', title: 'Конвертер Base64', icon: '🔁', component: Base64Converter },
  { id: 'json', title: 'JSON валидатор', icon: '🧾', component: JsonFormatter },
] satisfies Tool[]

type ToolId = (typeof TOOLS)[number]['id']

// #poker/k7m2xq9p → утилита poker, параметр k7m2xq9p (код комнаты)
function readHash(): { id: ToolId; param?: string } {
  const [id, param] = window.location.hash.slice(1).split('/')
  return TOOLS.some((t) => t.id === id) ? { id: id as ToolId, param: param || undefined } : { id: TOOLS[0].id }
}

export default function App() {
  const [{ id: active, param }, setRoute] = useState(readHash)

  useEffect(() => {
    const onHash = () => setRoute(readHash())
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
        <Active param={param} />
      </main>
    </div>
  )
}
