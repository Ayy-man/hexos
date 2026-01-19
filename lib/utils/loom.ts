/**
 * Loom URL utilities
 *
 * Handles validation and transformation of Loom video URLs for embedding.
 */

// Pattern matches: loom.com/share/VIDEO_ID or loom.com/embed/VIDEO_ID
// VIDEO_ID is a hex string with optional dashes (UUID format)
const LOOM_URL_PATTERN = /^https?:\/\/(www\.)?loom\.com\/(share|embed)\/([a-f0-9-]+)(\?.*)?$/i

/**
 * Validates if a URL is a valid Loom video URL.
 * Returns true for valid Loom URLs or empty string (optional field).
 */
export function isValidLoomUrl(url: string): boolean {
  if (!url || url.trim() === '') return true // Optional field
  return LOOM_URL_PATTERN.test(url.trim())
}

/**
 * Extracts the video ID from a Loom URL.
 * Returns null if the URL is invalid.
 */
export function extractLoomVideoId(url: string): string | null {
  if (!url || url.trim() === '') return null

  const match = url.trim().match(LOOM_URL_PATTERN)
  if (!match) return null

  return match[3] // The video ID capture group
}

/**
 * Converts a Loom share URL to an embed URL.
 * Returns empty string if the URL is invalid.
 */
export function getLoomEmbedUrl(shareUrl: string): string {
  const videoId = extractLoomVideoId(shareUrl)
  if (!videoId) return ''

  return `https://www.loom.com/embed/${videoId}`
}
