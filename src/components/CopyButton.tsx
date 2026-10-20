import { useState } from 'react'

export default function CopyButton({ text, label = 'Копировать' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} disabled={!text}>
      {copied ? '✓ Скопировано' : label}
    </button>
  )
}
