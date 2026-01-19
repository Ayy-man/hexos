'use client'

import { getLoomEmbedUrl } from '@/lib/utils/loom'

interface LoomVideoEmbedProps {
  url: string
  title?: string
}

export function LoomVideoEmbed({ url, title = 'Loom video' }: LoomVideoEmbedProps) {
  const embedUrl = getLoomEmbedUrl(url)

  if (!embedUrl) {
    return null
  }

  return (
    <div className="relative w-full" style={{ paddingBottom: '62.5%' }}>
      <iframe
        src={embedUrl}
        title={title}
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        className="absolute top-0 left-0 w-full h-full border-0 rounded-lg"
      />
    </div>
  )
}
