import { useState, useEffect } from 'react'
import { Plus, Search, Layers, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

export interface Course {
  id: string
  title: string
  description?: string
  created_at: string
}

export function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)

  // Form State
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  const fetchCourses = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        toast.error('Failed to load courses: ' + error.message)
        return
      }

      setCourses(data || [])
    } catch (e: any) {
      toast.error('Error fetching courses: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  const handleOpenNewDialog = () => {
    setEditingCourse(null)
    setFormTitle('')
    setFormDescription('')
    setIsDialogOpen(true)
  }

  const handleOpenEditDialog = (course: Course) => {
    setEditingCourse(course)
    setFormTitle(course.title)
    setFormDescription(course.description || '')
    setIsDialogOpen(true)
  }

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      toast.error('Course title is required')
      return
    }

    setFormSaving(true)
    const payload = {
      title: formTitle.trim(),
      description: formDescription.trim() || null,
    }

    try {
      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update(payload)
          .eq('id', editingCourse.id)

        if (error) throw error
        toast.success(`Updated ${formTitle}!`)
      } else {
        const { error } = await supabase.from('courses').insert([payload])
        if (error) throw error
        toast.success(`Created new course: ${formTitle}!`)
      }

      setIsDialogOpen(false)
      fetchCourses()
    } catch (err: any) {
      toast.error('Save failed: ' + err.message)
    } finally {
      setFormSaving(false)
    }
  }

  const handleDeleteCourse = async (course: Course) => {
    if (!confirm(`Are you sure you want to delete ${course.title}? All users and content associated with this course will be affected.`)) {
      return
    }

    try {
      const { error } = await supabase.from('courses').delete().eq('id', course.id)
      if (error) throw error
      toast.success(`Deleted ${course.title}`)
      fetchCourses()
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message)
    }
  }

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <Layers className='h-5 w-5 text-primary' />
          <h1 className='text-lg font-semibold tracking-tight'>Target Courses</h1>
        </div>
        <div className='ms-auto flex items-center gap-2'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Manage Courses</h2>
            <p className='text-sm text-muted-foreground'>
              Add and configure target exams / courses (e.g., NEET PG, USMLE) for your students.
            </p>
          </div>
          <Button onClick={handleOpenNewDialog} className='gap-2'>
            <Plus className='h-4 w-4' />
            Add Course
          </Button>
        </div>

        <div className='flex flex-col gap-4 mb-6 sm:flex-row sm:items-center'>
          <div className='relative w-full max-w-sm'>
            <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              type='search'
              placeholder='Search courses...'
              className='pl-8 bg-background'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className='flex items-center justify-center p-12'>
            <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className='rounded-lg border border-dashed p-12 text-center'>
            <h3 className='text-lg font-semibold'>No courses found</h3>
            <p className='text-sm text-muted-foreground mt-1'>
              Try adjusting your search query or add a new course.
            </p>
          </div>
        ) : (
          <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {filteredCourses.map((course) => (
              <Card key={course.id} className='flex flex-col overflow-hidden hover:shadow-md transition-all'>
                <CardHeader className='pb-4 border-b bg-muted/20'>
                  <div className='flex items-start justify-between'>
                    <div>
                      <CardTitle className='text-lg leading-tight'>{course.title}</CardTitle>
                      {course.description && (
                        <CardDescription className='mt-2 line-clamp-2'>
                          {course.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='flex-1 p-4 flex flex-col justify-end'>
                  <div className='flex items-center justify-end gap-2 pt-4 border-t'>
                    <Button variant='outline' size='sm' onClick={() => handleOpenEditDialog(course)}>
                      <Edit2 className='h-4 w-4 mr-2' />
                      Edit
                    </Button>
                    <Button
                      variant='outline'
                      size='icon'
                      className='text-destructive hover:bg-destructive hover:text-destructive-foreground'
                      onClick={() => handleDeleteCourse(course)}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className='sm:max-w-[425px]'>
            <form onSubmit={handleSaveCourse}>
              <DialogHeader>
                <DialogTitle>{editingCourse ? 'Edit Course' : 'Create New Course'}</DialogTitle>
                <DialogDescription>
                  Configure the target exam or course package.
                </DialogDescription>
              </DialogHeader>
              <div className='grid gap-4 py-4'>
                <div className='grid gap-2'>
                  <Label htmlFor='title'>Course Title *</Label>
                  <Input
                    id='title'
                    placeholder='e.g., NEET PG 2026'
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='description'>Description</Label>
                  <Input
                    id='description'
                    placeholder='Brief description of the course'
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type='button' variant='outline' onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type='submit' disabled={formSaving}>
                  {formSaving ? 'Saving...' : 'Save Course'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Main>
    </>
  )
}
