import { useState, useEffect } from 'react'
import { Plus, Search, ClipboardList, Edit2, Trash2, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, Assessment } from '@/lib/supabase'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

const TEST_CATEGORIES = [
  { value: 'grand-tests', label: 'Grand Tests' },
]

export function GrandMocksPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory] = useState<string>('all')
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null)
  const [formSaving, setFormSaving] = useState(false)

  // Form State
  const [formTitle, setFormTitle] = useState('')
  const [formCourseId, setFormCourseId] = useState('')
  const [formCategory, setFormCategory] = useState('grand-tests')
  const [formTag, setFormTag] = useState('Available')
  const [formTestsCount, setFormTestsCount] = useState(1)
  const [formMcqsCount, setFormMcqsCount] = useState(300)
  const [formDuration, setFormDuration] = useState(3.0)
  const [formIconName, setFormIconName] = useState('assignment')
  
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formEnrolledCount, setFormEnrolledCount] = useState(0)

  const fetchAssessments = async () => {
    setLoading(true)
    try {
      const [{ data, error }, { data: coursesData }] = await Promise.all([
        supabase
          .from('assessments')
          .select('*')
          .eq('category', 'grand-tests')
          .order('created_at', { ascending: false }),
        supabase.from('courses').select('id, title').order('title')
      ])

      if (error) {
        toast.error('Failed to load assessments: ' + error.message)
        return
      }

      setAssessments(data || [])
      
      if (coursesData && coursesData.length > 0) {
        setCourses(coursesData)
        setFormCourseId(coursesData[0].id)
      }
    } catch (e: any) {
      toast.error('Error fetching assessments: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssessments()
  }, [])

  const handleOpenNewDialog = () => {
    setEditingAssessment(null)
    setFormTitle('')
    if (courses.length > 0) setFormCourseId(courses[0].id)
    setFormCategory('grand-tests')
    setFormTag('Available')
    setFormTestsCount(1)
    setFormMcqsCount(300)
    setFormDuration(3.0)
    setFormIconName('assignment')
    setFormStartTime('')
    setFormEndTime('')
    setFormEnrolledCount(0)
    setIsDialogOpen(true)
  }

  const handleOpenEditDialog = (assessment: Assessment & { course_id?: string }) => {
    setEditingAssessment(assessment)
    setFormTitle(assessment.title)
    setFormCourseId(assessment.course_id || (courses.length > 0 ? courses[0].id : ''))
    setFormCategory(assessment.category)
    setFormTag(assessment.tag)
    setFormTestsCount(assessment.tests_count)
    setFormMcqsCount(assessment.mcqs_count)
    setFormDuration(assessment.duration_hours)
    setFormIconName(assessment.icon_name)
    setFormStartTime(assessment.start_time ? new Date(assessment.start_time).toISOString().slice(0, 16) : '')
    setFormEndTime(assessment.end_time ? new Date(assessment.end_time).toISOString().slice(0, 16) : '')
    setFormEnrolledCount(assessment.enrolled_count || 0)
    setIsDialogOpen(true)
  }

  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      toast.error('Test title is required')
      return
    }

    setFormSaving(true)

    // A simple preset color logic based on category, in a real app these might be customizable
    let tag_bg = '#dcfce7'
    let tag_text = '#166534'
    let icon_bg = '#e7eeff'
    let icon_color = '#0059b9'

    if (formCategory === 'grand-tests') {
      tag_bg = '#dbeafe'; tag_text = '#1e40af';
      icon_bg = '#dbeafe'; icon_color = '#1e40af';
    } else if (formCategory === 'pyqs') {
      tag_bg = '#fef3c7'; tag_text = '#92400e';
      icon_bg = '#fef3c7'; icon_color = '#92400e';
    }

    const payload = {
      title: formTitle.trim(),
      course_id: formCourseId || null,
      category: formCategory,
      tag: formTag.trim() || 'Available',
      tag_bg_color: tag_bg,
      tag_text_color: tag_text,
      tests_count: Number(formTestsCount) || 1,
      mcqs_count: Number(formMcqsCount) || 0,
      duration_hours: Number(formDuration) || 0,
      icon_name: formIconName.trim() || 'assignment',
      icon_bg_color: icon_bg,
      icon_color: icon_color,
      start_time: formStartTime || null,
      end_time: formEndTime || null,
      enrolled_count: Number(formEnrolledCount) || 0,
    }

    try {
      if (editingAssessment) {
        const { error } = await supabase
          .from('assessments')
          .update(payload)
          .eq('id', editingAssessment.id)

        if (error) throw error
        toast.success(`Updated ${formTitle}!`)
      } else {
        const { error } = await supabase.from('assessments').insert([payload])
        if (error) throw error
        toast.success(`Created new assessment: ${formTitle}!`)
      }

      setIsDialogOpen(false)
      fetchAssessments()
    } catch (err: any) {
      toast.error('Save failed: ' + err.message)
    } finally {
      setFormSaving(false)
    }
  }

  const handleDeleteAssessment = async (assessment: Assessment) => {
    if (!confirm(`Are you sure you want to delete ${assessment.title}? All associated questions will be deleted.`)) {
      return
    }

    try {
      const { error } = await supabase.from('assessments').delete().eq('id', assessment.id)
      if (error) throw error
      toast.success(`Deleted ${assessment.title}`)
      fetchAssessments()
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message)
    }
  }

  const filteredAssessments = assessments.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === 'all' || a.category === filterCategory
    return matchesSearch && matchesCategory
  })

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <ClipboardList className='h-5 w-5 text-primary' />
          <h1 className='text-lg font-semibold tracking-tight'>Tests & Assessments</h1>
        </div>
        <div className='ms-auto flex items-center gap-2'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Grand Mocks
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage grand tests and mock exams.
            </p>
          </div>
          <Button onClick={handleOpenNewDialog} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Create Grand Mock
          </Button>
        </div>

        {/* Search & Filter Bar */}
        <div className='flex flex-col sm:flex-row sm:items-center gap-4 mb-6'>
          <div className='relative flex-1 max-w-md'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search grand mocks by title...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9'
            />
          </div>

          <Badge variant='outline' className='text-xs py-1.5 px-3 whitespace-nowrap ml-auto'>
            {filteredAssessments.length} Grand Mocks
          </Badge>
        </div>

        {/* Tests Grid */}
        {loading ? (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Card key={n} className='animate-pulse h-40 bg-muted/40' />
            ))}
          </div>
        ) : filteredAssessments.length === 0 ? (
          <Card className='p-12 text-center'>
            <AlertCircle className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
            <h3 className='text-lg font-semibold mb-1'>No grand mocks found</h3>
            <p className='text-sm text-muted-foreground mb-4'>
              {searchQuery ? `No grand mocks match "${searchQuery}"` : 'Your database currently has no grand mocks.'}
            </p>
            <Button onClick={handleOpenNewDialog} className="bg-blue-600 hover:bg-blue-700">Create Your First Grand Mock</Button>
          </Card>
        ) : (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {filteredAssessments.map((test) => (
              <Card key={test.id} className='relative overflow-hidden transition-all hover:shadow-md border-border/80'>
                <CardHeader className='pb-3'>
                  <div className='flex items-start justify-between'>
                    <div className='space-y-1 pr-6'>
                      <CardTitle className='text-base leading-tight font-semibold'>
                        {test.title}
                      </CardTitle>
                      <CardDescription className='text-xs font-medium uppercase tracking-wider' style={{ color: test.icon_color }}>
                        {test.category.replace('-', ' ')}
                      </CardDescription>
                    </div>
                    <div className='flex items-center gap-1 absolute top-3 right-3'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleOpenEditDialog(test)}
                        className='h-7 w-7 text-muted-foreground hover:text-foreground'
                      >
                        <Edit2 className='h-3.5 w-3.5' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleDeleteAssessment(test)}
                        className='h-7 w-7 text-muted-foreground hover:text-destructive'
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='space-y-3 pt-0'>
                  {/* Tags */}
                  <div className='flex flex-wrap gap-1.5'>
                    <Badge variant='secondary' className='text-[10px] font-medium' style={{ backgroundColor: test.tag_bg_color, color: test.tag_text_color }}>
                      {test.tag}
                    </Badge>
                  </div>

                  {/* Metrics Footer */}
                  <div className='grid grid-cols-2 gap-2 border-t pt-3 text-xs text-muted-foreground'>
                    <div className='flex items-center gap-1'>
                      <CheckCircle2 className='h-3.5 w-3.5 text-emerald-600' />
                      <span>{test.mcqs_count || 0} MCQs</span>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Clock className='h-3.5 w-3.5 text-amber-600' />
                      <span>{test.duration_hours || 0} hrs</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      className="w-full text-xs font-medium border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                      onClick={() => {
                        window.location.href = `/questions?assessment_id=${test.id}`
                      }}
                    >
                      <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                      Manage Questions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className='sm:max-w-md'>
            <form onSubmit={handleSaveAssessment}>
              <DialogHeader>
                <DialogTitle>{editingAssessment ? 'Edit Grand Mock' : 'Create New Grand Mock'}</DialogTitle>
                <DialogDescription>
                  {editingAssessment ? 'Update the details for this grand mock.' : 'Add a new grand mock to the system.'}
                </DialogDescription>
              </DialogHeader>

              <div className='grid gap-4 py-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='test-title'>Test Title</Label>
                    <Input
                      id='test-title'
                      placeholder='e.g. NEET PG Grand Test 1'
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Target Course *</Label>
                    <Select value={formCourseId} onValueChange={setFormCourseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='test-category'>Category</Label>
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger id='test-category'>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEST_CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='test-tag'>UI Tag Text</Label>
                    <Input
                      id='test-tag'
                      placeholder='e.g. Available, New'
                      value={formTag}
                      onChange={(e) => setFormTag(e.target.value)}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='test-mcqs'>Total MCQs</Label>
                    <Input
                      id='test-mcqs'
                      type='number'
                      min={0}
                      value={formMcqsCount}
                      onChange={(e) => setFormMcqsCount(Number(e.target.value))}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='test-duration'>Duration (Hours)</Label>
                    <Input
                      id='test-duration'
                      type='number'
                      step="0.5"
                      min={0}
                      value={formDuration}
                      onChange={(e) => setFormDuration(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='test-count'>Tests Count</Label>
                    <Input
                      id='test-count'
                      type='number'
                      min={1}
                      value={formTestsCount}
                      onChange={(e) => setFormTestsCount(Number(e.target.value))}
                    />
                    <p className='text-[10px] text-muted-foreground leading-tight'>Usually 1, higher if this represents a bundle.</p>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='test-icon'>Material Icon</Label>
                    <Input
                      id='test-icon'
                      placeholder='e.g. assignment'
                      value={formIconName}
                      onChange={(e) => setFormIconName(e.target.value)}
                    />
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='test-start'>Start Time</Label>
                    <Input
                      id='test-start'
                      type='datetime-local'
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='test-end'>End Time</Label>
                    <Input
                      id='test-end'
                      type='datetime-local'
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='test-enrolled'>Enrolled Count (Auto-Calculated)</Label>
                  <Input
                    id='test-enrolled'
                    type='number'
                    min={0}
                    value={formEnrolledCount}
                    disabled
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
                  <p className='text-[10px] text-muted-foreground leading-tight'>Automatically updated when students enroll in the app.</p>
                </div>

              </div>

              <DialogFooter>
                <Button type='button' variant='outline' onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type='submit' disabled={formSaving}>
                  {formSaving ? 'Saving...' : editingAssessment ? 'Update Test' : 'Create Test'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Main>
    </>
  )
}
