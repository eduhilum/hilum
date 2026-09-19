/**
 * Video Utilities for DocLock Admin & Video Authoring Studio
 * Supports YouTube ID extraction, thumbnail resolution, and HTML5 video frame extraction.
 */

export function getYouTubeId(url: string): string | null {
  if (!url) return null
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.trim().match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

export function isYouTubeUrl(url: string): boolean {
  return !!getYouTubeId(url)
}

export function getYouTubeThumbnail(videoId: string, quality: 'hq' | 'max' = 'hq'): string {
  if (quality === 'max') {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`
}

export function formatFileSize(bytes: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return 'PDF Notes'
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB PDF`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB PDF`
}

export function resolveVideoThumbnail(thumbnailUrl?: string | null, videoUrl?: string | null): string {
  if (thumbnailUrl && thumbnailUrl.trim().length > 0) {
    return thumbnailUrl.trim()
  }
  const ytId = getYouTubeId(videoUrl || '')
  if (ytId) {
    return getYouTubeThumbnail(ytId)
  }
  return 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&auto=format&fit=crop&q=80'
}

/**
 * Capture video frame at 1s from local File object using HTML5 canvas
 */
export function captureVideoFrame(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    const url = URL.createObjectURL(file)
    video.src = url

    video.onloadeddata = () => {
      video.currentTime = Math.min(1.0, (video.duration || 1) / 2)
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 360
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(url)
              resolve(blob)
            },
            'image/jpeg',
            0.85
          )
        } else {
          URL.revokeObjectURL(url)
          resolve(null)
        }
      } catch (err) {
        console.warn('Frame capture error:', err)
        URL.revokeObjectURL(url)
        resolve(null)
      }
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
  })
}
