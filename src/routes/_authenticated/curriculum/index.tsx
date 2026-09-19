import { createFileRoute } from '@tanstack/react-router'
import { ChaptersTopicsPage } from '@/features/curriculum/chapters-topics'

export const Route = createFileRoute('/_authenticated/curriculum/')({
  component: ChaptersTopicsPage,
})
