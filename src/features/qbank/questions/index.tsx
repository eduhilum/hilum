import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Plus,
  Search,
  HelpCircle,
  Trash2,
  Eye,
  Flame,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase, McqQuestion, McqOption } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

export function QuestionsPage() {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<McqQuestion[]>([])
  const [optionsMap, setOptionsMap] = useState<Record<string, McqOption[]>>({})
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')

  // Preview Question Modal
  const [previewQuestion, setPreviewQuestion] = useState<McqQuestion | null>(null)

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [{ data: qData, error: qErr }, { data: optData, error: optErr }] =
        await Promise.all([
          supabase.from('mcq_questions').select('*').order('created_at', { ascending: false }),
          supabase.from('mcq_options').select('*'),
        ])

      if (qErr) throw qErr
      if (optErr) throw optErr

      const optGrouped: Record<string, McqOption[]> = {}
      ;(optData as McqOption[])?.forEach((opt) => {
        if (!optGrouped[opt.question_id]) optGrouped[opt.question_id] = []
        optGrouped[opt.question_id].push(opt)
      })
      setOptionsMap(optGrouped)

      setQuestions((qData as McqQuestion[]) || [])
    } catch (e: any) {
      toast.error('Failed to load questions: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      // Options cascade or delete manually
      await supabase.from('mcq_options').delete().eq('question_id', qId)
      const { error } = await supabase.from('mcq_questions').delete().eq('id', qId)
      if (error) throw error

      toast.success('Question deleted!')
      setQuestions((prev) => prev.filter((q) => q.id !== qId))
    } catch (err: any) {
      toast.error('Failed to delete question: ' + err.message)
    }
  }

  // Filter logic
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      (q.clinical_vignette && q.clinical_vignette.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (q.golden_pearl && q.golden_pearl.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (q.explanation && q.explanation.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesDifficulty = difficultyFilter === 'all' || q.difficulty === difficultyFilter

    return matchesSearch && matchesDifficulty
  })

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <HelpCircle className='h-5 w-5 text-primary' />
          <h1 className='text-lg font-semibold tracking-tight'>Question Bank (QBank)</h1>
        </div>
        <div className='ms-auto flex items-center gap-2'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Medical Question Registry</h2>
            <p className='text-sm text-muted-foreground'>
              Author, edit, and review clinical MCQs and high-yield pearls in DocLock.
            </p>
          </div>

          <Button onClick={() => navigate({ to: '/questions/new' })} className='gap-2'>
            <Plus className='h-4 w-4' />
            Create Question
          </Button>
        </div>

        {/* Filters Bar */}
        <div className='flex flex-wrap items-center gap-3 mb-6'>
          <div className='relative min-w-[280px] flex-1'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search clinical vignette or question text...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9'
            />
          </div>

          <div className='w-44'>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger>
                <SelectValue placeholder='All Difficulties' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Difficulties</SelectItem>
                <SelectItem value='easy'>Easy (Recall)</SelectItem>
                <SelectItem value='medium'>Medium (Clinical)</SelectItem>
                <SelectItem value='hard'>Hard (Specialty)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Badge variant='outline' className='py-2 px-3'>
            {filteredQuestions.length} Questions
          </Badge>
        </div>

        {/* Questions Table / List */}
        {loading ? (
          <div className='space-y-4'>
            {[1, 2, 3, 4, 5].map((n) => (
              <Card key={n} className='animate-pulse h-28 bg-muted/40' />
            ))}
          </div>
        ) : filteredQuestions.length === 0 ? (
          <Card className='p-12 text-center'>
            <AlertCircle className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
            <h3 className='text-lg font-semibold mb-1'>No questions found</h3>
            <p className='text-sm text-muted-foreground mb-4'>
              {searchQuery
                ? `No questions match your filter criteria.`
                : 'Your database has no MCQs yet. Create your first clinical question.'}
            </p>
            <Button onClick={() => navigate({ to: '/questions/new' })}>Create New Question</Button>
          </Card>
        ) : (
          <div className='space-y-4'>
            {filteredQuestions.map((q, idx) => {
              const qOptions = optionsMap[q.id] || []
              const correctOption = qOptions.find((o) => o.is_correct)

              return (
                <Card key={q.id} className='transition-all hover:shadow-md border-border/80'>
                  <CardHeader className='pb-2'>
                    <div className='flex items-start justify-between gap-4'>
                      <div className='space-y-1.5 flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <Badge variant='secondary' className='font-mono text-[10px]'>
                            MCQ #{idx + 1}
                          </Badge>
                          {q.is_high_yield && (
                            <Badge variant='secondary' className='text-[10px] gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'>
                              <Flame className='h-3 w-3 fill-amber-500 text-amber-500' />
                              High-Yield
                            </Badge>
                          )}
                          <Badge
                            variant='outline'
                            className={`text-[10px] capitalize ${
                              q.difficulty === 'Hard'
                                ? 'border-red-400 text-red-600 dark:text-red-400'
                                : q.difficulty === 'Moderate'
                                ? 'border-amber-400 text-amber-600 dark:text-amber-400'
                                : 'border-emerald-400 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {q.difficulty}
                          </Badge>
                          {correctOption && (
                            <Badge variant='outline' className='text-[10px] border-emerald-400 text-emerald-600 font-mono'>
                              Ans: {correctOption.option_label}
                            </Badge>
                          )}
                        </div>

                        <CardTitle className='text-sm font-semibold leading-snug whitespace-pre-line'>
                          {q.clinical_vignette}
                        </CardTitle>
                      </div>

                      <div className='flex items-center gap-1.5 shrink-0'>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => setPreviewQuestion(q)}
                          className='h-8 w-8 text-muted-foreground hover:text-foreground'
                          title='Preview Question'
                        >
                          <Eye className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => handleDeleteQuestion(q.id)}
                          className='h-8 w-8 text-muted-foreground hover:text-destructive'
                          title='Delete Question'
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className='pt-0 pb-3'>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2'>
                      {qOptions.map((opt) => (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs ${
                            opt.is_correct
                              ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-muted/30 text-muted-foreground border border-border/40'
                          }`}
                        >
                          <span className='font-mono font-bold'>{opt.option_label}.</span>
                          <span className='truncate'>{opt.option_text}</span>
                          {opt.is_correct && <CheckCircle2 className='ms-auto h-3.5 w-3.5 text-emerald-600 shrink-0' />}
                        </div>
                      ))}
                    </div>

                    {q.golden_pearl && (
                      <div className='mt-3 text-[11px] text-muted-foreground border-t pt-2 line-clamp-1'>
                        <span className='font-semibold text-primary'>Golden Pearl:</span> {q.golden_pearl}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Live Preview Modal */}
        {previewQuestion && (
          <Dialog open={!!previewQuestion} onOpenChange={() => setPreviewQuestion(null)}>
            <DialogContent className='max-w-lg'>
              <DialogHeader>
                <DialogTitle className='flex items-center gap-2'>
                  <span>Question Preview</span>
                  {previewQuestion.is_high_yield && (
                    <Badge variant='secondary' className='text-[10px] gap-1 bg-amber-50 text-amber-700'>
                      <Flame className='h-3 w-3 fill-amber-500 text-amber-500' />
                      High-Yield
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Preview of how this question is stored and displayed in DocLock.
                </DialogDescription>
              </DialogHeader>

              <div className='space-y-4 py-2 text-sm'>
                {previewQuestion.clinical_vignette && (
                  <div className='rounded-lg bg-muted/40 p-3 text-xs leading-relaxed border whitespace-pre-line'>
                    {previewQuestion.clinical_vignette}
                  </div>
                )}

                <div className='space-y-2'>
                  {(optionsMap[previewQuestion.id] || []).map((opt) => (
                    <div
                      key={opt.id}
                      className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                        opt.is_correct
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-medium dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-card text-foreground'
                      }`}
                    >
                      <div className='flex items-center gap-3'>
                        <span className='font-mono font-bold'>{opt.option_label}</span>
                        <span>{opt.option_text}</span>
                      </div>
                      {opt.is_correct && <CheckCircle2 className='h-4 w-4 text-emerald-600' />}
                    </div>
                  ))}
                </div>

                {previewQuestion.golden_pearl && (
                  <div className='rounded-lg bg-primary/5 p-3.5 border border-primary/20 space-y-1'>
                    <div className='font-semibold text-xs text-primary flex items-center gap-1.5'>
                      <Sparkles className='h-4 w-4 text-amber-500' />
                      Clinical Pearl
                    </div>
                    <p className='text-xs leading-relaxed text-foreground'>
                      {previewQuestion.golden_pearl}
                    </p>
                  </div>
                )}

                {previewQuestion.explanation && (
                  <div className='rounded-lg bg-muted/50 p-3.5 border space-y-1'>
                    <div className='font-semibold text-xs text-foreground flex items-center gap-1.5'>
                      <CheckCircle2 className='h-4 w-4 text-emerald-600' />
                      Detailed Explanation
                    </div>
                    <p className='text-xs leading-relaxed text-muted-foreground'>
                      {previewQuestion.explanation}
                    </p>
                  </div>
                )}

                {previewQuestion.reference && (
                  <div className='text-[11px] text-muted-foreground italic'>
                    Citation: {previewQuestion.reference}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </Main>
    </>
  )
}
