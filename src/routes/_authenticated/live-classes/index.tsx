import { createFileRoute } from '@tanstack/react-router'
import { LiveClassesPage } from '@/features/live-classes'

export const Route = createFileRoute('/_authenticated/live-classes/')({
  component: LiveClassesPage,
})
