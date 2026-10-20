// Мини-парсер JSON, который нужен только для поиска места ошибки:
// сообщения JSON.parse в разных браузерах не всегда содержат позицию.
export interface JsonError {
  message: string
  line: number
  column: number
}

class ParseError extends Error {
  pos: number
  constructor(message: string, pos: number) {
    super(message)
    this.pos = pos
  }
}

export function findJsonError(text: string): JsonError | null {
  let i = 0
  const ws = () => {
    while (i < text.length && ' \t\n\r'.includes(text[i])) i++
  }
  const fail = (msg: string): never => {
    throw new ParseError(i >= text.length ? 'Неожиданный конец JSON' : msg, i)
  }
  const unexpected = () => fail(`Неожиданный символ «${text[i]}»`)
  const literal = (word: string) => {
    if (text.startsWith(word, i)) i += word.length
    else unexpected()
  }
  const string = () => {
    i++
    while (i < text.length) {
      const c = text[i]
      if (c === '"') return void i++
      if (c < ' ') fail('Управляющий символ внутри строки (используйте \\n, \\t)')
      if (c === '\\') {
        i++
        if (text[i] === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 1, i + 5))) fail('Некорректная escape-последовательность \\u')
          i += 5
        } else if (i < text.length && '"\\/bfnrt'.includes(text[i])) i++
        else fail('Некорректная escape-последовательность')
      } else i++
    }
    fail('Незакрытая строка')
  }
  const number = () => {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i))
    if (!m) unexpected()
    i += m![0].length
  }
  const value = (): void => {
    ws()
    const c = text[i]
    if (c === '{') return object()
    if (c === '[') return array()
    if (c === '"') return string()
    if (c === 't') return literal('true')
    if (c === 'f') return literal('false')
    if (c === 'n') return literal('null')
    if (c === "'") fail('Строки должны быть в двойных кавычках')
    if (c === '-' || (c >= '0' && c <= '9')) return number()
    if (c === '}' || c === ']') fail(`Лишняя запятая или пропущено значение перед «${c}»`)
    unexpected()
  }
  const object = () => {
    i++
    ws()
    if (text[i] === '}') return void i++
    for (;;) {
      ws()
      if (text[i] === '}') fail('Лишняя запятая перед «}»')
      if (text[i] !== '"') fail('Ожидался ключ в двойных кавычках')
      string()
      ws()
      if (text[i] !== ':') fail('Ожидалось «:» после ключа')
      i++
      value()
      ws()
      if (text[i] === ',') i++
      else if (text[i] === '}') return void i++
      else fail('Ожидалось «,» или «}»')
    }
  }
  const array = () => {
    i++
    ws()
    if (text[i] === ']') return void i++
    for (;;) {
      value()
      ws()
      if (text[i] === ',') i++
      else if (text[i] === ']') return void i++
      else fail('Ожидалось «,» или «]»')
    }
  }

  try {
    value()
    ws()
    if (i < text.length) fail('Лишние данные после конца JSON')
    return null
  } catch (e) {
    if (!(e instanceof ParseError)) throw e
    const before = text.slice(0, e.pos)
    return {
      message: e.message,
      line: before.split('\n').length,
      column: e.pos - before.lastIndexOf('\n'),
    }
  }
}
