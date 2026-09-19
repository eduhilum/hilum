import { createFileRoute } from '@tanstack/react-router'
import { TestsPage } from '@/features/tests'

export const Route = createFileRoute('/_authenticated/tests/')({
  component: TestsPage,
})
