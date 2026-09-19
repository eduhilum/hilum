import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Video,
  Plus,
  Search,
  Trash2,
  Play,
  Flame,
  Clock,
  Sparkles,
  BookOpen,
  Eye,
  FileText,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  supabase,
  VideoClass,
  Subject,
  VideoTimestamp,
  VideoPearl,
} from '@/lib/supabase'
import {
  getYouTubeId,
  isYouTubeUrl,
  getYouTubeEmbedUrl,
  resolveVideoThumbnail,
} from '@/lib/video-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

export function VideosPage() {
  const navigate = useNavigate()

  const [videos, setVideos] = useState<VideoClass[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all')
  const [highYieldFilter, setHighYieldFilter] = useState<string>('all')

  // Preview Modal
  const [previewVideo, setPreviewVideo] = useState<VideoClass | null>(null)
  const [previewTimestamps, setPreviewTimestamps] = useState<VideoTimestamp[]>([])
  const [previewPearls, setPreviewPearls] = useState<VideoPearl[]>([])

  const fetchVideosAndSubjects = async () => {
    setLoading(true)
    try {
      const [
        { data: vData, error: vErr },
        { data: sData, error: sErr },
      ] = await Promise.all([
        supabase
          .from('video_classes')
          .select('*, faculty:faculty_profiles(*)')
          .order('created_at', { ascending: false }),
        supabase.from('subjects').select('*').order('name', { ascending: true }),
      ])

      if (vErr) throw vErr
      if (sErr) throw sErr

      setVideos((vData as VideoClass[]) || [])
      setSubjects((sData as Subject[]) || [])
    } catch (err: any) {
      toast.error('Failed to load video lectures: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVideosAndSubjects()
  }, [])

  // Open Preview Modal & Load Details
  const handleOpenPreview = async (v: VideoClass) => {
    setPreviewVideo(v)
    try {
      const [{ data: tsData }, { data: pData }] = await Promise.all([
        supabase
          .from('video_timestamps')
          .select('*')
          .eq('video_id', v.id)
          .order('seconds', { ascending: true }),
        supabase.from('video_pearls').select('*').eq('video_id', v.id),
      ])

      setPreviewTimestamps((tsData as VideoTimestamp[]) || [])
      setPreviewPearls((pData as VideoPearl[]) || [])
    } catch (err) {
      console.warn('Failed to load video sub-entities:', err)
    }
  }

  // Delete Video
  const handleDeleteVideo = async (vId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete lecture "${title}"?`)) return

    try {
      const { error } = await supabase.from('video_classes').delete().eq('id', vId)
      if (error) throw error

      toast.success('Lecture deleted!')
      setVideos((prev) => prev.filter((v) => v.id !== vId))
      if (previewVideo?.id === vId) {
        setPreviewVideo(null)
      }
    } catch (err: any) {
      toast.error('Failed to delete video: ' + err.message)
    }
  }

  // Filtered List
  const filteredVideos = videos.filter((v) => {
    const textToMatch = `${v.title} ${v.chapter_title} ${v.faculty?.name || ''}`.toLowerCase()
    const matchesSearch = textToMatch.includes(searchQuery.toLowerCase())
    const matchesSubject = selectedSubjectFilter === 'all' || v.subject_id === selectedSubjectFilter
    const matchesHighYield =
      highYieldFilter === 'all' ||
      (highYieldFilter === 'yes' && v.is_high_yield) ||
      (highYieldFilter === 'no' && !v.is_high_yield)

    return matchesSearch && matchesSubject && matchesHighYield
  })

  // Quick stats
  const totalLectures = videos.length
  const totalSeconds = videos.reduce((acc, v) => acc + (v.duration_seconds || 0), 0)
  const totalHours = (totalSeconds / 3600).toFixed(1)
  const highYieldCount = videos.filter((v) => v.is_high_yield).length
  const subjectsWithVideos = new Set(videos.map((v) => v.subject_id)).size

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <Video className='h-5 w-5 text-primary' />
          <h1 className='text-lg font-semibold tracking-tight'>Medical Video Lectures</h1>
        </div>
        <div className='ms-auto flex items-center gap-2'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {/* Top Header & Action */}
        <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Video Lectures & Media</h2>
            <p className='text-sm text-muted-foreground'>
              Manage clinical video classes, streaming links, chapter timelines, and lecture notes.
            </p>
          </div>

          <Button
            onClick={() => navigate({ to: '/videos/new' })}
            className='gap-2 shadow-sm'
          >
            <Plus className='h-4 w-4' />
            Upload New Lecture
          </Button>
        </div>

        {/* 4 Stats Cards */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Total Video Classes
              </CardTitle>
              <Video className='h-4 w-4 text-primary' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{loading ? '...' : totalLectures}</div>
              <p className='text-xs text-muted-foreground mt-1'>Active clinical recordings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Total Video Content
              </CardTitle>
              <Clock className='h-4 w-4 text-emerald-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{loading ? '...' : `${totalHours} hrs`}</div>
              <p className='text-xs text-muted-foreground mt-1'>Instructional lecture runtime</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                High-Yield Lectures
              </CardTitle>
              <Flame className='h-4 w-4 text-amber-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{loading ? '...' : highYieldCount}</div>
              <p className='text-xs text-muted-foreground mt-1'>High-yield rapid recall tagged</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Active Subjects
              </CardTitle>
              <BookOpen className='h-4 w-4 text-blue-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {loading ? '...' : `${subjectsWithVideos} / ${subjects.length || 19}`}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>Medical specialties with video</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters Bar */}
        <Card className='mb-6'>
          <CardContent className='pt-6'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
              <div className='relative flex-1'>
                <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search by lecture title, chapter, or faculty presenter...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-9 text-xs'
                />
              </div>

              <div className='flex items-center gap-2'>
                <Select
                  value={selectedSubjectFilter}
                  onValueChange={setSelectedSubjectFilter}
                >
                  <SelectTrigger className='w-44 text-xs'>
                    <SelectValue placeholder='Filter by Subject' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Specialties</SelectItem>
                    {subjects.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={highYieldFilter} onValueChange={setHighYieldFilter}>
                  <SelectTrigger className='w-36 text-xs'>
                    <SelectValue placeholder='Yield Level' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Levels</SelectItem>
                    <SelectItem value='yes'>High-Yield Only</SelectItem>
                    <SelectItem value='no'>Standard Lectures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Video Lectures Grid */}
        {loading ? (
          <div className='py-16 text-center text-sm text-muted-foreground'>
            Loading medical lectures from database...
          </div>
        ) : filteredVideos.length === 0 ? (
          <Card className='border-dashed'>
            <CardContent className='flex flex-col items-center justify-center py-16 text-center'>
              <div className='h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3'>
                <Video className='h-6 w-6' />
              </div>
              <h3 className='text-base font-semibold'>No Video Lectures Found</h3>
              <p className='text-xs text-muted-foreground max-w-sm mt-1 mb-4'>
                {searchQuery || selectedSubjectFilter !== 'all'
                  ? 'No lectures match the active filter criteria. Try resetting your filters.'
                  : 'Start building your video lecture library. Upload MP4 videos or paste streaming URLs for candidates.'}
              </p>
              <Button onClick={() => navigate({ to: '/videos/new' })} className='gap-2'>
                <Plus className='h-4 w-4' />
                Upload First Lecture
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
            {filteredVideos.map((video) => (
              <Card
                key={video.id}
                className='overflow-hidden flex flex-col hover:border-primary/50 transition-colors group'
              >
                {/* Video Thumbnail with duration overlay */}
                <div className='relative aspect-video bg-slate-950 overflow-hidden'>
                  <img
                    src={resolveVideoThumbnail(video.thumbnail_url, video.video_url)}
                    alt={video.title}
                    className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                    onError={(e) => {
                      // Fallback image if broken
                      ;(e.target as any).src =
                        'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&auto=format&fit=crop&q=80'
                    }}
                  />
                  <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none' />

                  {/* Play Button Overlay */}
                  <button
                    type='button'
                    onClick={() => handleOpenPreview(video)}
                    className='absolute inset-0 m-auto h-11 w-11 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg hover:bg-primary hover:scale-110 transition-all z-10'
                    title='Play Video'
                  >
                    <Play className='h-5 w-5 fill-white text-white ml-0.5' />
                  </button>

                  {/* Top Badges */}
                  <div className='absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none'>
                    <Badge className='bg-black/70 backdrop-blur text-[10px] uppercase tracking-wider font-semibold border-none'>
                      {video.subject_id}
                    </Badge>

                    {video.is_high_yield && (
                      <Badge className='bg-amber-500 text-white text-[10px] gap-1 font-bold'>
                        <Flame className='h-3 w-3 fill-white' /> High-Yield
                      </Badge>
                    )}
                  </div>

                  {/* Bottom Duration Badge */}
                  <div className='absolute bottom-2.5 right-2.5 pointer-events-none'>
                    <Badge className='bg-black/80 backdrop-blur font-mono text-[10px] text-white border-none'>
                      {video.duration || '45:00'}
                    </Badge>
                  </div>
                </div>

                {/* Card Body */}
                <CardHeader className='p-4 pb-2 flex-1'>
                  <div className='flex items-center justify-between text-[11px] text-muted-foreground mb-1'>
                    <span className='font-medium text-foreground'>
                      Class #{video.class_number} • {video.chapter_title}
                    </span>
                    {video.notes_pdf_url && video.notes_pdf_size && (
                      <span className='flex items-center gap-1 font-mono text-[10px] text-primary'>
                        <FileText className='h-3 w-3' />
                        {video.notes_pdf_size}
                      </span>
                    )}
                  </div>

                  <CardTitle className='text-sm font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors'>
                    {video.title}
                  </CardTitle>

                  <CardDescription className='text-xs line-clamp-2 mt-1.5'>
                    {video.description}
                  </CardDescription>
                </CardHeader>

                {/* Faculty & Actions Footer */}
                <CardContent className='p-4 pt-0 mt-auto border-t bg-muted/10'>
                  <div className='flex items-center justify-between pt-3'>
                    {/* Faculty Profile */}
                    <div className='flex items-center gap-2 min-w-0 flex-1 mr-2'>
                      {video.faculty?.avatar_url ? (
                        <img
                          src={video.faculty.avatar_url}
                          alt={video.faculty.name}
                          className='h-7 w-7 rounded-full object-cover border shrink-0'
                        />
                      ) : (
                        <div className='h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground'>
                          <User className='h-3.5 w-3.5' />
                        </div>
                      )}
                      <div className='min-w-0 truncate'>
                        <p className='text-xs font-semibold text-foreground truncate'>
                          {video.faculty?.name || 'Medical Faculty'}
                        </p>
                        <p className='text-[10px] text-muted-foreground truncate'>
                          {video.faculty?.title || 'Educator'}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className='flex items-center gap-1 shrink-0'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleOpenPreview(video)}
                        className='h-8 w-8 text-muted-foreground hover:text-foreground'
                        title='Watch & Inspect Lecture'
                      >
                        <Eye className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleDeleteVideo(video.id, video.title)}
                        className='h-8 w-8 text-muted-foreground hover:text-destructive'
                        title='Delete Lecture'
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Video Player & Lecture Inspection Modal */}
        {previewVideo && (
          <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
            <DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto'>
              <DialogHeader>
                <div className='flex items-center gap-2'>
                  <Badge className='text-[10px] uppercase tracking-wider'>
                    {previewVideo.subject_id}
                  </Badge>
                  {previewVideo.is_high_yield && (
                    <Badge className='text-[10px] bg-amber-500 text-white gap-1'>
                      <Flame className='h-3 w-3 fill-white' /> High-Yield
                    </Badge>
                  )}
                  <span className='text-xs text-muted-foreground ml-auto'>
                    Class #{previewVideo.class_number} • {previewVideo.chapter_title}
                  </span>
                </div>
                <DialogTitle className='text-lg font-bold leading-snug pt-1'>
                  {previewVideo.title}
                </DialogTitle>
                <DialogDescription className='text-xs'>
                  {previewVideo.description}
                </DialogDescription>
              </DialogHeader>

              {/* Embedded Player */}
              <div className='aspect-video rounded-xl overflow-hidden bg-black border shadow-md my-2'>
                {isYouTubeUrl(previewVideo.video_url) && getYouTubeId(previewVideo.video_url) ? (
                  <iframe
                    src={getYouTubeEmbedUrl(getYouTubeId(previewVideo.video_url)!)}
                    title={previewVideo.title}
                    className='w-full h-full border-0'
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={previewVideo.video_url || 'https://vjs.zencdn.net/v/oceans.mp4'}
                    controls
                    autoPlay
                    className='w-full h-full object-contain'
                  />
                )}
              </div>

              {/* Faculty Bar */}
              {previewVideo.faculty && (
                <div className='flex items-center justify-between p-3 rounded-lg bg-muted/40 border text-xs'>
                  <div className='flex items-center gap-3'>
                    <img
                      src={previewVideo.faculty.avatar_url}
                      alt={previewVideo.faculty.name}
                      className='h-9 w-9 rounded-full object-cover border'
                    />
                    <div>
                      <p className='font-semibold text-foreground'>{previewVideo.faculty.name}</p>
                      <p className='text-[11px] text-muted-foreground'>{previewVideo.faculty.title}</p>
                    </div>
                  </div>
                  {previewVideo.notes_pdf_url && previewVideo.notes_pdf_size && (
                    <Badge variant='outline' className='text-xs gap-1 font-mono'>
                      <FileText className='h-3 w-3 text-primary' />
                      {previewVideo.notes_pdf_size}
                    </Badge>
                  )}
                </div>
              )}

              {/* Timestamps / Chapter Markers */}
              {previewTimestamps.length > 0 && (
                <div className='space-y-2 pt-2'>
                  <div className='flex items-center gap-1.5 text-xs font-semibold text-foreground'>
                    <Clock className='h-3.5 w-3.5 text-primary' />
                    <span>Interactive Chapter Timeline ({previewTimestamps.length})</span>
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                    {previewTimestamps.map((ts) => (
                      <div
                        key={ts.id || ts.seconds}
                        className='flex items-center justify-between p-2 rounded-lg border bg-card text-xs'
                      >
                        <div className='flex items-center gap-2 truncate'>
                          <span className='font-mono font-bold text-primary text-[11px] px-1.5 py-0.5 rounded bg-primary/10'>
                            {ts.time_string}
                          </span>
                          <span className='truncate'>{ts.title}</span>
                        </div>
                        {ts.is_high_yield && (
                          <Flame className='h-3 w-3 text-amber-500 fill-amber-500 shrink-0 ml-1' />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* High-Yield Pearls */}
              {previewPearls.length > 0 && (
                <div className='space-y-2 pt-2'>
                  <div className='flex items-center gap-1.5 text-xs font-semibold text-foreground'>
                    <Sparkles className='h-3.5 w-3.5 text-amber-500' />
                    <span>High-Yield Clinical Pearls</span>
                  </div>
                  <div className='space-y-2'>
                    {previewPearls.map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className='p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-foreground leading-relaxed'
                      >
                        {p.pearl_text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </Main>
    </>
  )
}
