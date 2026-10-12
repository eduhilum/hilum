import { createFileRoute } from '@tanstack/react-router'
import { GrandMocksPage } from '@/features/grand-mocks'

export const Route = createFileRoute('/_authenticated/grand-mocks/')({
  component: GrandMocksPage,
})
