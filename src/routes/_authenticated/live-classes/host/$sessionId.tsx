import { createFileRoute } from '@tanstack/react-router'
import { LiveClassHostPage } from '@/features/live-classes/host'

export const Route = createFileRoute('/_authenticated/live-classes/host/$sessionId')({
  component: LiveClassHostPage,
})
