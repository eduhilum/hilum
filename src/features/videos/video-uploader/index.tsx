import { useState, useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Video,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  Clock,
  User,
  UploadCloud,
  Link as LinkIcon,
  Play,
  Smartphone,
  Flame,
  FileText,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  FileDown,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  supabase,
  Subject,
  Chapter,
  Topic,
  FacultyProfile,
} from '@/lib/supabase'
import {
  getYouTubeId,
  isYouTubeUrl,
  getYouTubeThumbnail,
  getYouTubeEmbedUrl,
  formatFileSize,
  captureVideoFrame,
  resolveVideoThumbnail,
} from '@/lib/video-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

interface TimestampDraft {
  time_string: string
  seconds: number
  title: string
  is_high_yield: boolean
}

export function VideoUploaderPage() {
  const navigate = useNavigate()

  // Curriculum State
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [facultyList, setFacultyList] = useState<FacultyProfile[]>([])
  const [courses, setCourses] = useState<any[]>([])

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [selectedChapterTitle, setSelectedChapterTitle] = useState<string>('')
  const [selectedTopicId, setSelectedTopicId] = useState<string>('')
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('')

  // Video Form Fields
  const [title, setTitle] = useState('')
  const [classNumber, setClassNumber] = useState<number>(1)
  const [description, setDescription] = useState('')
  const [videoSourceType, setVideoSourceType] = useState<'url' | 'file'>('url')
  const [videoUrl, setVideoUrl] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [durationString, setDurationString] = useState('45:00')
  const [durationSeconds, setDurationSeconds] = useState(2700)
  const [isHighYield, setIsHighYield] = useState(true)
  const [notesPdfUrl, setNotesPdfUrl] = useState('')
  const [notesPdfSize, setNotesPdfSize] = useState('')

  // Storage Upload States
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [videoUploadStatus, setVideoUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false)
  const [isUploadingPdf, setIsUploadingPdf] = useState(false)

  // Timestamps & Pearls
  const [timestamps, setTimestamps] = useState<TimestampDraft[]>([])
  const [pearls, setPearls] = useState<string[]>([])

  // New Faculty Dialog State
  const [isFacultyDialogOpen, setIsFacultyDialogOpen] = useState(false)
  const [newFacultyName, setNewFacultyName] = useState('')
  const [newFacultyTitle, setNewFacultyTitle] = useState('')
  const [newFacultyInstitution, setNewFacultyInstitution] = useState('')
  const [newFacultyAvatar, setNewFacultyAvatar] = useState('')
  const [savingFaculty, setSavingFaculty] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const [saving, setSaving] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Helper: Upload file directly to Supabase Storage Bucket
  const uploadFileToSupabase = async (
    file: File,
    bucket: 'videos' | 'thumbnails' | 'course-materials'
  ): Promise<string> => {
    const ext = file.name.split('.').pop() || (bucket === 'videos' ? 'mp4' : bucket === 'thumbnails' ? 'jpg' : 'pdf')
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
    const filePath = `uploads/${safeName}`

    const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    })
    if (error) throw error

    const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(filePath)
    return pubData.publicUrl
  }

  // 1. Load Initial Data (Subjects, Faculty, Courses)
  useEffect(() => {
    const initData = async () => {
      const [{ data: subs }, { data: facs }, { data: coursesData }] = await Promise.all([
        supabase.from('subjects').select('*').order('name', { ascending: true }),
        supabase.from('faculty_profiles').select('*').order('name', { ascending: true }),
        supabase.from('courses').select('*').order('title', { ascending: true }),
      ])

      if (subs && subs.length > 0) {
        setSubjects(subs as Subject[])
        setSelectedSubjectId(subs[0].id)
      }

      if (facs && facs.length > 0) {
        setFacultyList(facs as FacultyProfile[])
        setSelectedFacultyId(facs[0].id)
      }
      
      if (coursesData && coursesData.length > 0) {
        setCourses(coursesData)
        setSelectedCourseId(coursesData[0].id)
      }
    }

    initData()
  }, [])

  // 2. Load Chapters & Topics when Subject changes
  useEffect(() => {
    if (!selectedSubjectId) return

    supabase
      .from('chapters')
      .select('*')
      .eq('subject_id', selectedSubjectId)
      .order('chapter_number', { ascending: true })
      .then(({ data: chaps }) => {
        const cList = (chaps as Chapter[]) || []
        setChapters(cList)
        if (cList.length > 0) {
          setSelectedChapterTitle(cList[0].title)
          // Load topics for first chapter
          supabase
            .from('topics')
            .select('*')
            .eq('chapter_id', cList[0].id)
            .then(({ data: tops }) => {
              setTopics((tops as Topic[]) || [])
              if (tops && tops.length > 0) {
                setSelectedTopicId(tops[0].id)
              }
            })
        } else {
          setSelectedChapterTitle('General Principles')
          setTopics([])
          setSelectedTopicId('')
        }
      })
  }, [selectedSubjectId])

  // 3. Auto-calculate duration from video element
  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      const sec = Math.round(videoRef.current.duration)
      if (sec > 0 && !isNaN(sec)) {
        setDurationSeconds(sec)
        const mins = Math.floor(sec / 60)
        const remainingSecs = sec % 60
        const formatted = `${mins}:${remainingSecs.toString().padStart(2, '0')}`
        setDurationString(formatted)
        toast.info(`Video duration detected: ${formatted} (${sec}s)`)
      }
    }
  }

  // 3.5 Handle video URL changes with automatic YouTube thumbnail detection
  const handleVideoUrlChange = (newUrl: string) => {
    setVideoUrl(newUrl)
    if (isYouTubeUrl(newUrl)) {
      const ytId = getYouTubeId(newUrl)
      if (ytId) {
        // Auto-populate thumbnail if user hasn't uploaded a custom one
        if (!thumbnailUrl || thumbnailUrl.includes('youtube.com') || thumbnailUrl.includes('unsplash.com')) {
          const ytThumb = getYouTubeThumbnail(ytId, 'hq')
          setThumbnailUrl(ytThumb)
          toast.info('Auto-detected YouTube video! Extracted default thumbnail.')
        }
      }
    }
  }

  // 4. Handle Local File selection & auto-upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedVideoFile(file)
    // Instant local blob URL for video player preview & duration extraction
    const objectUrl = URL.createObjectURL(file)
    setVideoUrl(objectUrl)

    // Auto-capture frame from video file for default thumbnail if not set
    if (!thumbnailUrl || thumbnailUrl.includes('unsplash.com')) {
      captureVideoFrame(file).then(async (blob) => {
        if (blob) {
          try {
            const thumbFile = new File([blob], `thumb_${Date.now()}.jpg`, { type: 'image/jpeg' })
            const cdnThumb = await uploadFileToSupabase(thumbFile, 'thumbnails')
            setThumbnailUrl(cdnThumb)
            toast.success('Auto-extracted video frame as default thumbnail!')
          } catch (tErr) {
            console.warn('Auto-thumbnail upload notice:', tErr)
          }
        }
      })
    }

    // Upload in background to Supabase Storage 'videos' bucket
    setIsUploadingVideo(true)
    setVideoUploadStatus('uploading')
    toast.info(`Uploading ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB) to Supabase Storage...`)

    try {
      const cdnUrl = await uploadFileToSupabase(file, 'videos')
      setVideoUrl(cdnUrl)
      setVideoUploadStatus('success')
      toast.success('Video uploaded to Supabase Storage (videos bucket)!')
    } catch (err: any) {
      console.warn('Storage upload error:', err.message)
      setVideoUploadStatus('error')
      toast.warning(
        'Upload to "videos" bucket failed (ensure storage migration is applied). Local preview active.'
      )
    } finally {
      setIsUploadingVideo(false)
    }
  }

  // 5. Handle Thumbnail file upload
  const handleThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingThumbnail(true)
    toast.info('Uploading thumbnail poster...')
    try {
      const cdnUrl = await uploadFileToSupabase(file, 'thumbnails')
      setThumbnailUrl(cdnUrl)
      toast.success('Thumbnail uploaded to Supabase Storage!')
    } catch (err: any) {
      toast.error('Thumbnail upload error: ' + err.message)
    } finally {
      setIsUploadingThumbnail(false)
    }
  }

  // 6. Handle Notes PDF file upload
  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingPdf(true)
    const detectedSize = formatFileSize(file.size)
    setNotesPdfSize(detectedSize)
    toast.info(`Uploading lecture PDF (${detectedSize})...`)
    try {
      const cdnUrl = await uploadFileToSupabase(file, 'course-materials')
      setNotesPdfUrl(cdnUrl)
      toast.success(`PDF notes uploaded to Supabase Storage! (${detectedSize})`)
    } catch (err: any) {
      toast.error('PDF upload error: ' + err.message)
    } finally {
      setIsUploadingPdf(false)
    }
  }

  // 6.5 Handle Faculty Avatar file upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingAvatar(true)
    toast.info('Uploading faculty avatar...')
    try {
      const cdnUrl = await uploadFileToSupabase(file, 'thumbnails')
      setNewFacultyAvatar(cdnUrl)
      toast.success('Faculty avatar uploaded to Supabase Storage!')
    } catch (err: any) {
      toast.error('Avatar upload error: ' + err.message)
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // 7. Timestamps management
  const handleAddTimestamp = () => {
    setTimestamps((prev) => [
      ...prev,
      { time_string: '00:00', seconds: 0, title: '', is_high_yield: false },
    ])
  }

  const handleRemoveTimestamp = (index: number) => {
    setTimestamps((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdateTimestamp = (index: number, field: keyof TimestampDraft, value: any) => {
    setTimestamps((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const updated = { ...item, [field]: value }
        if (field === 'time_string') {
          const parts = (value as string).split(':').map((p) => parseInt(p, 10))
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            updated.seconds = parts[0] * 60 + parts[1]
          }
        }
        return updated
      })
    )
  }

  // 8. Pearls management
  const handleAddPearl = () => {
    setPearls((prev) => [...prev, ''])
  }

  const handleRemovePearl = (index: number) => {
    setPearls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdatePearl = (index: number, text: string) => {
    setPearls((prev) => prev.map((p, i) => (i === index ? text : p)))
  }

  // 9. Quick Create Faculty Profile
  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFacultyName.trim()) {
      toast.error('Faculty name is required')
      return
    }

    setSavingFaculty(true)
    try {
      const payload = {
        name: newFacultyName.trim(),
        title: newFacultyTitle.trim() || 'Professor of Medical Education',
        institution: newFacultyInstitution.trim() || 'Hilum Medical Faculty',
        avatar_url:
          newFacultyAvatar.trim() ||
          'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
      }

      const { data, error } = await supabase.from('faculty_profiles').insert([payload]).select().single()
      if (error) throw error

      setFacultyList((prev) => [...prev, data as FacultyProfile])
      setSelectedFacultyId(data.id)
      setIsFacultyDialogOpen(false)
      setNewFacultyName('')
      setNewFacultyTitle('')
      toast.success(`Registered faculty member: ${payload.name}!`)
    } catch (err: any) {
      toast.error('Failed to create faculty: ' + err.message)
    } finally {
      setSavingFaculty(false)
    }
  }

  // 10. Publish Video Lecture
  const handlePublishVideo = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Please enter a lecture title.')
      return
    }

    if (!videoUrl.trim()) {
      toast.error('Please provide a video file or streaming URL.')
      return
    }

    if (!selectedFacultyId) {
      toast.error('Please select or create a faculty presenter.')
      return
    }

    setSaving(true)
    try {
      let finalVideoUrl = videoUrl.trim()

      // If user selected a local file that hasn't finished cloud upload, upload it now
      if (finalVideoUrl.startsWith('blob:') && selectedVideoFile) {
        toast.info('Uploading video to Supabase Storage before publishing...')
        try {
          finalVideoUrl = await uploadFileToSupabase(selectedVideoFile, 'videos')
          setVideoUrl(finalVideoUrl)
        } catch (uploadErr: any) {
          toast.error('Could not upload video to Supabase Storage. Please run storage migration.')
          setSaving(false)
          return
        }
      }

      // Resolve thumbnail: if user didn't explicitly upload one, default to video itself
      let effectiveThumbnail = thumbnailUrl.trim()
      if (!effectiveThumbnail || effectiveThumbnail.includes('photo-1576091160399-112ba8d25d1d')) {
        if (isYouTubeUrl(finalVideoUrl)) {
          const ytId = getYouTubeId(finalVideoUrl)
          if (ytId) effectiveThumbnail = getYouTubeThumbnail(ytId)
        } else if (selectedVideoFile) {
          try {
            const frameBlob = await captureVideoFrame(selectedVideoFile)
            if (frameBlob) {
              const thumbFile = new File([frameBlob], `thumb_${Date.now()}.jpg`, { type: 'image/jpeg' })
              effectiveThumbnail = await uploadFileToSupabase(thumbFile, 'thumbnails')
            }
          } catch (tErr) {
            console.warn('Frame capture during publish error:', tErr)
          }
        }
      }
      if (!effectiveThumbnail) {
        effectiveThumbnail = resolveVideoThumbnail('', finalVideoUrl)
      }

      // 1. Insert Video Class
      const { data: videoData, error: videoErr } = await supabase
        .from('video_classes')
        .insert([
          {
            subject_id: selectedSubjectId,
            faculty_id: selectedFacultyId,
            class_number: Number(classNumber) || 1,
            title: title.trim(),
            chapter_title: selectedChapterTitle.trim() || 'Core Specialty Review',
            duration: durationString.trim() || '45:00',
            duration_seconds: Number(durationSeconds) || 2700,
            video_url: finalVideoUrl,
            thumbnail_url: effectiveThumbnail,
            is_high_yield: isHighYield,
            description: description.trim() || 'Comprehensive clinical medical lecture for FMGE, NEET PG & USMLE candidates.',
            notes_pdf_url: notesPdfUrl.trim() || null,
            notes_pdf_size: notesPdfUrl.trim() ? (notesPdfSize.trim() || 'PDF Notes') : null,
            associated_topic_id: selectedTopicId || null,
            course_id: selectedCourseId || null,
          },
        ])
        .select()
        .single()

      if (videoErr) throw videoErr
      const newVideoId = videoData.id

      // 2. Insert Timestamps
      if (timestamps.length > 0) {
        const tsPayload = timestamps.map((ts) => ({
          video_id: newVideoId,
          time_string: ts.time_string,
          seconds: ts.seconds,
          title: ts.title,
          is_high_yield: ts.is_high_yield,
        }))
        const { error: tsErr } = await supabase.from('video_timestamps').insert(tsPayload)
        if (tsErr) console.warn('Timestamps save notice:', tsErr.message)
      }

      // 3. Insert Pearls
      const validPearls = pearls.filter((p) => p.trim().length > 0)
      if (validPearls.length > 0) {
        const pearlsPayload = validPearls.map((p) => ({
          video_id: newVideoId,
          pearl_text: p.trim(),
        }))
        const { error: pErr } = await supabase.from('video_pearls').insert(pearlsPayload)
        if (pErr) console.warn('Pearls save notice:', pErr.message)
      }

      toast.success('Medical lecture successfully published to Hilum!')
      navigate({ to: '/videos' })
    } catch (err: any) {
      toast.error('Failed to publish video: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId)
  const selectedFaculty = facultyList.find((f) => f.id === selectedFacultyId)

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={() => navigate({ to: '/videos' })}
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-sm font-semibold tracking-tight'>Medical Video Authoring Studio</h1>
            <p className='text-xs text-muted-foreground'>
              Upload, encode, and sync high-yield medical lecture videos
            </p>
          </div>
        </div>

        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <form onSubmit={handlePublishVideo} className='space-y-6 pb-16'>
          {/* Top Bar Actions */}
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4'>
            <div>
              <h2 className='text-lg font-bold tracking-tight'>Create New Video Class</h2>
              <p className='text-xs text-muted-foreground'>
                Configure curriculum tags, presenter credentials, chapter timestamps, and clinical pearls.
              </p>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => navigate({ to: '/videos' })}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={saving || isUploadingVideo} className='gap-2'>
                {saving ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Save className='h-4 w-4' />
                )}
                {saving ? 'Publishing...' : 'Publish Lecture'}
              </Button>
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
            {/* Left Column: Form Inputs (7 cols) */}
            <div className='lg:col-span-7 space-y-6'>
              {/* 1. Video Source & Player Preview */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <Video className='h-4 w-4 text-primary' />
                    Video Media & Stream Source
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Upload video files directly to Supabase Storage or link an MP4 / HLS stream URL.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4 pt-0'>
                  <Tabs value={videoSourceType} onValueChange={(v: any) => setVideoSourceType(v)}>
                    <TabsList className='grid grid-cols-2 h-9'>
                      <TabsTrigger value='url' className='text-xs gap-1.5'>
                        <LinkIcon className='h-3.5 w-3.5' /> Direct Stream / URL
                      </TabsTrigger>
                      <TabsTrigger value='file' className='text-xs gap-1.5'>
                        <UploadCloud className='h-3.5 w-3.5' /> Local Video File (Storage CDN)
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {videoSourceType === 'url' ? (
                    <div className='space-y-2'>
                      <Label htmlFor='video-url' className='text-xs font-semibold'>
                        Streaming Video URL *
                      </Label>
                      <div className='flex gap-2'>
                        <Input
                          id='video-url'
                          value={videoUrl}
                          onChange={(e) => handleVideoUrlChange(e.target.value)}
                          required
                          className='text-xs'
                        />
                      </div>
                    </div>
                  ) : (
                    <div className='space-y-2'>
                      <Label className='text-xs font-semibold'>
                        Upload to Supabase Storage (videos bucket)
                      </Label>
                      <div className='border-2 border-dashed rounded-lg p-5 text-center hover:bg-muted/30 transition-colors'>
                        {isUploadingVideo ? (
                          <div className='py-4 space-y-2'>
                            <Loader2 className='h-8 w-8 mx-auto text-primary animate-spin' />
                            <p className='text-xs font-medium text-foreground'>
                              Uploading video to Supabase Storage bucket...
                            </p>
                            <p className='text-[11px] text-muted-foreground'>
                              Please wait while the media file transfers to cloud CDN.
                            </p>
                          </div>
                        ) : videoUploadStatus === 'success' ? (
                          <div className='py-2 space-y-2'>
                            <CheckCircle2 className='h-8 w-8 mx-auto text-emerald-500' />
                            <p className='text-xs font-semibold text-emerald-600 dark:text-emerald-400'>
                              Video uploaded to Supabase Storage CDN!
                            </p>
                            <p className='text-[11px] text-muted-foreground font-mono break-all px-4'>
                              {videoUrl}
                            </p>
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              className='text-xs h-7 mt-2'
                              onClick={() => {
                                setVideoUploadStatus('idle')
                                setVideoUrl('')
                              }}
                            >
                              Choose Another Video
                            </Button>
                          </div>
                        ) : (
                          <>
                            <UploadCloud className='h-8 w-8 mx-auto text-muted-foreground mb-2' />
                            <p className='text-xs text-muted-foreground mb-2'>
                              Choose an MP4, WebM, or QuickTime file from your system
                            </p>
                            <Input
                              type='file'
                              accept='video/mp4,video/webm,video/quicktime'
                              onChange={handleFileChange}
                              className='max-w-xs mx-auto text-xs'
                            />
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Player Preview */}
                  {videoUrl && (
                    <div className='space-y-2 mt-3'>
                      <Label className='text-xs text-muted-foreground flex items-center justify-between'>
                        <span className='flex items-center gap-1.5'>
                          <Play className='h-3.5 w-3.5 text-primary' />
                          {isYouTubeUrl(videoUrl) ? 'YouTube Stream Player' : 'Live Stream Player Preview'}
                        </span>
                        <span className='font-mono font-medium text-foreground'>{durationString}</span>
                      </Label>
                      <div className='aspect-video rounded-lg overflow-hidden bg-black border relative'>
                        {isYouTubeUrl(videoUrl) && getYouTubeId(videoUrl) ? (
                          <iframe
                            src={getYouTubeEmbedUrl(getYouTubeId(videoUrl)!)}
                            title='YouTube Video Stream'
                            className='w-full h-full border-0'
                            allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                            allowFullScreen
                          />
                        ) : (
                          <video
                            ref={videoRef}
                            src={videoUrl}
                            controls
                            onLoadedMetadata={handleVideoLoadedMetadata}
                            className='w-full h-full object-contain'
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Duration & Class Number */}
                  <div className='grid grid-cols-2 gap-3 pt-2'>
                    <div>
                      <Label className='text-xs'>Duration Display (MM:SS)</Label>
                      <Input
                        value={durationString}
                        onChange={(e) => setDurationString(e.target.value)}
                        className='text-xs mt-1'
                      />
                    </div>
                    <div>
                      <Label className='text-xs'>Class Number</Label>
                      <Input
                        type='number'
                        min={1}
                        value={classNumber}
                        onChange={(e) => setClassNumber(Number(e.target.value))}
                        className='text-xs mt-1'
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Curriculum & Specialty */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <Layers className='h-4 w-4 text-primary' />
                    Curriculum Location & Alignment
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Map the video lecture into the candidate study schedule.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4 pt-0'>
                  <div>
                    <Label className='text-xs font-semibold'>Target Course *</Label>
                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                      <SelectTrigger className='mt-1 text-xs'>
                        <SelectValue placeholder='Select Course' />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className='text-xs font-semibold'>Medical Subject / Specialty *</Label>
                    <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                      <SelectTrigger className='mt-1 text-xs'>
                        <SelectValue placeholder='Select Subject' />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className='text-xs font-semibold'>Chapter Name / System *</Label>
                    <Input
                      list='chapter-suggestions'
                      value={selectedChapterTitle}
                      onChange={(e) => setSelectedChapterTitle(e.target.value)}
                      className='mt-1 text-xs'
                      required
                    />
                    <datalist id='chapter-suggestions'>
                      {chapters.map((c) => (
                        <option key={c.id} value={c.title} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <Label className='text-xs'>Linked Topic (Optional)</Label>
                    <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
                      <SelectTrigger className='mt-1 text-xs'>
                        <SelectValue placeholder={topics.length === 0 ? 'General' : 'Select Topic'} />
                      </SelectTrigger>
                      <SelectContent>
                        {topics.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Lecture Details & Faculty */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <FileText className='h-4 w-4 text-primary' />
                    Lecture Details & Faculty
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-4 pt-0'>
                  <div className='space-y-1.5'>
                    <Label htmlFor='lec-title' className='text-xs font-semibold'>
                      Lecture Title *
                    </Label>
                    <Input
                      id='lec-title'
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className='text-sm'
                    />
                  </div>

                  {/* Faculty Selection */}
                  <div className='space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <Label className='text-xs font-semibold'>Presenting Medical Faculty *</Label>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => setIsFacultyDialogOpen(true)}
                        className='text-xs h-7 text-primary gap-1'
                      >
                        <Plus className='h-3 w-3' /> New Faculty
                      </Button>
                    </div>

                    {facultyList.length === 0 ? (
                      <div className='p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between'>
                        <span>No faculty profiles in database.</span>
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          className='h-7 text-xs'
                          onClick={() => setIsFacultyDialogOpen(true)}
                        >
                          + Create Faculty
                        </Button>
                      </div>
                    ) : (
                      <Select value={selectedFacultyId} onValueChange={setSelectedFacultyId}>
                        <SelectTrigger className='text-xs'>
                          <SelectValue placeholder='Select Faculty' />
                        </SelectTrigger>
                        <SelectContent>
                          {facultyList.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name} — {f.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Description */}
                  <div className='space-y-1.5'>
                    <Label htmlFor='desc' className='text-xs'>
                      Lecture Overview & Learning Objectives
                    </Label>
                    <Textarea
                      id='desc'
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className='text-xs leading-relaxed resize-none'
                    />
                  </div>

                  {/* Thumbnail & PDF Notes */}
                  <div className='space-y-3 pt-1 border-t'>
                    {/* Thumbnail Section */}
                    <div className='space-y-1.5'>
                      <div className='flex items-center justify-between'>
                        <Label htmlFor='thumb' className='text-xs font-semibold flex items-center gap-1.5'>
                          <ImageIcon className='h-3.5 w-3.5 text-primary' /> Thumbnail Poster URL
                        </Label>
                        <label className='text-xs text-primary cursor-pointer hover:underline flex items-center gap-1'>
                          <UploadCloud className='h-3 w-3' />
                          <span>{isUploadingThumbnail ? 'Uploading...' : 'Upload Image'}</span>
                          <input
                            type='file'
                            accept='image/jpeg,image/png,image/webp'
                            onChange={handleThumbnailFileChange}
                            className='hidden'
                          />
                        </label>
                      </div>
                      <Input
                        id='thumb'
                        value={thumbnailUrl}
                        onChange={(e) => setThumbnailUrl(e.target.value)}
                        className='text-xs'
                      />

                      {/* Tested Medical Presets */}
                      <div className='flex flex-wrap items-center gap-1.5 pt-0.5'>
                        <span className='text-[10px] text-muted-foreground'>High-Yield Presets:</span>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='text-[11px] h-6 px-2 text-primary'
                          onClick={() => {
                            setThumbnailUrl('https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80')
                          }}
                        >
                          🫀 Anatomy (Heart)
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='text-[11px] h-6 px-2 text-primary'
                          onClick={() => {
                            setThumbnailUrl('https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&auto=format&fit=crop&q=80')
                          }}
                        >
                          🏥 Surgery Theatre
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='text-[11px] h-6 px-2 text-primary'
                          onClick={() => {
                            setThumbnailUrl('https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&auto=format&fit=crop&q=80')
                          }}
                        >
                          🧠 Neurology
                        </Button>
                      </div>
                    </div>

                    {/* PDF Section */}
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1'>
                      <div className='space-y-1.5'>
                        <div className='flex items-center justify-between'>
                          <Label htmlFor='pdf-url' className='text-xs font-semibold flex items-center gap-1.5'>
                            <FileDown className='h-3.5 w-3.5 text-primary' /> Lecture Notes PDF URL
                          </Label>
                          <label className='text-xs text-primary cursor-pointer hover:underline flex items-center gap-1'>
                            <UploadCloud className='h-3 w-3' />
                            <span>{isUploadingPdf ? 'Uploading...' : 'Upload PDF'}</span>
                            <input
                              type='file'
                              accept='application/pdf'
                              onChange={handlePdfFileChange}
                              className='hidden'
                            />
                          </label>
                        </div>
                        <Input
                          id='pdf-url'
                          value={notesPdfUrl}
                          onChange={(e) => setNotesPdfUrl(e.target.value)}
                          className='text-xs'
                        />
                      </div>

                      <div className='space-y-1.5'>
                        <Label htmlFor='pdf-size' className='text-xs flex items-center justify-between'>
                          <span>PDF Notes Badge Text</span>
                          {notesPdfSize && (
                            <span className='text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold'>
                              Auto-detected
                            </span>
                          )}
                        </Label>
                        <Input
                          id='pdf-size'
                          value={notesPdfSize}
                          onChange={(e) => setNotesPdfSize(e.target.value)}
                          className='text-xs'
                        />
                      </div>
                    </div>
                  </div>

                  {/* High-Yield Switch */}
                  <div className='flex items-center justify-between rounded-lg border p-3 mt-2'>
                    <div className='space-y-0.5'>
                      <Label htmlFor='hy-video-toggle' className='text-xs font-semibold'>
                        High-Yield Lecture
                      </Label>
                      <p className='text-[11px] text-muted-foreground'>
                        Feature in Rapid Revision and High-Yield Video Playlists
                      </p>
                    </div>
                    <Switch id='hy-video-toggle' checked={isHighYield} onCheckedChange={setIsHighYield} />
                  </div>
                </CardContent>
              </Card>

              {/* 4. Interactive Timestamps & Chapter Markers */}
              <Card>
                <CardHeader className='pb-3'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-base flex items-center gap-2'>
                        <Clock className='h-4 w-4 text-primary' />
                        Interactive Timeline Markers
                      </CardTitle>
                      <CardDescription className='text-xs'>
                        Allows students to seek directly to key clinical topics.
                      </CardDescription>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={handleAddTimestamp}
                      className='h-8 text-xs gap-1'
                    >
                      <Plus className='h-3.5 w-3.5' /> Add Marker
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className='space-y-2.5 pt-0'>
                  {timestamps.map((ts, idx) => (
                    <div key={idx} className='flex items-center gap-2 p-2 rounded-lg border bg-muted/20'>
                      <Input
                        value={ts.time_string}
                        onChange={(e) => handleUpdateTimestamp(idx, 'time_string', e.target.value)}
                        className='w-20 font-mono text-xs text-center shrink-0'
                      />
                      <Input
                        value={ts.title}
                        onChange={(e) => handleUpdateTimestamp(idx, 'title', e.target.value)}
                        className='text-xs flex-1'
                      />
                      <Button
                        type='button'
                        variant={ts.is_high_yield ? 'default' : 'ghost'}
                        size='sm'
                        onClick={() => handleUpdateTimestamp(idx, 'is_high_yield', !ts.is_high_yield)}
                        className={`h-8 text-[11px] px-2 shrink-0 ${ts.is_high_yield ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                      >
                        <Flame className='h-3 w-3 mr-1 text-amber-300' /> HY
                      </Button>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        onClick={() => handleRemoveTimestamp(idx)}
                        className='h-8 w-8 text-muted-foreground hover:text-destructive shrink-0'
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* 5. High-Yield Clinical Pearls */}
              <Card>
                <CardHeader className='pb-3'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-base flex items-center gap-2'>
                        <Sparkles className='h-4 w-4 text-primary' />
                        High-Yield Clinical Pearls
                      </CardTitle>
                      <CardDescription className='text-xs'>
                        Bulleted takeaways highlighted in candidate revision cards.
                      </CardDescription>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={handleAddPearl}
                      className='h-8 text-xs gap-1'
                    >
                      <Plus className='h-3.5 w-3.5' /> Add Pearl
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className='space-y-2.5 pt-0'>
                  {pearls.map((p, idx) => (
                    <div key={idx} className='flex items-start gap-2'>
                      <Textarea
                        value={p}
                        onChange={(e) => handleUpdatePearl(idx, e.target.value)}
                        rows={2}
                        className='text-xs resize-none'
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        onClick={() => handleRemovePearl(idx)}
                        className='h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 mt-1'
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Live Mobile App Card Simulator (5 cols) */}
            <div className='lg:col-span-5'>
              <div className='sticky top-20 space-y-4'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                    <Smartphone className='h-4 w-4 text-primary' />
                    Live Mobile App Preview
                  </h3>
                  <Badge variant='outline' className='text-[10px]'>
                    Hilum App Simulator
                  </Badge>
                </div>

                {/* Candidate Video Card Mock */}
                <div className='rounded-2xl border bg-card p-4 shadow-sm space-y-3.5 max-w-sm mx-auto'>
                  {/* Video Thumbnail Viewport */}
                  <div className='aspect-video rounded-xl overflow-hidden bg-slate-900 relative group'>
                    <img
                      src={resolveVideoThumbnail(thumbnailUrl, videoUrl)}
                      alt='Lecture Thumbnail Preview'
                      className='w-full h-full object-cover'
                    />
                    <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent' />

                    {/* Top Watermark */}
                    <div className='absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-wider'>
                      <Video className='h-2.5 w-2.5 text-primary' /> HILUM CLINICAL
                    </div>

                    {/* Duration Badge */}
                    <div className='absolute bottom-2 right-2 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-white'>
                      {durationString}
                    </div>

                    {/* Center Play Button */}
                    <div className='absolute inset-0 flex items-center justify-center'>
                      <div className='w-11 h-11 rounded-full bg-white/90 text-primary flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform'>
                        <Play className='h-5 w-5 fill-primary translate-x-0.5' />
                      </div>
                    </div>
                  </div>

                  {/* Subject & High-Yield Badge */}
                  <div className='flex items-center justify-between text-[11px]'>
                    <Badge variant='secondary' className='text-[10px] uppercase font-semibold tracking-wide'>
                      {selectedSubject?.name || 'Medical Specialty'}
                    </Badge>
                    {isHighYield && (
                      <div className='flex items-center gap-1 text-amber-500 font-bold text-[10px]'>
                        <Flame className='h-3 w-3 fill-amber-500' /> High-Yield
                      </div>
                    )}
                  </div>

                  {/* Title & Chapter */}
                  <div>
                    <p className='text-[11px] font-medium text-muted-foreground'>
                      Class #{classNumber} • {selectedChapterTitle || 'General System'}
                    </p>
                    <h4 className='text-sm font-bold text-foreground leading-snug line-clamp-2 mt-0.5'>
                      {title || 'Lecture Title will appear here'}
                    </h4>
                  </div>

                  {/* Faculty Presenter Card */}
                  {selectedFaculty ? (
                    <div className='flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 border border-border/50'>
                      <img
                        src={selectedFaculty.avatar_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400'}
                        alt={selectedFaculty.name}
                        className='w-8 h-8 rounded-full object-cover border'
                      />
                      <div className='truncate'>
                        <p className='text-xs font-semibold text-foreground truncate'>
                          {selectedFaculty.name}
                        </p>
                        <p className='text-[10px] text-muted-foreground truncate'>
                          {selectedFaculty.title}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className='p-2 rounded-xl border border-dashed text-center text-[11px] text-muted-foreground'>
                      No faculty presenter selected
                    </div>
                  )}

                  {/* Notes PDF Download Pill */}
                  {notesPdfUrl && notesPdfSize && (
                    <div className='flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300'>
                      <span className='font-medium flex items-center gap-1'>
                        <FileDown className='h-3.5 w-3.5' /> Companion Lecture Slides
                      </span>
                      <Badge variant='outline' className='text-[9px] bg-emerald-100 dark:bg-emerald-900 border-emerald-300'>
                        {notesPdfSize}
                      </Badge>
                    </div>
                  )}

                  {/* Interactive Chapter Timeline Chips */}
                  <div className='space-y-1.5 mb-3'>
                    <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1'>
                      <Clock className='h-3 w-3' /> Chapter Timeline ({timestamps.length})
                    </p>
                    <div className='space-y-1 max-h-36 overflow-y-auto pr-1'>
                      {timestamps.map((t, i) => (
                        <div
                          key={i}
                          className='flex items-center justify-between p-1.5 rounded-md bg-white dark:bg-slate-900 border text-[11px]'
                        >
                          <div className='flex items-center gap-2 truncate'>
                            <span className='font-mono font-bold text-primary text-[10px]'>
                              {t.time_string}
                            </span>
                            <span className='truncate text-foreground'>{t.title}</span>
                          </div>
                          {t.is_high_yield && (
                            <Flame className='h-3 w-3 text-amber-500 fill-amber-500 shrink-0 ml-1' />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pearls Preview */}
                  {pearls.length > 0 && pearls[0] && (
                    <div className='rounded-lg bg-blue-50 dark:bg-blue-950/40 p-2.5 border border-blue-200 dark:border-blue-900 text-[11px] text-blue-950 dark:text-blue-200'>
                      <div className='font-bold text-[10px] text-blue-700 dark:text-blue-300 flex items-center gap-1 mb-0.5 uppercase tracking-wider'>
                        <Sparkles className='h-3 w-3' />
                        High-Yield Lecture Pearl
                      </div>
                      <p className='text-[11px] leading-relaxed'>{pearls[0]}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </Main>

      {/* Add Faculty Member Modal */}
      <Dialog open={isFacultyDialogOpen} onOpenChange={setIsFacultyDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <form onSubmit={handleCreateFaculty}>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2'>
                <User className='h-5 w-5 text-primary' />
                Add Medical Faculty Member
              </DialogTitle>
              <DialogDescription>
                Register a doctor or specialist educator to lead video lectures and live classes.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-3 py-3 text-xs'>
              <div className='space-y-1'>
                <Label className='text-xs'>Full Name with Credentials *</Label>
                <Input
                  value={newFacultyName}
                  onChange={(e) => setNewFacultyName(e.target.value)}
                  required
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-xs'>Academic Title / Specialty *</Label>
                <Input
                  value={newFacultyTitle}
                  onChange={(e) => setNewFacultyTitle(e.target.value)}
                  required
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-xs'>Medical Institution</Label>
                <Input
                  value={newFacultyInstitution}
                  onChange={(e) => setNewFacultyInstitution(e.target.value)}
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-xs'>Profile Photo / Avatar URL</Label>
                <div className='flex items-center gap-2'>
                  <Input
                    value={newFacultyAvatar}
                    onChange={(e) => setNewFacultyAvatar(e.target.value)}
                    className='flex-1'
                  />
                  <div className='relative'>
                    <Input
                      type='file'
                      accept='image/*'
                      className='absolute inset-0 opacity-0 cursor-pointer w-full'
                      onChange={handleAvatarFileChange}
                      disabled={isUploadingAvatar}
                    />
                    <Button type='button' variant='outline' size='icon' disabled={isUploadingAvatar}>
                      {isUploadingAvatar ? <UploadCloud className='h-4 w-4 animate-pulse' /> : <UploadCloud className='h-4 w-4' />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setIsFacultyDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={savingFaculty}>
                {savingFaculty ? 'Saving...' : 'Register Faculty'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
