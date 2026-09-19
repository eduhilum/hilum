import { useState, useEffect } from 'react'
import { Plus, Layers, BookOpen, Trash2, Flame, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, Subject, Chapter, Topic } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

export function ChaptersTopicsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [topics, setTopics] = useState<Record<string, Topic[]>>({})
  const [loading, setLoading] = useState(false)

  // Modals state
  const [isChapterDialogOpen, setIsChapterDialogOpen] = useState(false)
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false)
  const [targetChapterId, setTargetChapterId] = useState<string>('')

  // Chapter Form
  const [chapterTitle, setChapterTitle] = useState('')
  const [chapterNumber, setChapterNumber] = useState(1)
  const [savingChapter, setSavingChapter] = useState(false)

  // Topic Form
  const [topicTitle, setTopicTitle] = useState('')
  const [topicDuration, setTopicDuration] = useState(30)
  const [topicMcqCount, setTopicMcqCount] = useState(0)
  const [topicIsHighYield, setTopicIsHighYield] = useState(true)
  const [savingTopic, setSavingTopic] = useState(false)

  useEffect(() => {
    supabase
      .from('subjects')
      .select('*')
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSubjects(data as Subject[])
          setSelectedSubjectId(data[0].id)
        }
      })
  }, [])

  const fetchCurriculum = async (subjectId: string) => {
    if (!subjectId) return
    setLoading(true)
    try {
      const { data: chapData, error: chapError } = await supabase
        .from('chapters')
        .select('*')
        .eq('subject_id', subjectId)
        .order('chapter_number', { ascending: true })

      if (chapError) throw chapError
      const chaps = (chapData as Chapter[]) || []
      setChapters(chaps)

      if (chaps.length > 0) {
        const chapIds = chaps.map((c) => c.id)
        const [{ data: topData, error: topError }, { data: qData }] = await Promise.all([
          supabase
            .from('topics')
            .select('*')
            .in('chapter_id', chapIds)
            .order('title', { ascending: true }),
          supabase.from('mcq_questions').select('id, topic_id'),
        ])

        if (topError) throw topError

        const questionsByTopic: Record<string, number> = {}
        qData?.forEach((q) => {
          if (q.topic_id) {
            questionsByTopic[q.topic_id] = (questionsByTopic[q.topic_id] || 0) + 1
          }
        })

        const mapped: Record<string, Topic[]> = {}
        chaps.forEach((c) => {
          mapped[c.id] = []
        })
        ;(topData as Topic[])?.forEach((t) => {
          if (mapped[t.chapter_id]) {
            mapped[t.chapter_id].push({
              ...t,
              mcq_count: questionsByTopic[t.id] || 0,
            })
          }
        })
        setTopics(mapped)
      } else {
        setTopics({})
      }
    } catch (e: any) {
      toast.error('Failed to load curriculum: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedSubjectId) {
      fetchCurriculum(selectedSubjectId)
    }
  }, [selectedSubjectId])

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chapterTitle.trim() || !selectedSubjectId) return

    setSavingChapter(true)
    try {
      const { error } = await supabase.from('chapters').insert([
        {
          subject_id: selectedSubjectId,
          title: chapterTitle.trim(),
          chapter_number: Number(chapterNumber) || chapters.length + 1,
        },
      ])

      if (error) throw error
      toast.success('Chapter added successfully!')
      setIsChapterDialogOpen(false)
      setChapterTitle('')
      fetchCurriculum(selectedSubjectId)
    } catch (err: any) {
      toast.error('Error adding chapter: ' + err.message)
    } finally {
      setSavingChapter(false)
    }
  }

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topicTitle.trim() || !targetChapterId) return

    setSavingTopic(true)
    try {
      const { error } = await supabase.from('topics').insert([
        {
          chapter_id: targetChapterId,
          title: topicTitle.trim(),
          duration_minutes: Number(topicDuration) || 30,
          mcq_count: Number(topicMcqCount) || 0,
          is_high_yield: topicIsHighYield,
        },
      ])

      if (error) throw error
      toast.success('Topic added successfully!')
      setIsTopicDialogOpen(false)
      setTopicTitle('')
      fetchCurriculum(selectedSubjectId)
    } catch (err: any) {
      toast.error('Error adding topic: ' + err.message)
    } finally {
      setSavingTopic(false)
    }
  }

  const handleDeleteChapter = async (chap: Chapter) => {
    if (!confirm(`Delete Chapter: "${chap.title}"? All associated topics and questions will also be removed.`)) return
    try {
      const { error } = await supabase.from('chapters').delete().eq('id', chap.id)
      if (error) throw error
      toast.success('Chapter deleted')
      fetchCurriculum(selectedSubjectId)
    } catch (e: any) {
      toast.error('Delete failed: ' + e.message)
    }
  }

  const handleDeleteTopic = async (top: Topic) => {
    if (!confirm(`Delete Topic: "${top.title}"?`)) return
    try {
      const { error } = await supabase.from('topics').delete().eq('id', top.id)
      if (error) throw error
      toast.success('Topic deleted')
      fetchCurriculum(selectedSubjectId)
    } catch (e: any) {
      toast.error('Delete failed: ' + e.message)
    }
  }

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId)

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <Layers className='h-5 w-5 text-primary' />
          <h1 className='text-lg font-semibold tracking-tight'>Chapters & Topics Curriculum</h1>
        </div>
        <div className='ms-auto flex items-center gap-2'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {/* Subject Header & Selector */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Curriculum Hierarchy</h2>
            <p className='text-sm text-muted-foreground'>
              Organize syllabus chapters and high-yield question topics for medical students.
            </p>
          </div>

          <div className='flex items-center gap-3'>
            <div className='w-64'>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder='Select Subject' />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => {
                setChapterNumber(chapters.length + 1)
                setIsChapterDialogOpen(true)
              }}
              className='gap-2'
            >
              <Plus className='h-4 w-4' />
              Add Chapter
            </Button>
          </div>
        </div>

        {/* Chapters & Topics List */}
        {loading ? (
          <div className='space-y-4'>
            {[1, 2, 3].map((n) => (
              <Card key={n} className='animate-pulse h-32 bg-muted/40' />
            ))}
          </div>
        ) : chapters.length === 0 ? (
          <Card className='p-12 text-center'>
            <AlertCircle className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
            <h3 className='text-lg font-semibold mb-1'>No chapters in {selectedSubject?.name || 'this subject'}</h3>
            <p className='text-sm text-muted-foreground mb-4'>
              Get started by adding the first chapter for this subject.
            </p>
            <Button onClick={() => setIsChapterDialogOpen(true)}>Add Chapter</Button>
          </Card>
        ) : (
          <div className='space-y-6'>
            {chapters.map((chap) => {
              const chapterTopics = topics[chap.id] || []
              return (
                <Card key={chap.id} className='border-border/80'>
                  <CardHeader className='pb-3'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm'>
                          {chap.chapter_number}
                        </div>
                        <div>
                          <CardTitle className='text-base'>{chap.title}</CardTitle>
                          <CardDescription className='text-xs'>
                            {chapterTopics.length} Topics configured
                          </CardDescription>
                        </div>
                      </div>

                      <div className='flex items-center gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            setTargetChapterId(chap.id)
                            setIsTopicDialogOpen(true)
                          }}
                          className='gap-1.5 text-xs h-8'
                        >
                          <Plus className='h-3.5 w-3.5' />
                          Add Topic
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => handleDeleteChapter(chap)}
                          className='h-8 w-8 text-muted-foreground hover:text-destructive'
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className='pt-0'>
                    {chapterTopics.length === 0 ? (
                      <div className='py-6 text-center text-xs text-muted-foreground border rounded-lg bg-muted/20'>
                        No topics under this chapter yet. Click "Add Topic" to create one.
                      </div>
                    ) : (
                      <div className='divide-y rounded-lg border bg-card text-xs'>
                        {chapterTopics.map((top) => (
                          <div
                            key={top.id}
                            className='flex items-center justify-between p-3 transition-colors hover:bg-muted/40'
                          >
                            <div className='flex items-center gap-3'>
                              <BookOpen className='h-4 w-4 text-muted-foreground' />
                              <div>
                                <span className='font-medium text-foreground'>{top.title}</span>
                                <div className='flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5'>
                                  <span>{top.mcq_count || 0} Questions</span>
                                  <span>•</span>
                                  <span>~{top.duration_minutes || 30} mins drill</span>
                                </div>
                              </div>
                            </div>

                            <div className='flex items-center gap-3'>
                              {top.is_high_yield && (
                                <Badge variant='secondary' className='text-[10px] gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'>
                                  <Flame className='h-3 w-3 fill-amber-500 text-amber-500' />
                                  High-Yield
                                </Badge>
                              )}
                              <Button
                                variant='ghost'
                                size='icon'
                                onClick={() => handleDeleteTopic(top)}
                                className='h-7 w-7 text-muted-foreground hover:text-destructive'
                              >
                                <Trash2 className='h-3.5 w-3.5' />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Add Chapter Dialog */}
        <Dialog open={isChapterDialogOpen} onOpenChange={setIsChapterDialogOpen}>
          <DialogContent className='sm:max-w-md'>
            <form onSubmit={handleAddChapter}>
              <DialogHeader>
                <DialogTitle>Add Chapter</DialogTitle>
                <DialogDescription>
                  Create a curriculum chapter under {selectedSubject?.name}.
                </DialogDescription>
              </DialogHeader>

              <div className='grid gap-4 py-4'>
                <div className='space-y-2'>
                  <Label htmlFor='chap-title'>Chapter Title</Label>
                  <Input
                    id='chap-title'
                    placeholder='e.g. Upper Limb Anatomy'
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    required
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='chap-num'>Chapter Number</Label>
                  <Input
                    id='chap-num'
                    type='number'
                    min={1}
                    value={chapterNumber}
                    onChange={(e) => setChapterNumber(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type='button' variant='outline' onClick={() => setIsChapterDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type='submit' disabled={savingChapter}>
                  {savingChapter ? 'Saving...' : 'Add Chapter'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Topic Dialog */}
        <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
          <DialogContent className='sm:max-w-md'>
            <form onSubmit={handleAddTopic}>
              <DialogHeader>
                <DialogTitle>Add Topic</DialogTitle>
                <DialogDescription>
                  Add a specific drill topic under this chapter.
                </DialogDescription>
              </DialogHeader>

              <div className='grid gap-4 py-4'>
                <div className='space-y-2'>
                  <Label htmlFor='top-title'>Topic Title</Label>
                  <Input
                    id='top-title'
                    placeholder='e.g. Brachial Plexus & Nerve Injuries'
                    value={topicTitle}
                    onChange={(e) => setTopicTitle(e.target.value)}
                    required
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='top-mcq'>MCQ Quota</Label>
                    <Input
                      id='top-mcq'
                      type='number'
                      min={5}
                      value={topicMcqCount}
                      onChange={(e) => setTopicMcqCount(Number(e.target.value))}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='top-dur'>Est. Drill Minutes</Label>
                    <Input
                      id='top-dur'
                      type='number'
                      min={5}
                      value={topicDuration}
                      onChange={(e) => setTopicDuration(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className='flex items-center justify-between rounded-lg border p-3'>
                  <div className='space-y-0.5'>
                    <Label htmlFor='top-hy'>High-Yield Topic</Label>
                    <p className='text-xs text-muted-foreground'>
                      Highlight with a flame badge for rapid revision.
                    </p>
                  </div>
                  <Switch
                    id='top-hy'
                    checked={topicIsHighYield}
                    onCheckedChange={setTopicIsHighYield}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type='button' variant='outline' onClick={() => setIsTopicDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type='submit' disabled={savingTopic}>
                  {savingTopic ? 'Saving...' : 'Add Topic'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Main>
    </>
  )
}
