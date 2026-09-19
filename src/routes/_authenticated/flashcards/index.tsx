import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase, FlashcardDeck } from '@/lib/supabase'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Plus, BrainCircuit, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/flashcards/')({
  component: FlashcardsDashboard,
})

function FlashcardsDashboard() {
  const navigate = useNavigate()
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const { data, error } = await supabase
          .from('flashcard_decks')
          .select('*')
        if (error) throw error
        setDecks(data || [])
      } catch (err) {
        console.error('Error fetching decks:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDecks()
  }, [])

  return (
    <div className='flex flex-col h-full bg-background'>
      <Header className='border-b'>
        <div className='flex items-center justify-between w-full'>
          <h1 className='text-lg font-semibold tracking-tight'>Flashcards & Spaced Repetition</h1>
          <div className='flex items-center gap-4'>
            <ThemeSwitch />
            <Button onClick={() => navigate({ to: '/flashcards/new' })}>
              <Plus className='w-4 h-4 mr-2' />
              Create Deck
            </Button>
          </div>
        </div>
      </Header>
      
      <Main className='flex-1 p-6 overflow-y-auto'>
        {loading ? (
          <div className='flex justify-center py-12'>
            <Loader2 className='w-8 h-8 animate-spin text-primary' />
          </div>
        ) : decks.length === 0 ? (
          <div className='flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl bg-muted/20'>
            <BrainCircuit className='w-12 h-12 mb-4 text-muted-foreground' />
            <h2 className='mb-2 text-xl font-semibold'>No Flashcard Decks Yet</h2>
            <p className='mb-6 text-sm text-muted-foreground max-w-sm'>
              Create decks of spaced-repetition flashcards for your students to review and master complex concepts.
            </p>
            <Button onClick={() => navigate({ to: '/flashcards/new' })}>
              <Plus className='w-4 h-4 mr-2' />
              Create First Deck
            </Button>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {decks.map(deck => (
              <div key={deck.id} className='flex flex-col p-5 transition-all border rounded-xl bg-card hover:shadow-md'>
                <div className='flex items-center justify-between mb-4'>
                  <div className='p-2.5 rounded-lg' style={{ backgroundColor: `${deck.accent_color}20` }}>
                    <BrainCircuit className='w-6 h-6' style={{ color: deck.accent_color }} />
                  </div>
                </div>
                <h3 className='font-semibold line-clamp-1'>{deck.subject_name}</h3>
                <p className='mt-1 text-sm text-muted-foreground'>ID: {deck.id}</p>
              </div>
            ))}
          </div>
        )}
      </Main>
    </div>
  )
}
