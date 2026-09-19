import { createFileRoute } from '@tanstack/react-router'
import { SubjectsPage } from '@/features/curriculum/subjects'

export const Route = createFileRoute('/_authenticated/subjects/')({
  component: SubjectsPage,
})
