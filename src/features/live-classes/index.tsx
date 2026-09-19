import { useState, useEffect } from 'react'
import { MonitorPlay, Search, Calendar, Users, Clock, Video, User, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { supabase, LiveSession, Subject, FacultyProfile } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function LiveClassesPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [facultyList, setFacultyList] = useState<FacultyProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formSaving, setFormSaving] = useState(false)

  // Form State
  const [formTitle, setFormTitle] = useState('')
  const [formSubjectId, setFormSubjectId] = useState('')
  const [formChapter, setFormChapter] = useState('')
  const [formFacultyId, setFormFacultyId] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formTime, setFormTime] = useState('')
  const [formDuration, setFormDuration] = useState(60)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [sessionsRes, subjectsRes, facultyRes] = await Promise.all([
        supabase.from('live_sessions').select('*').order('start_time', { ascending: false }),
        supabase.from('subjects').select('*').order('name', { ascending: true }),
        supabase.from('faculty_profiles').select('*').order('name', { ascending: true }),
      ])

      if (sessionsRes.error) throw sessionsRes.error
      if (subjectsRes.error) throw subjectsRes.error
      if (facultyRes.error) throw facultyRes.error

      setSessions(sessionsRes.data || [])
      setSubjects(subjectsRes.data || [])
      setFacultyList(facultyRes.data || [])
      
      if (subjectsRes.data && subjectsRes.data.length > 0) {
        setFormSubjectId(subjectsRes.data[0].id)
      }
      if (facultyRes.data && facultyRes.data.length > 0) {
        setFormFacultyId(facultyRes.data[0].id)
      }
    } catch (e: any) {
      toast.error('Error fetching data: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenNewDialog = () => {
    setFormTitle('')
    setFormChapter('')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setFormDate(tomorrow.toISOString().split('T')[0])
    setFormTime('10:00')
    setFormDuration(60)
    setIsDialogOpen(true)
  }

  const handleScheduleClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || !formChapter.trim() || !formDate || !formTime) {
      toast.error('Please fill out all required fields.')
      return
    }

    setFormSaving(true)
    try {
      const startTimestamp = new Date(`${formDate}T${formTime}:00`).toISOString()
      
      // Generate a predictable or random room ID based on time
      const roomId = `room_${Date.now().toString().slice(-6)}`

      const payload = {
        title: formTitle.trim(),
        subject_id: formSubjectId,
        chapter: formChapter.trim(),
        faculty_id: formFacultyId,
        status: 'scheduled',
        start_time: startTimestamp,
        duration_minutes: Number(formDuration) || 60,
        stream_url: roomId, // We use stream_url to store the ZegoCloud Room ID
        thumbnail_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
        key_topics: [],
      }

      const { error } = await supabase.from('live_sessions').insert([payload])
      if (error) throw error
      
      toast.success('Live class scheduled successfully!')
      setIsDialogOpen(false)
      fetchData()
    } catch (err: any) {
      toast.error('Failed to schedule class: ' + err.message)
    } finally {
      setFormSaving(false)
    }
  }

  const handleDeleteSession = async (id: string) => {
    try {
      const { error } = await supabase.from('live_sessions').delete().eq('id', id)
      if (error) throw error
      toast.success('Session deleted successfully')
      fetchData()
    } catch (err: any) {
      toast.error('Failed to delete session: ' + err.message)
    }
  }

  const handleHostClass = (session: LiveSession) => {
    navigate({ to: `/live-classes/host/${session.id}` })
  }

  const filteredSessions = sessions.filter((s) => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.chapter.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge className='bg-red-500 hover:bg-red-600 animate-pulse'>LIVE NOW</Badge>
      case 'upcoming':
      case 'scheduled':
        return <Badge variant='outline' className='text-blue-600 border-blue-200 bg-blue-50'>Scheduled</Badge>
      case 'ended':
        return <Badge variant='secondary'>Ended</Badge>
      default:
        return <Badge variant='outline'>{status}</Badge>
    }
  }

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <MonitorPlay className='h-5 w-5 text-primary' />
          <h1 className='text-lg font-semibold tracking-tight'>Live Classes</h1>
        </div>
        <div className='ms-auto flex items-center gap-2'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Live Broadcast Dashboard</h2>
            <p className='text-sm text-muted-foreground'>
              Schedule and host live interactive video sessions for candidates.
            </p>
          </div>
          <Button onClick={handleOpenNewDialog} className='gap-2'>
            <Calendar className='h-4 w-4' />
            Schedule Class
          </Button>
        </div>

        <div className='flex flex-col sm:flex-row sm:items-center gap-4 mb-6'>
          <div className='relative flex-1 max-w-md'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search live sessions...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9'
            />
          </div>
        </div>

        {loading ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {[1, 2, 3].map((n) => (
              <Card key={n} className='h-64 animate-pulse bg-muted/40' />
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <Card className='p-12 text-center'>
            <MonitorPlay className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
            <h3 className='text-lg font-semibold mb-1'>No live sessions found</h3>
            <p className='text-sm text-muted-foreground mb-4'>
              Schedule your first interactive broadcast.
            </p>
            <Button onClick={handleOpenNewDialog}>Schedule Class</Button>
          </Card>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {filteredSessions.map((session) => (
              <Card key={session.id} className='overflow-hidden flex flex-col'>
                <div className='h-32 bg-muted relative border-b border-border'>
                  <img src={session.thumbnail_url} alt={session.title} className='w-full h-full object-cover opacity-80' />
                  <div className='absolute top-3 left-3'>
                    {getStatusBadge(session.status)}
                  </div>
                  <div className='absolute bottom-3 right-3'>
                    <Badge variant='secondary' className='bg-black/60 text-white border-none'>
                      <Clock className='w-3 h-3 mr-1' /> {session.duration_minutes} min
                    </Badge>
                  </div>
                </div>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-lg line-clamp-1'>{session.title}</CardTitle>
                  <CardDescription className='flex items-center gap-2'>
                    {subjects.find(s => s.id === session.subject_id)?.name} • {session.chapter}
                  </CardDescription>
                </CardHeader>
                <CardContent className='pb-4 flex-1'>
                  <div className='space-y-2 text-sm'>
                    <div className='flex items-center gap-2 text-muted-foreground'>
                      <Calendar className='w-4 h-4' />
                      <span>{new Date(session.start_time).toLocaleString()}</span>
                    </div>
                    <div className='flex items-center gap-2 text-muted-foreground'>
                      <User className='w-4 h-4' />
                      <span>{facultyList.find(f => f.id === session.faculty_id)?.name || 'Unknown Faculty'}</span>
                    </div>
                    {session.status === 'live' && (
                      <div className='flex items-center gap-2 text-muted-foreground'>
                        <Users className='w-4 h-4 text-primary' />
                        <span className='font-medium text-foreground'>{session.attendees_count} watching</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className='bg-muted/30 pt-4 border-t flex gap-2'>
                  {session.status !== 'ended' ? (
                    <Button 
                      className='flex-1 gap-2' 
                      onClick={() => handleHostClass(session)}
                      variant={session.status === 'live' ? 'default' : 'secondary'}
                    >
                      <Video className='w-4 h-4' />
                      {session.status === 'live' ? 'Join as Host' : 'Start Broadcast'}
                    </Button>
                  ) : (
                    <Button className='flex-1 gap-2' variant='outline' disabled>
                      Session Ended
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant='destructive' size='icon' title="Delete Session">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this live session and remove it from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteSession(session.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className='sm:max-w-md'>
            <form onSubmit={handleScheduleClass}>
              <DialogHeader>
                <DialogTitle>Schedule Live Class</DialogTitle>
                <DialogDescription>
                  Set up a new live broadcast for your candidates.
                </DialogDescription>
              </DialogHeader>

              <div className='grid gap-4 py-4'>
                <div className='space-y-2'>
                  <Label htmlFor='title'>Class Title *</Label>
                  <Input
                    id='title'
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label>Subject *</Label>
                    <Select value={formSubjectId} onValueChange={setFormSubjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='chapter'>Chapter / Topic *</Label>
                    <Input
                      id='chapter'
                      value={formChapter}
                      onChange={(e) => setFormChapter(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label>Hosting Faculty *</Label>
                  <Select value={formFacultyId} onValueChange={setFormFacultyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Faculty" />
                    </SelectTrigger>
                    <SelectContent>
                      {facultyList.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='grid grid-cols-3 gap-4'>
                  <div className='space-y-2 col-span-1'>
                    <Label htmlFor='date'>Date *</Label>
                    <Input
                      id='date'
                      type='date'
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className='space-y-2 col-span-1'>
                    <Label htmlFor='time'>Time *</Label>
                    <Input
                      id='time'
                      type='time'
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className='space-y-2 col-span-1'>
                    <Label htmlFor='duration'>Duration (min)</Label>
                    <Input
                      id='duration'
                      type='number'
                      min={15}
                      step={15}
                      value={formDuration}
                      onChange={(e) => setFormDuration(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type='button' variant='outline' onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type='submit' disabled={formSaving}>
                  {formSaving ? 'Scheduling...' : 'Schedule Class'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Main>
    </>
  )
}
