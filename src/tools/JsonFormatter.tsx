import { useMemo, useState } from 'react'
import CopyButton from '../components/CopyButton'
import { findJsonError, type JsonError } from './jsonError'

type Indent = '2' | '4' | 'tab'

function parseJson(text: string): { value?: unknown; error?: JsonError } {
  try {
    return { value: JSON.parse(text) }
  } catch (e) {
    return {
      error: findJsonError(text) ?? {
        message: e instanceof Error ? e.message : String(e),
        line: 1,
        column: 1,
      },
    }
  }
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
    )
  }
  return value
}

export default function JsonFormatter() {
  const [input, setInput] = useState('')
  const [indent, setIndent] = useState<Indent>('2')
  const [sort, setSort] = useState(false)
  const [minify, setMinify] = useState(false)

  const result = useMemo(() => (input.trim() ? parseJson(input) : null), [input])

  const output = useMemo(() => {
    if (!result || result.error) return ''
    const value = sort ? sortKeys(result.value) : result.value
    if (minify) return JSON.stringify(value)
    return JSON.stringify(value, null, indent === 'tab' ? '\t' : Number(indent))
  }, [result, indent, sort, minify])

  const errorLine = result?.error?.line
  const contextLines = useMemo(() => {
    if (!errorLine) return null
    const lines = input.split('\n')
    const from = Math.max(0, errorLine - 3)
    return lines.slice(from, errorLine + 2).map((text, i) => ({ n: from + i + 1, text }))
  }, [input, errorLine])

  return (
    <div className="stack">
      <div className="toolbar">
        <label className="inline">
          Отступ
          <select value={indent} onChange={(e) => setIndent(e.target.value as Indent)} disabled={minify}>
            <option value="2">2 пробела</option>
            <option value="4">4 пробела</option>
            <option value="tab">Табуляция</option>
          </select>
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} />
          Сортировать ключи
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={minify} onChange={(e) => setMinify(e.target.checked)} />
          В одну строку
        </label>
        <button onClick={() => setInput(output)} disabled={!output}>
          Применить к исходнику
        </button>
        <button onClick={() => setInput('')} disabled={!input}>
          Очистить
        </button>
      </div>

      {result && !result.error && <div className="alert success">✓ JSON валиден</div>}
      {result?.error && (
        <div className="alert error">
          <div>
            ✗ Ошибка
            {` в строке ${result.error.line}, столбце ${result.error.column}`}:{' '}
            {result.error.message}
          </div>
          {contextLines && (
            <pre className="error-context">
              {contextLines.map((l) => (
                <div key={l.n} className={l.n === errorLine ? 'error-line' : ''}>
                  <span className="ln">{l.n}</span>
                  {l.text}
                  {l.n === errorLine && (
                    <>
                      {'\n'}
                      <span className="ln" />
                      {' '.repeat(Math.max(0, result.error!.column - 1))}^
                    </>
                  )}
                </div>
              ))}
            </pre>
          )}
        </div>
      )}

      <div className="split">
        <label className="field">
          <span>Исходный JSON</span>
          <textarea
            className="code"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='{"name":"пример","items":[1,2,3]}'
            spellCheck={false}
          />
        </label>
        <label className="field">
          <span>Отформатированный</span>
          <textarea className="code" value={output} readOnly placeholder="Результат" spellCheck={false} />
        </label>
      </div>
      <div className="toolbar">
        <CopyButton text={output} />
      </div>
    </div>
  )
}
