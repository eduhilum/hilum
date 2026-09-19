import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  HelpCircle,
  BookOpen,
  Layers,
  Flame,
  Plus,
  ArrowUpRight,
  Stethoscope,
  Activity,
  CheckCircle2,
  Video,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

export function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalSubjects: 0,
    totalChapters: 0,
    totalTopics: 0,
    totalHighYield: 0,
  })
  const [recentQuestions, setRecentQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true)
      try {
        const [
          { count: qCount },
          { count: sCount },
          { count: cCount },
          { count: tCount },
          { count: hyCount },
          { data: recentQ },
        ] = await Promise.all([
          supabase.from('mcq_questions').select('*', { count: 'exact', head: true }),
          supabase.from('subjects').select('*', { count: 'exact', head: true }),
          supabase.from('chapters').select('*', { count: 'exact', head: true }),
          supabase.from('topics').select('*', { count: 'exact', head: true }),
          supabase.from('mcq_questions').select('*', { count: 'exact', head: true }).eq('is_high_yield', true),
          supabase.from('mcq_questions').select('*').order('created_at', { ascending: false }).limit(5),
        ])

        setStats({
          totalQuestions: qCount || 0,
          totalSubjects: sCount || 0,
          totalChapters: cCount || 0,
          totalTopics: tCount || 0,
          totalHighYield: hyCount || 0,
        })
        setRecentQuestions(recentQ || [])
      } catch (e) {
        console.error('Error loading dashboard stats:', e)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <Activity className='h-5 w-5 text-primary' />
          <h1 className='text-lg font-semibold tracking-tight'>DocLock Medical Command Center</h1>
        </div>
        <div className='ms-auto flex items-center gap-2'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Admin Overview</h2>
            <p className='text-sm text-muted-foreground'>
              Realtime Supabase curriculum statistics and QBank management hub.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={() => navigate({ to: '/subjects' })}
              className='gap-1.5'
            >
              <BookOpen className='h-4 w-4' />
              Subjects
            </Button>
            <Button
              onClick={() => navigate({ to: '/questions/new' })}
              className='gap-1.5'
            >
              <Plus className='h-4 w-4' />
              New MCQ
            </Button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Total QBank MCQs
              </CardTitle>
              <HelpCircle className='h-4 w-4 text-primary' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{loading ? '...' : stats.totalQuestions}</div>
              <p className='text-xs text-muted-foreground mt-1'>
                Active in mobile student drills
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Curriculum Subjects
              </CardTitle>
              <BookOpen className='h-4 w-4 text-blue-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{loading ? '...' : stats.totalSubjects}</div>
              <p className='text-xs text-muted-foreground mt-1'>
                Clinical & Pre-Clinical specialties
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Chapters & Topics
              </CardTitle>
              <Layers className='h-4 w-4 text-emerald-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {loading ? '...' : `${stats.totalChapters} / ${stats.totalTopics}`}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Syllabus breakdown hierarchy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                High-Yield Pearls
              </CardTitle>
              <Flame className='h-4 w-4 text-amber-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{loading ? '...' : stats.totalHighYield}</div>
              <p className='text-xs text-muted-foreground mt-1'>
                Featured in rapid recall drills
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Action Banner & Recent Questions */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
          <Card className='lg:col-span-8'>
            <CardHeader className='flex flex-row items-center justify-between'>
              <div>
                <CardTitle className='text-base'>Recently Published MCQs</CardTitle>
                <CardDescription className='text-xs'>
                  Latest questions added to the Supabase database
                </CardDescription>
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => navigate({ to: '/questions' })}
                className='text-xs gap-1'
              >
                View All <ArrowUpRight className='h-3.5 w-3.5' />
              </Button>
            </CardHeader>

            <CardContent className='pt-0'>
              {recentQuestions.length === 0 ? (
                <div className='py-8 text-center text-xs text-muted-foreground'>
                  No questions found in the database.
                </div>
              ) : (
                <div className='divide-y rounded-lg border text-xs'>
                  {recentQuestions.map((q) => (
                    <div key={q.id} className='p-3 flex items-center justify-between hover:bg-muted/30 transition-colors'>
                      <div className='space-y-1 flex-1 mr-4 min-w-0'>
                        <div className='flex items-center gap-2'>
                          <span className='font-semibold text-foreground truncate block'>{q.clinical_vignette}</span>
                          {q.is_high_yield && (
                            <Badge variant='secondary' className='text-[10px] gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 shrink-0'>
                              <Flame className='h-3 w-3 fill-amber-500 text-amber-500' />
                              HY
                            </Badge>
                          )}
                        </div>
                        {q.golden_pearl && (
                          <p className='text-muted-foreground text-[11px] truncate italic'>
                            "{q.golden_pearl}"
                          </p>
                        )}
                      </div>
                      <Badge variant='outline' className='capitalize text-[10px] shrink-0 font-medium'>
                        {q.difficulty}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className='lg:col-span-4'>
            <CardHeader>
              <CardTitle className='text-base flex items-center gap-2'>
                <Stethoscope className='h-4 w-4 text-primary' />
                Administrative Shortcuts
              </CardTitle>
              <CardDescription className='text-xs'>
                Quick management tools
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3 pt-0'>
              <Button
                variant='outline'
                onClick={() => navigate({ to: '/questions/new' })}
                className='w-full justify-start gap-2.5 h-11 text-xs'
              >
                <Plus className='h-4 w-4 text-primary' />
                Author New Clinical Question
              </Button>

              <Button
                variant='outline'
                onClick={() => navigate({ to: '/videos/new' })}
                className='w-full justify-start gap-2.5 h-11 text-xs'
              >
                <Video className='h-4 w-4 text-purple-600' />
                Upload Medical Video Lecture
              </Button>

              <Button
                variant='outline'
                onClick={() => navigate({ to: '/subjects' })}
                className='w-full justify-start gap-2.5 h-11 text-xs'
              >
                <BookOpen className='h-4 w-4 text-blue-600' />
                Configure Medical Specialties
              </Button>

              <Button
                variant='outline'
                onClick={() => navigate({ to: '/curriculum' })}
                className='w-full justify-start gap-2.5 h-11 text-xs'
              >
                <Layers className='h-4 w-4 text-emerald-600' />
                Manage Chapters & Topics
              </Button>

              <div className='rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground border space-y-1 mt-4'>
                <div className='font-semibold text-foreground flex items-center gap-1.5'>
                  <CheckCircle2 className='h-3.5 w-3.5 text-emerald-600' />
                  Mobile App Synchronized
                </div>
                <p>
                  Any updates made in this portal are immediately active for students studying on DocLock mobile Expo Go.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
