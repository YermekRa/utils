import { useMemo, useState } from 'react'
import CopyButton from '../components/CopyButton'

type Mode = 'encode' | 'decode'

function encodeBase64(text: string, urlSafe: boolean): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  const result = btoa(binary)
  return urlSafe ? result.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : result
}

function decodeBase64(input: string): string {
  let normalized = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  const pad = normalized.length % 4
  if (pad === 1) throw new Error('Некорректная длина строки Base64')
  if (pad) normalized += '='.repeat(4 - pad)
  const binary = atob(normalized)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

export default function Base64Converter() {
  const [mode, setMode] = useState<Mode>('encode')
  const [input, setInput] = useState('')
  const [urlSafe, setUrlSafe] = useState(false)
  const [fileResult, setFileResult] = useState('')

  const { output, error } = useMemo(() => {
    if (!input) return { output: '', error: '' }
    try {
      return {
        output: mode === 'encode' ? encodeBase64(input, urlSafe) : decodeBase64(input),
        error: '',
      }
    } catch (e) {
      const message =
        e instanceof TypeError
          ? 'Результат не является корректным текстом UTF-8'
          : e instanceof Error && e.message.startsWith('Некорректная')
            ? e.message
            : 'Строка не является корректным Base64'
      return { output: '', error: message }
    }
  }, [input, mode, urlSafe])

  const swap = () => {
    setMode(mode === 'encode' ? 'decode' : 'encode')
    setInput(output)
  }

  const onFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      setFileResult(dataUrl.slice(dataUrl.indexOf(',') + 1))
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <div className="segmented">
          <button className={mode === 'encode' ? 'active' : ''} onClick={() => setMode('encode')}>
            Кодировать
          </button>
          <button className={mode === 'decode' ? 'active' : ''} onClick={() => setMode('decode')}>
            Декодировать
          </button>
        </div>
        {mode === 'encode' && (
          <label className="checkbox">
            <input type="checkbox" checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} />
            URL-safe
          </label>
        )}
        <button onClick={swap} disabled={!output}>
          ⇅ Поменять местами
        </button>
        <button onClick={() => setInput('')} disabled={!input}>
          Очистить
        </button>
      </div>

      <div className="split">
        <label className="field">
          <span>{mode === 'encode' ? 'Текст' : 'Base64'}</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'encode' ? 'Введите текст…' : 'Вставьте строку Base64…'}
            spellCheck={false}
          />
        </label>
        <label className="field">
          <span>{mode === 'encode' ? 'Base64' : 'Текст'}</span>
          <textarea value={output} readOnly placeholder="Результат" spellCheck={false} />
        </label>
      </div>
      {error && <div className="alert error">{error}</div>}
      <div className="toolbar">
        <CopyButton text={output} />
      </div>

      <section className="card">
        <h3>Файл → Base64</h3>
        <input type="file" onChange={(e) => onFile(e.target.files?.[0])} />
        {fileResult && (
          <>
            <textarea className="small" value={fileResult} readOnly spellCheck={false} />
            <div className="toolbar">
              <CopyButton text={fileResult} />
              <span className="muted">{fileResult.length.toLocaleString('ru')} символов</span>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
