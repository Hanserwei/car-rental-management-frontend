export const resolveFileUrl = (url?: string | null): string => {
  if (!url) {
    return ''
  }

  const trimmedUrl = url.trim()
  if (!trimmedUrl) {
    return ''
  }

  const publicBase = import.meta.env.VITE_FILE_BASE_URL as string | undefined

  try {
    const parsed = new URL(trimmedUrl, window.location.origin)
    if (publicBase) {
      const baseParsed = new URL(publicBase, window.location.origin)
      const shouldOverrideHost = ['127.0.0.1', 'localhost'].includes(parsed.hostname)
      if (shouldOverrideHost || !parsed.protocol || parsed.protocol === 'file:') {
        parsed.protocol = baseParsed.protocol
        parsed.host = baseParsed.host
      }
    }
    return parsed.toString()
  } catch {
    if (publicBase) {
      return `${publicBase.replace(/\/$/, '')}/${trimmedUrl.replace(/^\/+/, '')}`
    }
    return trimmedUrl
  }
}
