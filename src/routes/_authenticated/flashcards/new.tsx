import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase, Subject } from '@/lib/supabase'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Trash2, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/flashcards/new')({
  component: NewFlashcardDeck,
})

interface NewFlashcard {
  question: string
  answer: string
  pearl: string
  imageFile?: File | null
  imagePreview?: string
}

function NewFlashcardDeck() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  
  const [deckSubject, setDeckSubject] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [cards, setCards] = useState<NewFlashcard[]>([
    { question: '', answer: '', pearl: '' }
  ])

  useEffect(() => {
    const fetchSubjects = async () => {
      const { data } = await supabase.from('subjects').select('*').order('name')
      if (data) setSubjects(data)
    }
    fetchSubjects()
  }, [])

  const handleAddCard = () => {
    setCards([...cards, { question: '', answer: '', pearl: '' }])
  }

  const handleRemoveCard = (index: number) => {
    if (cards.length <= 1) return
    const newCards = [...cards]
    newCards.splice(index, 1)
    setCards(newCards)
  }

  const handleChange = (index: number, field: keyof NewFlashcard, value: string) => {
    const newCards = [...cards]
    newCards[index] = { ...newCards[index], [field]: value }
    setCards(newCards)
  }

  const handleImageSelect = (index: number, file: File) => {
    const newCards = [...cards]
    newCards[index].imageFile = file
    newCards[index].imagePreview = URL.createObjectURL(file)
    setCards(newCards)
  }

  const handleSaveDeck = async () => {
    if (!deckSubject.trim()) {
      toast.error('Deck Subject is required')
      return
    }

    const validCards = cards.filter(c => c.question.trim() && c.answer.trim())
    if (validCards.length === 0) {
      toast.error('Add at least one complete flashcard')
      return
    }

    setSaving(true)
    try {
      const deckId = `deck_${Date.now()}`
      
      // 1. Insert Deck
      const { error: deckError } = await supabase.from('flashcard_decks').insert({
        id: deckId,
        subject_name: deckSubject.trim(),
        icon_name: 'brain',
        accent_color: '#3b82f6'
      })
      if (deckError) throw deckError

      // 2. Upload Images and Prepare Cards
      const flashcardsToInsert = []
      
      for (const card of validCards) {
        let imageUrl = null
        if (card.imageFile) {
          const ext = card.imageFile.name.split('.').pop()
          const fileName = `fc_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('flashcard_images')
            .upload(fileName, card.imageFile)
            
          if (uploadError) throw uploadError
          
          const { data: publicUrlData } = supabase.storage
            .from('flashcard_images')
            .getPublicUrl(uploadData.path)
            
          imageUrl = publicUrlData.publicUrl
        }

        flashcardsToInsert.push({
          deck_id: deckId,
          subject_name: deckSubject.trim(),
          chapter_name: 'General',
          category: 'flashcard',
          question: card.question.trim(),
          answer: card.answer.trim(),
          high_yield_pearl: card.pearl.trim() || 'No pearl',
          image_url: imageUrl
        })
      }

      // 3. Insert Flashcards
      const { error: fcError } = await supabase.from('flashcards').insert(flashcardsToInsert)
      if (fcError) throw fcError

      toast.success('Flashcard Deck created!')
      navigate({ to: '/flashcards' })
    } catch (err: any) {
      toast.error('Failed to save deck: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='flex flex-col h-full bg-background'>
      <Header className='border-b'>
        <div className='flex items-center gap-2'>
          <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/flashcards' })}>
            <ArrowLeft className='w-4 h-4' />
          </Button>
          <h1 className='text-lg font-semibold tracking-tight'>Create New Deck</h1>
        </div>
        <div className='ms-auto flex items-center gap-4'>
          <ThemeSwitch />
          <Button onClick={handleSaveDeck} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save & Publish Deck
          </Button>
        </div>
      </Header>
      
      <Main className='flex-1 p-6 overflow-y-auto'>
        <div className='max-w-3xl mx-auto space-y-8'>
          <div className='p-6 border rounded-xl bg-card'>
            <Label className="text-base font-semibold">Subject / Deck Name</Label>
            <div className="mt-2">
              <Select value={deckSubject} onValueChange={setDeckSubject}>
                <SelectTrigger className="w-full text-lg h-12">
                  <SelectValue placeholder="Select a medical subject..." />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='space-y-6'>
            <h2 className='text-lg font-semibold'>Flashcards ({cards.length})</h2>
            {cards.map((card, idx) => (
              <div key={idx} className='p-6 transition-all border rounded-xl bg-card hover:border-primary/50'>
                <div className='flex items-center justify-between mb-4'>
                  <span className='text-sm font-bold text-muted-foreground'>Card #{idx + 1}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveCard(idx)} disabled={cards.length === 1}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
                
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div className='space-y-4'>
                    <div>
                      <Label>Front: Clinical Question</Label>
                      <Textarea 
                        placeholder="What is the most common cause of..." 
                        className="mt-1 resize-none h-24"
                        value={card.question}
                        onChange={(e) => handleChange(idx, 'question', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label>Front Image (Optional)</Label>
                      <label className='flex items-center justify-center w-full h-24 mt-1 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 overflow-hidden relative'>
                        {card.imagePreview ? (
                          <img src={card.imagePreview} alt="Preview" className="object-cover w-full h-full" />
                        ) : (
                          <div className='flex flex-col items-center gap-1 text-muted-foreground'>
                            <Upload className="w-5 h-5" />
                            <span className="text-xs">Upload Slide/Scan</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          if (e.target.files?.[0]) handleImageSelect(idx, e.target.files[0])
                        }} />
                      </label>
                    </div>
                  </div>

                  <div className='space-y-4'>
                    <div>
                      <Label>Back: Answer</Label>
                      <Textarea 
                        placeholder="Provide the direct answer..." 
                        className="mt-1 resize-none h-24"
                        value={card.answer}
                        onChange={(e) => handleChange(idx, 'answer', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Back: Golden Pearl (High Yield)</Label>
                      <Textarea 
                        placeholder="One liner key takeaway..." 
                        className="mt-1 resize-none h-24 bg-yellow-50/50 dark:bg-yellow-950/20"
                        value={card.pearl}
                        onChange={(e) => handleChange(idx, 'pearl', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <Button variant="outline" className="w-full py-8 border-dashed" onClick={handleAddCard}>
              <Plus className="w-5 h-5 mr-2" /> Add Another Flashcard
            </Button>
          </div>
        </div>
      </Main>
    </div>
  )
}
