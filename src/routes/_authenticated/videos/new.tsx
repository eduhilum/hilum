import { createFileRoute } from '@tanstack/react-router'
import { VideoUploaderPage } from '@/features/videos/video-uploader'

export const Route = createFileRoute('/_authenticated/videos/new')({
  component: VideoUploaderPage,
})
