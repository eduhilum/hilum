import { useState, useEffect } from 'react'
import { Plus, Search, BookOpen, Layers, Clock, Edit2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, Subject } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

export function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)

  // Form State
  const [formId, setFormId] = useState('')
  const [formName, setFormName] = useState('')
  const [formCategories, setFormCategories] = useState('Pre-Clinical, High-Yield')
  const [formDuration, setFormDuration] = useState(25)
  const [formIconName, setFormIconName] = useState('menu-book')
  const [formSaving, setFormSaving] = useState(false)

  const fetchSubjects = async () => {
    setLoading(true)
    try {
      const [
        { data: subjectsData, error: subErr },
        { data: chaptersData },
        { data: topicsData },
        { data: questionsData },
        { data: videosData },
      ] = await Promise.all([
        supabase.from('subjects').select('*').order('name', { ascending: true }),
        supabase.from('chapters').select('id, subject_id'),
        supabase.from('topics').select('id, chapter_id, duration_minutes'),
        supabase.from('mcq_questions').select('id, topic_id'),
        supabase.from('video_classes').select('id, subject_id, duration_seconds'),
      ])

      if (subErr) {
        toast.error('Failed to load subjects: ' + subErr.message)
        return
      }

      // Group chapters by subject_id
      const chaptersBySubject: Record<string, string[]> = {}
      chaptersData?.forEach((c) => {
        if (!chaptersBySubject[c.subject_id]) chaptersBySubject[c.subject_id] = []
        chaptersBySubject[c.subject_id].push(c.id)
      })

      // Map topic -> chapter and chapter -> subject
      const topicToChapter: Record<string, string> = {}
      const chapterToSubject: Record<string, string> = {}
      chaptersData?.forEach((c) => {
        chapterToSubject[c.id] = c.subject_id
      })
      topicsData?.forEach((t) => {
        topicToChapter[t.id] = t.chapter_id
      })

      // Count MCQs per subject
      const questionsBySubject: Record<string, number> = {}
      questionsData?.forEach((q) => {
        if (q.topic_id) {
          const chapId = topicToChapter[q.topic_id]
          if (chapId) {
            const subId = chapterToSubject[chapId]
            if (subId) {
              questionsBySubject[subId] = (questionsBySubject[subId] || 0) + 1
            }
          }
        }
      })

      // Count videos and calculate real hours per subject
      const videosBySubject: Record<string, number> = {}
      const durationHoursBySubject: Record<string, number> = {}
      videosData?.forEach((v) => {
        videosBySubject[v.subject_id] = (videosBySubject[v.subject_id] || 0) + 1
        const hrs = (v.duration_seconds || 0) / 3600
        durationHoursBySubject[v.subject_id] = (durationHoursBySubject[v.subject_id] || 0) + hrs
      })

      // Also sum topic duration minutes if no videos exist
      const topicDurationBySubject: Record<string, number> = {}
      topicsData?.forEach((t) => {
        const subId = chapterToSubject[t.chapter_id]
        if (subId) {
          topicDurationBySubject[subId] =
            (topicDurationBySubject[subId] || 0) + (t.duration_minutes || 0) / 60
        }
      })

      const enhanced = (subjectsData || []).map((s) => ({
        ...s,
        chapters_count: chaptersBySubject[s.id]?.length || 0,
        mcq_count: questionsBySubject[s.id] || 0,
        video_count: videosBySubject[s.id] || 0,
        duration_hours: Math.round(
          durationHoursBySubject[s.id] || topicDurationBySubject[s.id] || 0
        ),
      }))

      setSubjects(enhanced as Subject[])
    } catch (e: any) {
      toast.error('Error fetching subjects: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [])

  const handleOpenNewDialog = () => {
    setEditingSubject(null)
    setFormId('')
    setFormName('')
    setFormCategories('Pre-Clinical, High-Yield')
    setFormDuration(25)
    setFormIconName('menu-book')
    setIsDialogOpen(true)
  }

  const handleOpenEditDialog = (sub: Subject) => {
    setEditingSubject(sub)
    setFormId(sub.id)
    setFormName(sub.name)
    setFormCategories(sub.categories ? sub.categories.join(', ') : '')
    setFormDuration(sub.duration_hours || 25)
    setFormIconName(sub.icon_name || 'menu-book')
    setIsDialogOpen(true)
  }

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast.error('Subject name is required')
      return
    }

    const subId = editingSubject ? editingSubject.id : formId.trim().toLowerCase().replace(/\s+/g, '-')
    if (!subId) {
      toast.error('Subject ID is required')
      return
    }

    setFormSaving(true)
    const categoriesArray = formCategories
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)

    const payload = {
      id: subId,
      name: formName.trim(),
      categories: categoriesArray,
      chapters_count: editingSubject ? editingSubject.chapters_count : 0,
      mcq_count: editingSubject ? editingSubject.mcq_count : 0,
      duration_hours: Number(formDuration) || 0,
      video_count: editingSubject ? editingSubject.video_count : 0,
      icon_name: formIconName.trim() || 'menu-book',
      icon_bg_color: '#e7eeff',
      icon_color: '#0059b9',
    }

    try {
      if (editingSubject) {
        const { error } = await supabase
          .from('subjects')
          .update(payload)
          .eq('id', editingSubject.id)

        if (error) throw error
        toast.success(`Updated ${formName}!`)
      } else {
        const { error } = await supabase.from('subjects').insert([payload])
        if (error) throw error
        toast.success(`Created new subject: ${formName}!`)
      }

      setIsDialogOpen(false)
      fetchSubjects()
    } catch (err: any) {
      toast.error('Save failed: ' + err.message)
    } finally {
      setFormSaving(false)
    }
  }

  const handleDeleteSubject = async (sub: Subject) => {
    if (!confirm(`Are you sure you want to delete ${sub.name}? All associated chapters and questions will also be affected.`)) {
      return
    }

    try {
      const { error } = await supabase.from('subjects').delete().eq('id', sub.id)
      if (error) throw error
      toast.success(`Deleted ${sub.name}`)
      fetchSubjects()
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message)
    }
  }

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <BookOpen className='h-5 w-5 text-primary' />
          <h1 className='text-lg font-semibold tracking-tight'>Medical Curriculum Subjects</h1>
        </div>
        <div className='ms-auto flex items-center gap-2'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>All 19 Medical Specialties</h2>
            <p className='text-sm text-muted-foreground'>
              Manage medical subjects, active chapter curricula, and question quotas in DocLock.
            </p>
          </div>
          <Button onClick={handleOpenNewDialog} className='gap-2'>
            <Plus className='h-4 w-4' />
            Add Subject
          </Button>
        </div>

        {/* Search & Filter Bar */}
        <div className='flex items-center gap-4 mb-6 max-w-md'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search subjects by name or ID...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9'
            />
          </div>
          <Badge variant='outline' className='text-xs py-1.5 px-3'>
            {filteredSubjects.length} of {subjects.length} Subjects
          </Badge>
        </div>

        {/* Subjects Grid */}
        {loading ? (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Card key={n} className='animate-pulse h-40 bg-muted/40' />
            ))}
          </div>
        ) : filteredSubjects.length === 0 ? (
          <Card className='p-12 text-center'>
            <AlertCircle className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
            <h3 className='text-lg font-semibold mb-1'>No subjects found</h3>
            <p className='text-sm text-muted-foreground mb-4'>
              {searchQuery ? `No subjects match "${searchQuery}"` : 'Your database currently has no subjects.'}
            </p>
            <Button onClick={handleOpenNewDialog}>Create Your First Subject</Button>
          </Card>
        ) : (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {filteredSubjects.map((sub) => (
              <Card key={sub.id} className='relative overflow-hidden transition-all hover:shadow-md border-border/80'>
                <CardHeader className='pb-3'>
                  <div className='flex items-start justify-between'>
                    <div className='space-y-1'>
                      <CardTitle className='text-lg flex items-center gap-2'>
                        {sub.name}
                      </CardTitle>
                      <CardDescription className='font-mono text-xs text-muted-foreground'>
                        id: {sub.id}
                      </CardDescription>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleOpenEditDialog(sub)}
                        className='h-8 w-8 text-muted-foreground hover:text-foreground'
                      >
                        <Edit2 className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleDeleteSubject(sub)}
                        className='h-8 w-8 text-muted-foreground hover:text-destructive'
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='space-y-3 pt-0'>
                  {/* Category badges */}
                  <div className='flex flex-wrap gap-1.5'>
                    {sub.categories && sub.categories.length > 0 ? (
                      sub.categories.map((cat, idx) => (
                        <Badge key={idx} variant='secondary' className='text-[10px] font-medium'>
                          {cat}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant='outline' className='text-[10px]'>General</Badge>
                    )}
                  </div>

                  {/* Metrics Footer */}
                  <div className='grid grid-cols-3 gap-2 border-t pt-3 text-xs text-muted-foreground'>
                    <div className='flex items-center gap-1'>
                      <Layers className='h-3.5 w-3.5 text-primary' />
                      <span>{sub.chapters_count || 0} Ch.</span>
                    </div>
                    <div className='flex items-center gap-1'>
                      <CheckCircle2 className='h-3.5 w-3.5 text-emerald-600' />
                      <span>{sub.mcq_count || 0} MCQs</span>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Clock className='h-3.5 w-3.5 text-amber-600' />
                      <span>{sub.duration_hours || 0} hrs</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Subject Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className='sm:max-w-md'>
            <form onSubmit={handleSaveSubject}>
              <DialogHeader>
                <DialogTitle>{editingSubject ? 'Edit Subject' : 'Add New Medical Subject'}</DialogTitle>
                <DialogDescription>
                  Configure subject details and high-yield categories for DocLock.
                </DialogDescription>
              </DialogHeader>

              <div className='grid gap-4 py-4'>
                <div className='space-y-2'>
                  <Label htmlFor='sub-name'>Subject Name</Label>
                  <Input
                    id='sub-name'
                    placeholder='e.g. Pharmacology'
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                {!editingSubject && (
                  <div className='space-y-2'>
                    <Label htmlFor='sub-id'>Subject Slug / ID</Label>
                    <Input
                      id='sub-id'
                      placeholder='e.g. pharmacology'
                      value={formId}
                      onChange={(e) => setFormId(e.target.value)}
                      required
                    />
                    <p className='text-[11px] text-muted-foreground'>
                      Unique lowercase identifier used in curriculum routing.
                    </p>
                  </div>
                )}

                <div className='space-y-2'>
                  <Label htmlFor='sub-categories'>Categories (comma-separated)</Label>
                  <Input
                    id='sub-categories'
                    placeholder='Pre-Clinical, High-Yield, Short Subject'
                    value={formCategories}
                    onChange={(e) => setFormCategories(e.target.value)}
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='sub-duration'>Estimated Hours</Label>
                    <Input
                      id='sub-duration'
                      type='number'
                      min={1}
                      value={formDuration}
                      onChange={(e) => setFormDuration(Number(e.target.value))}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='sub-icon'>Material Icon Name</Label>
                    <Input
                      id='sub-icon'
                      placeholder='e.g. psychology'
                      value={formIconName}
                      onChange={(e) => setFormIconName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type='button' variant='outline' onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type='submit' disabled={formSaving}>
                  {formSaving ? 'Saving...' : editingSubject ? 'Update Subject' : 'Create Subject'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Main>
    </>
  )
}
