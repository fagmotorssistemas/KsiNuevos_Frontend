export function extractPostImageUrls(input: unknown): string[] {
  if (!input) return []
  if (Array.isArray(input)) {
    return input.filter((x): x is string => typeof x === 'string' && x.length > 0)
  }
  if (typeof input === 'object') {
    const urls = (input as { urls?: unknown }).urls
    if (Array.isArray(urls)) {
      return urls.filter((x): x is string => typeof x === 'string' && x.length > 0)
    }
  }
  return []
}

export function getPostThumb(imageUrl: string | null, imageUrls: unknown): string | null {
  const fromJson = extractPostImageUrls(imageUrls)[0]
  return imageUrl || fromJson || null
}

export function getPostImageCount(imageUrl: string | null, imageUrls: unknown): number {
  const urls = extractPostImageUrls(imageUrls)
  if (imageUrl && !urls.includes(imageUrl)) return urls.length + 1
  return urls.length || (imageUrl ? 1 : 0)
}
