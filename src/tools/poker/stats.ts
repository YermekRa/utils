function toNumber(card: string): number | null {
  if (card === '½') return 0.5
  const n = Number(card)
  return Number.isFinite(n) ? n : null
}

export function summarize(votes: string[]) {
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

export const fmt = (n: number | null) => (n === null ? '—' : Number(n.toFixed(2)).toLocaleString('ru'))
