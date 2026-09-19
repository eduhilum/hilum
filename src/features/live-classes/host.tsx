import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt'
import { ArrowLeft, Loader2, Send, Upload, LayoutTemplate, MessageSquare, PieChart, Presentation } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, LiveSession } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ChatMessage {
  id: string
  user_id: string
  message_text: string
  created_at: string
  user?: { full_name: string; role: string; avatar_url: string }
}

export function LiveClassHostPage() {
  const { sessionId } = useParams({ from: '/_authenticated/live-classes/host/$sessionId' })
  const navigate = useNavigate()
  
  const [session, setSession] = useState<LiveSession | null>(null)
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Real-time states
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [layoutMode, setLayoutMode] = useState<'speaker' | 'presentation'>('speaker')
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const appID = Number(import.meta.env.VITE_ZEGOCLOUD_APP_ID)
  const serverSecret = import.meta.env.VITE_ZEGOCLOUD_SERVER_SECRET

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data, error } = await supabase
          .from('live_sessions')
          .select('*')
          .eq('id', sessionId)
          .single()
          
        if (error) throw error
        setSession(data as LiveSession)
      } catch (err: any) {
        toast.error('Could not load session details: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    
    if (sessionId) fetchSession()
  }, [sessionId])

  useEffect(() => {
    if (!containerRef.current || !session) return
    if (!appID || !serverSecret) return

    const roomID = session.stream_url || `room_${session.id}`
    const userID = 'admin_host_' + Math.random().toString(36).substring(7)
    const userName = 'DocLock Administrator (Host)'

    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, roomID, userID, userName)
    const zp = ZegoUIKitPrebuilt.create(kitToken)

    zp.joinRoom({
      container: containerRef.current,
      scenario: { mode: ZegoUIKitPrebuilt.LiveStreaming, config: { role: ZegoUIKitPrebuilt.Host } },
      showPreJoinView: true,
      turnOnMicrophoneWhenJoining: false,
      turnOnCameraWhenJoining: true,
      showMyCameraToggleButton: true,
      showMyMicrophoneToggleButton: true,
      showAudioVideoSettingsButton: true,
      showScreenSharingButton: true,
      showTextChat: false, // We'll build our own chat
      showUserList: false, // We'll build our own list
      onJoinRoom: async () => {
        toast.success('Joined broadcast studio')
        await supabase.from('live_sessions').update({ status: 'live' }).eq('id', session.id)
      },
      onLeaveRoom: async () => {
        toast.info('Left the broadcast room.')
        await supabase.from('live_sessions').update({ status: 'ended' }).eq('id', session.id)
        navigate({ to: '/live-classes' })
      },
    })

    return () => {
      if (zp) zp.destroy()
    }
  }, [session, appID, serverSecret, navigate])

  // Realtime Chat & Broadcast Sync
  useEffect(() => {
    if (!session) return

    // Load initial chat
    supabase.from('live_chat_messages')
      .select('*, user:user_profiles(full_name, role, avatar_url)')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => setMessages(data || []))

    // Sub to Chat inserts
    const chatChannel = supabase.channel(`live-chat-${session.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_chat_messages', filter: `session_id=eq.${session.id}` }, (payload) => {
        const newMsg = payload.new as ChatMessage
        setMessages(prev => [...prev, newMsg])
      })
      .subscribe()

    // Sub to layout/reaction Broadcasts
    const broadcastChannel = supabase.channel(`live-broadcast-${session.id}`, {
      config: { broadcast: { self: true } }
    })
      .on('broadcast', { event: 'reaction' }, (payload) => {
        toast(`Student reacted: ${payload.payload.emoji}`, { position: 'top-right' })
      })
      .on('broadcast', { event: 'layout_change' }, (payload) => {
        setLayoutMode(payload.payload.mode)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(chatChannel)
      supabase.removeChannel(broadcastChannel)
    }
  }, [session])

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !session) return
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('live_chat_messages').insert({
      session_id: session.id,
      user_id: user.id,
      message_text: newMessage.trim(),
    })

    if (error) toast.error(error.message)
    else setNewMessage('')
  }

  const broadcastLayout = async (mode: 'speaker' | 'presentation') => {
    if (!session) return
    setLayoutMode(mode)
    const channel = supabase.channel(`live-broadcast-${session.id}`)
    await channel.send({
      type: 'broadcast',
      event: 'layout_change',
      payload: { mode }
    })
    toast.success(`Layout changed to ${mode}`)
  }

  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [isUploading, setIsUploading] = useState(false)

  const handleUploadSlide = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !session) return

    setIsUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${session.id}_${Date.now()}.${fileExt}`

    try {
      const { data, error } = await supabase.storage
        .from('live_class_slides')
        .upload(fileName, file)
      
      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('live_class_slides')
        .getPublicUrl(data.path)

      await supabase.from('live_sessions')
        .update({ thumbnail_url: publicUrl })
        .eq('id', session.id)

      const channel = supabase.channel(`live-broadcast-${session.id}`)
      await channel.send({
        type: 'broadcast',
        event: 'slide_change',
        payload: { url: publicUrl }
      })

      toast.success('Slide uploaded and broadcasted successfully!')
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message)
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }
  
  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || !pollQuestion.trim()) return

    const filledOptions = pollOptions.filter(o => o.trim())
    if (filledOptions.length < 2) {
      toast.error('Please provide at least 2 options')
      return
    }

    try {
      // Deactivate old polls
      await supabase.from('live_polls').update({ is_active: false }).eq('session_id', session.id)

      // Create new poll
      const { data: pollData, error: pollError } = await supabase.from('live_polls').insert({
        session_id: session.id,
        question: pollQuestion.trim(),
        is_active: true
      }).select().single()

      if (pollError) throw pollError

      // Insert options
      const optionsToInsert = filledOptions.map((opt, i) => ({
        poll_id: pollData.id,
        option_text: opt.trim(),
        option_order: i
      }))

      const { error: optError } = await supabase.from('live_poll_options').insert(optionsToInsert)
      if (optError) throw optError

      toast.success('Poll published!')
      setPollQuestion('')
      setPollOptions(['', ''])
    } catch (err: any) {
      toast.error('Failed to create poll: ' + err.message)
    }
  }

  if (loading) {
    return (
      <Main className='flex items-center justify-center min-h-[calc(100vh-4rem)]'>
        <div className='flex flex-col items-center gap-2'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
          <p className='text-sm text-muted-foreground'>Initializing Broadcast Studio...</p>
        </div>
      </Main>
    )
  }

  if (!session) {
    return (
      <Main className='flex items-center justify-center'>
        <p className='text-muted-foreground'>Session not found.</p>
      </Main>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Header className="h-14 border-b shrink-0">
        <div className='flex items-center gap-2'>
          <Button variant='ghost' size='icon' className='h-8 w-8' onClick={() => navigate({ to: '/live-classes' })}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-sm font-semibold tracking-tight'>Live Broadcast Studio</h1>
            <p className='text-xs text-muted-foreground flex items-center gap-2'>
              {session.title} 
              {session.status === 'live' && <span className='flex h-2 w-2 rounded-full bg-red-500 animate-pulse'></span>}
            </p>
          </div>
        </div>
        <div className='ms-auto flex items-center gap-4'>
          <ThemeSwitch />
        </div>
      </Header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: ZegoCloud Player */}
        <div className="flex-1 bg-black relative border-r">
          {!appID || !serverSecret ? (
            <div className='flex flex-col items-center justify-center h-full gap-4 text-center p-8'>
              <div className='bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 p-6 rounded-xl max-w-lg'>
                <h3 className='font-bold text-lg mb-2'>Configuration Error</h3>
                <p className='text-sm mb-4'>Credentials are missing in .env</p>
              </div>
            </div>
          ) : (
            <div ref={containerRef} className='w-full h-full' />
          )}
        </div>

        {/* Right Side: Interactive Panel */}
        <div className="w-96 flex flex-col bg-card shrink-0">
          <Tabs defaultValue="chat" className="flex flex-col flex-1 h-full">
            <TabsList className="w-full justify-start rounded-none border-b h-12 bg-transparent p-0 px-2 gap-4">
              <TabsTrigger value="chat" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full gap-2">
                <MessageSquare className="w-4 h-4" /> Chat
              </TabsTrigger>
              <TabsTrigger value="polls" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full gap-2">
                <PieChart className="w-4 h-4" /> Polls
              </TabsTrigger>
              <TabsTrigger value="slides" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full gap-2">
                <Presentation className="w-4 h-4" /> Slides
              </TabsTrigger>
            </TabsList>

            {/* CHAT TAB */}
            <TabsContent value="chat" className="flex-1 flex flex-col m-0 data-[state=inactive]:hidden">
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map(msg => (
                    <div key={msg.id} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{msg.user?.full_name || 'Admin'}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(msg.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm bg-muted/50 p-2 rounded-md">{msg.message_text}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-3 border-t bg-muted/20">
                <form onSubmit={handleSendChat} className="flex gap-2">
                  <Input 
                    placeholder="Type a message..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </TabsContent>

            {/* POLLS TAB */}
            <TabsContent value="polls" className="flex-1 p-4 m-0 data-[state=inactive]:hidden overflow-y-auto">
               <form onSubmit={handleCreatePoll} className="space-y-4">
                 <div className="space-y-2">
                   <Label>Poll Question</Label>
                   <Input 
                     placeholder="e.g. What is the most common side effect?" 
                     value={pollQuestion}
                     onChange={(e) => setPollQuestion(e.target.value)}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Options</Label>
                   {pollOptions.map((opt, i) => (
                     <Input 
                       key={i}
                       placeholder={`Option ${i + 1}`}
                       value={opt}
                       onChange={(e) => {
                         const newOpts = [...pollOptions]
                         newOpts[i] = e.target.value
                         setPollOptions(newOpts)
                       }}
                     />
                   ))}
                   <Button 
                     type="button" 
                     variant="outline" 
                     size="sm" 
                     className="w-full mt-2"
                     onClick={() => setPollOptions([...pollOptions, ''])}
                   >
                     + Add Option
                   </Button>
                 </div>
                 <Button type="submit" className="w-full">Publish Poll to Students</Button>
               </form>
            </TabsContent>

            {/* SLIDES TAB */}
            <TabsContent value="slides" className="flex-1 flex flex-col m-0 data-[state=inactive]:hidden p-4 gap-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Live Presentation View</h3>
                <p className="text-xs text-muted-foreground">Control what your students see on their devices in real-time.</p>
                
                <div className="flex gap-2 mt-2">
                  <Button 
                    variant={layoutMode === 'speaker' ? 'default' : 'outline'}
                    className="flex-1 gap-2 text-xs"
                    onClick={() => broadcastLayout('speaker')}
                  >
                    <LayoutTemplate className="w-4 h-4" /> Faculty Focus
                  </Button>
                  <Button 
                    variant={layoutMode === 'presentation' ? 'default' : 'outline'}
                    className="flex-1 gap-2 text-xs"
                    onClick={() => broadcastLayout('presentation')}
                  >
                    <Presentation className="w-4 h-4" /> Slide Focus
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Upload Slide Deck (PDF or Image)</h3>
                <label className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground transition-colors cursor-pointer ${isUploading ? 'opacity-50' : 'hover:bg-muted/50'}`}>
                  {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                  <p className="text-sm">{isUploading ? 'Uploading...' : 'Click to upload PDF/Image'}</p>
                  <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleUploadSlide} disabled={isUploading} />
                </label>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
