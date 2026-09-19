import { createFileRoute } from '@tanstack/react-router'
import { QuestionEditorPage } from '@/features/qbank/question-editor'

export const Route = createFileRoute('/_authenticated/questions/new')({
  component: QuestionEditorPage,
})
