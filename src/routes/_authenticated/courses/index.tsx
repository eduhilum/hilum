import { createFileRoute } from '@tanstack/react-router'
import { CoursesPage } from '@/features/courses'

export const Route = createFileRoute('/_authenticated/courses/')({
  component: CoursesPage,
})
