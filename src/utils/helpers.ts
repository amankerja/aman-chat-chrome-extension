export function formatPhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = formatPhoneNumber(phone)
  return cleaned.length >= 8 && cleaned.length <= 15
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function formatDate(date: Date | number): string {
  const d = new Date(date)
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatTime(date: Date | number): string {
  const d = new Date(date)
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export function formatTimestamp(): string {
  const now = new Date()
  return now.toTimeString().split(' ')[0]
}

export function downloadCSV(data: string, filename: string): void {
  const blob = new Blob(['\ufeff' + data], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split('\n').slice(1)
  const results: Record<string, string>[] = []
  
  for (const line of lines) {
    const matches = line.match(/("(?:[^"]|"")*"|[^,]*)/g)
    if (matches && matches[0]?.trim()) {
      const values = matches.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'))
      results.push({
        name: values[0] || '',
        phone: values[1] || '',
        stage: values[2] || 'Lead',
        source: values[3] || 'Lainnya',
        tags: values[4] || '',
        notes: values[5] || ''
      })
    }
  }
  
  return results
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => { inThrottle = false }, limit)
    }
  }
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export async function translateText(text: string, targetLang: string = 'id'): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    const response = await fetch(url)
    const data = await response.json()
    return data[0].map((item: string[]) => item[0]).join('')
  } catch {
    throw new Error('Gagal menerjemahkan.')
  }
}

export function parseSpintax(text: string): string {
  if (!text) return ''
  const regex = /\{([^{}]+)\}/g
  let result = text
  let match: RegExpExecArray | null

  while ((match = regex.exec(result)) !== null) {
    const options = match[1].split('|')
    const chosen = options[Math.floor(Math.random() * options.length)]
    result = result.replace(match[0], chosen)
    regex.lastIndex = 0
  }

  return result
}
