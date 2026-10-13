import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase, FlashcardDeck, Flashcard } from '@/lib/supabase'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  Plus,
  BrainCircuit,
  Loader2,
  Trash2,
  Eye,
  Sparkles,
  FileQuestion,
} from 'lucide-react'

export const Route = createFileRoute('/_authenticated/flashcards/')({
  component: FlashcardsDashboard,
})

function FlashcardsDashboard() {
  const navigate = useNavigate()
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  // Deck deletion dialog state
  const [deckToDelete, setDeckToDelete] = useState<FlashcardDeck | null>(null)
  const [deletingDeck, setDeletingDeck] = useState(false)

  // View cards modal state
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null)
  const [deckCards, setDeckCards] = useState<Flashcard[]>([])
  const [loadingCards, setLoadingCards] = useState(false)

  // Single card deletion state
  const [cardToDelete, setCardToDelete] = useState<Flashcard | null>(null)
  const [deletingCard, setDeletingCard] = useState(false)

  const fetchDecks = async () => {
    try {
      setLoading(true)
      const { data: decksData, error: decksError } = await supabase
        .from('flashcard_decks')
        .select('*')
      if (decksError) throw decksError
      setDecks(decksData || [])

      // Fetch flashcard counts
      const { data: cardsData, error: cardsError } = await supabase
        .from('flashcards')
        .select('id, deck_id')
      if (!cardsError && cardsData) {
        const counts: Record<string, number> = {}
        for (const card of cardsData) {
          if (card.deck_id) {
            counts[card.deck_id] = (counts[card.deck_id] || 0) + 1
          }
        }
        setCardCounts(counts)
      }
    } catch (err: any) {
      console.error('Error fetching decks:', err)
      toast.error('Failed to load flashcard decks: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDecks()
  }, [])

  const handleOpenDeck = async (deck: FlashcardDeck) => {
    setSelectedDeck(deck)
    setLoadingCards(true)
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deck.id)
        .order('created_at', { ascending: true })
      if (error) throw error
      setDeckCards(data || [])
    } catch (err: any) {
      console.error('Error fetching cards:', err)
      toast.error('Failed to load flashcards: ' + err.message)
      setDeckCards([])
    } finally {
      setLoadingCards(false)
    }
  }

  const handleDeleteDeck = async (deckId: string) => {
    setDeletingDeck(true)
    try {
      // 1. Delete associated cards first
      const { error: cardsErr } = await supabase
        .from('flashcards')
        .delete()
        .eq('deck_id', deckId)
      if (cardsErr) {
        console.warn('Note on deleting cards:', cardsErr)
      }

      // 2. Delete the deck
      const { error: deckErr } = await supabase
        .from('flashcard_decks')
        .delete()
        .eq('id', deckId)
      if (deckErr) throw deckErr

      setDecks((prev) => prev.filter((d) => d.id !== deckId))
      setCardCounts((prev) => {
        const next = { ...prev }
        delete next[deckId]
        return next
      })

      toast.success('Flashcard deck deleted successfully!')
      setDeckToDelete(null)
      if (selectedDeck?.id === deckId) {
        setSelectedDeck(null)
      }
    } catch (err: any) {
      console.error('Error deleting deck:', err)
      toast.error('Failed to delete deck: ' + err.message)
    } finally {
      setDeletingDeck(false)
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    setDeletingCard(true)
    try {
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', cardId)
      if (error) throw error

      setDeckCards((prev) => prev.filter((c) => c.id !== cardId))
      if (selectedDeck) {
        setCardCounts((prev) => ({
          ...prev,
          [selectedDeck.id]: Math.max(0, (prev[selectedDeck.id] || 1) - 1),
        }))
      }
      toast.success('Flashcard deleted successfully!')
      setCardToDelete(null)
    } catch (err: any) {
      console.error('Error deleting card:', err)
      toast.error('Failed to delete flashcard: ' + err.message)
    } finally {
      setDeletingCard(false)
    }
  }

  return (
    <div className='flex flex-col h-full bg-background'>
      <Header className='border-b'>
        <div className='flex items-center justify-between w-full'>
          <h1 className='text-lg font-semibold tracking-tight'>
            Flashcards & Spaced Repetition
          </h1>
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
            {decks.map((deck) => {
              const count = cardCounts[deck.id] || 0
              return (
                <div
                  key={deck.id}
                  className='group relative flex flex-col justify-between p-5 transition-all border rounded-xl bg-card hover:shadow-md hover:border-border/80'
                >
                  <div>
                    <div className='flex items-center justify-between mb-4'>
                      <div
                        className='p-2.5 rounded-lg'
                        style={{ backgroundColor: `${deck.accent_color}20` }}
                      >
                        <BrainCircuit
                          className='w-6 h-6'
                          style={{ color: deck.accent_color }}
                        />
                      </div>
                      <div className='flex items-center gap-1.5'>
                        <Badge variant='secondary' className='text-xs font-normal'>
                          {count} {count === 1 ? 'card' : 'cards'}
                        </Badge>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors'
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeckToDelete(deck)
                          }}
                          title='Delete Deck'
                        >
                          <Trash2 className='w-4 h-4' />
                        </Button>
                      </div>
                    </div>
                    <h3 className='font-semibold text-base line-clamp-1'>
                      {deck.subject_name}
                    </h3>
                    <p className='mt-1 text-xs text-muted-foreground font-mono'>
                      ID: {deck.id}
                    </p>
                  </div>

                  <div className='mt-5 pt-3 border-t flex items-center justify-between gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='w-full text-xs gap-1.5'
                      onClick={() => handleOpenDeck(deck)}
                    >
                      <Eye className='w-3.5 h-3.5' />
                      View Cards ({count})
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Main>

      {/* Delete Deck Confirmation Dialog */}
      <ConfirmDialog
        open={!!deckToDelete}
        onOpenChange={(open) => {
          if (!open) setDeckToDelete(null)
        }}
        title='Delete Flashcard Deck'
        desc={
          <div className='space-y-2'>
            <p>
              Are you sure you want to delete the deck{' '}
              <span className='font-semibold text-foreground'>
                "{deckToDelete?.subject_name}"
              </span>{' '}
              (<code className='text-xs font-mono'>{deckToDelete?.id}</code>)?
            </p>
            <p className='text-xs text-muted-foreground'>
              This will permanently delete this deck and all {deckToDelete ? cardCounts[deckToDelete.id] || 0 : 0} associated flashcards from Supabase. This action cannot be undone.
            </p>
          </div>
        }
        confirmText={deletingDeck ? 'Deleting...' : 'Delete Deck'}
        destructive
        isLoading={deletingDeck}
        handleConfirm={() => deckToDelete && handleDeleteDeck(deckToDelete.id)}
      />

      {/* View Cards & Manage Deck Modal */}
      <Dialog
        open={!!selectedDeck}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDeck(null)
            setDeckCards([])
          }
        }}
      >
        <DialogContent className='sm:max-w-2xl max-h-[90vh] flex flex-col p-6'>
          <DialogHeader>
            <div className='flex items-center justify-between gap-3 pr-6'>
              <div className='flex items-center gap-2.5'>
                <div
                  className='p-2 rounded-md'
                  style={{ backgroundColor: `${selectedDeck?.accent_color}20` }}
                >
                  <BrainCircuit
                    className='w-5 h-5'
                    style={{ color: selectedDeck?.accent_color }}
                  />
                </div>
                <div>
                  <DialogTitle className='text-lg'>
                    {selectedDeck?.subject_name}
                  </DialogTitle>
                  <DialogDescription className='text-xs font-mono'>
                    ID: {selectedDeck?.id}
                  </DialogDescription>
                </div>
              </div>
              <Badge variant='outline' className='text-xs'>
                {deckCards.length} {deckCards.length === 1 ? 'card' : 'cards'}
              </Badge>
            </div>
          </DialogHeader>

          <div className='flex-1 min-h-0 py-2'>
            {loadingCards ? (
              <div className='flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground'>
                <Loader2 className='w-6 h-6 animate-spin text-primary' />
                <span className='text-sm'>Loading flashcards...</span>
              </div>
            ) : deckCards.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center text-muted-foreground'>
                <FileQuestion className='w-10 h-10 mb-2 opacity-50' />
                <p className='text-sm font-medium'>No cards found in this deck.</p>
                <p className='text-xs text-muted-foreground mt-1'>
                  Cards may have been deleted or none were saved.
                </p>
              </div>
            ) : (
              <ScrollArea className='h-[50vh] pr-4'>
                <div className='space-y-4'>
                  {deckCards.map((card, idx) => (
                    <div
                      key={card.id}
                      className='relative flex flex-col gap-2.5 p-4 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <Badge variant='secondary' className='text-[11px] font-semibold'>
                            Card #{idx + 1}
                          </Badge>
                          {card.chapter_name && (
                            <span className='text-xs text-muted-foreground'>
                              {card.chapter_name}
                            </span>
                          )}
                        </div>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs gap-1'
                          onClick={() => setCardToDelete(card)}
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                          Delete Card
                        </Button>
                      </div>

                      <div className='space-y-1.5 text-sm'>
                        <div>
                          <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider block'>
                            Question
                          </span>
                          <p className='font-medium text-foreground'>{card.question}</p>
                        </div>

                        <div className='p-2.5 rounded-lg bg-background border text-xs'>
                          <span className='font-semibold text-muted-foreground uppercase tracking-wider block mb-1'>
                            Answer
                          </span>
                          <p className='text-foreground'>{card.answer}</p>
                        </div>

                        {card.high_yield_pearl && card.high_yield_pearl !== 'No pearl' && (
                          <div className='flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs border border-amber-500/20'>
                            <Sparkles className='w-3.5 h-3.5 shrink-0 mt-0.5' />
                            <div>
                              <span className='font-semibold'>High-Yield Pearl: </span>
                              <span>{card.high_yield_pearl}</span>
                            </div>
                          </div>
                        )}

                        {card.image_url && (
                          <div className='mt-2'>
                            <img
                              src={card.image_url}
                              alt='Flashcard reference'
                              className='max-h-36 rounded-md border object-contain bg-background'
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter className='border-t pt-3 flex items-center justify-between sm:justify-between w-full'>
            <Button
              variant='destructive'
              size='sm'
              className='gap-1.5'
              onClick={() => {
                if (selectedDeck) {
                  setDeckToDelete(selectedDeck)
                }
              }}
            >
              <Trash2 className='w-4 h-4' />
              Delete Entire Deck
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                setSelectedDeck(null)
                setDeckCards([])
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Single Card Confirmation Dialog */}
      <ConfirmDialog
        open={!!cardToDelete}
        onOpenChange={(open) => {
          if (!open) setCardToDelete(null)
        }}
        title='Delete Flashcard'
        desc={
          <div className='space-y-2'>
            <p>Are you sure you want to delete this flashcard from the deck?</p>
            {cardToDelete && (
              <div className='p-2.5 bg-muted rounded text-xs italic line-clamp-3 text-muted-foreground'>
                "{cardToDelete.question}"
              </div>
            )}
            <p className='text-xs text-muted-foreground'>
              This will permanently remove this single card from Supabase.
            </p>
          </div>
        }
        confirmText={deletingCard ? 'Deleting...' : 'Delete Card'}
        destructive
        isLoading={deletingCard}
        handleConfirm={() => cardToDelete && handleDeleteCard(cardToDelete.id)}
      />
    </div>
  )
}

