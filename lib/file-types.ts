// File type utilities for file viewer system

export type FileCategory = 'image' | 'pdf' | 'code' | 'video' | 'audio' | 'unsupported'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
const PDF_EXTENSIONS = ['pdf']
const CODE_EXTENSIONS = ['js', 'ts', 'tsx', 'jsx', 'json', 'md', 'txt', 'html', 'css', 'yml', 'yaml', 'xml', 'csv', 'env', 'sh', 'py', 'sql', 'go', 'rs', 'rb', 'php', 'java', 'c', 'cpp', 'h', 'swift', 'kt']
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv']
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac']

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export function getFileCategory(filename: string): FileCategory {
  const ext = getFileExtension(filename)

  if (IMAGE_EXTENSIONS.includes(ext)) return 'image'
  if (PDF_EXTENSIONS.includes(ext)) return 'pdf'
  if (CODE_EXTENSIONS.includes(ext)) return 'code'
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video'
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio'
  return 'unsupported'
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function getMimeTypeLabel(mimeType: string | null): string {
  if (!mimeType) return 'File'

  const mimeLabels: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPEG Image',
    'image/png': 'PNG Image',
    'image/gif': 'GIF Image',
    'image/webp': 'WebP Image',
    'image/svg+xml': 'SVG Image',
    'video/mp4': 'MP4 Video',
    'video/webm': 'WebM Video',
    'video/quicktime': 'QuickTime Video',
    'audio/mpeg': 'MP3 Audio',
    'audio/wav': 'WAV Audio',
    'audio/ogg': 'OGG Audio',
    'audio/mp4': 'M4A Audio',
    'text/plain': 'Text File',
    'text/html': 'HTML File',
    'text/css': 'CSS File',
    'text/javascript': 'JavaScript File',
    'application/json': 'JSON File',
    'application/xml': 'XML File',
  }

  return mimeLabels[mimeType] || mimeType.split('/')[1]?.toUpperCase() || 'File'
}

export function getLanguageFromExtension(ext: string): string {
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    md: 'markdown',
    html: 'html',
    css: 'css',
    yml: 'yaml',
    yaml: 'yaml',
    xml: 'xml',
    sql: 'sql',
    py: 'python',
    sh: 'bash',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    swift: 'swift',
    kt: 'kotlin',
  }
  return languageMap[ext] || 'plaintext'
}
