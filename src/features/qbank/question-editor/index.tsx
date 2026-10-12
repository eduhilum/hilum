import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Save,
  Flame,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Layers,
  HelpCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase, Subject, Chapter, Topic, Assessment } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

export function QuestionEditorPage() {
  const navigate = useNavigate()

  // Curriculum Cascade Selectors
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [topics, setTopics] = useState<Topic[]>([])

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [selectedChapterId, setSelectedChapterId] = useState<string>('')
  const [selectedTopicId, setSelectedTopicId] = useState<string>('')
  
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')

  // Assessment Selectors
  const [questionMode, setQuestionMode] = useState<'curriculum' | 'assessment'>('curriculum')
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('')

  // Form Fields
  const [clinicalVignette, setClinicalVignette] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [optionC, setOptionC] = useState('')
  const [optionD, setOptionD] = useState('')
  const [correctOption, setCorrectOption] = useState<'A' | 'B' | 'C' | 'D'>('A')
  const [explanation, setExplanation] = useState('')
  const [goldenPearl, setGoldenPearl] = useState('')
  const [reference, setReference] = useState('')
  const [difficulty, setDifficulty] = useState<'Easy' | 'Moderate' | 'Hard'>('Moderate')
  const [isHighYield, setIsHighYield] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load Subjects and Assessments
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

    supabase
      .from('assessments')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAssessments(data as Assessment[])
          setSelectedAssessmentId(data[0].id)
        }
      })

    supabase
      .from('courses')
      .select('id, title')
      .order('title')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCourses(data)
          setSelectedCourseId(data[0].id)
        }
      })
  }, [])

  // Load Chapters when Subject changes
  useEffect(() => {
    if (!selectedSubjectId) return
    supabase
      .from('chapters')
      .select('*')
      .eq('subject_id', selectedSubjectId)
      .order('chapter_number', { ascending: true })
      .then(({ data }) => {
        const chaps = (data as Chapter[]) || []
        setChapters(chaps)
        if (chaps.length > 0) {
          setSelectedChapterId(chaps[0].id)
        } else {
          setSelectedChapterId('')
          setTopics([])
          setSelectedTopicId('')
        }
      })
  }, [selectedSubjectId])

  // Load Topics when Chapter changes
  useEffect(() => {
    if (!selectedChapterId) {
      setTopics([])
      setSelectedTopicId('')
      return
    }
    supabase
      .from('topics')
      .select('*')
      .eq('chapter_id', selectedChapterId)
      .order('title', { ascending: true })
      .then(({ data }) => {
        const tops = (data as Topic[]) || []
        setTopics(tops)
        if (tops.length > 0) {
          setSelectedTopicId(tops[0].id)
        } else {
          setSelectedTopicId('')
        }
      })
  }, [selectedChapterId])

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!questionText.trim()) {
      toast.error('Please enter the question text.')
      return
    }
    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      toast.error('Please provide all 4 options (A, B, C, D).')
      return
    }

    setSaving(true)
    try {
      // 1. Combine clinical vignette & stem into clinical_vignette (not null in DB)
      const combinedVignette = clinicalVignette.trim()
        ? `${clinicalVignette.trim()}\n\n${questionText.trim()}`
        : questionText.trim()

      const pearlText = goldenPearl.trim() || 'High-Yield Clinical Pearl.'
      const explanationText = explanation.trim() || pearlText

      // 2. Insert Question
      const { data: qData, error: qErr } = await supabase
        .from('mcq_questions')
        .insert([
          {
            topic_id: questionMode === 'curriculum' ? (selectedTopicId || null) : null,
            assessment_id: questionMode === 'assessment' ? (selectedAssessmentId || null) : null,
            clinical_vignette: combinedVignette,
            explanation: explanationText,
            golden_pearl: pearlText,
            difficulty: difficulty,
            is_high_yield: isHighYield,
            is_image_based: false,
            reference: reference.trim() || null,
            course_id: selectedCourseId || null,
          },
        ])
        .select()
        .single()

      if (qErr) throw qErr
      const questionId = qData.id

      // 3. Insert 4 Options with option_label ('A', 'B', 'C', 'D')
      const optionsPayload = [
        {
          question_id: questionId,
          option_label: 'A',
          option_text: optionA.trim(),
          is_correct: correctOption === 'A',
          peer_percentage: correctOption === 'A' ? 78 : 7,
        },
        {
          question_id: questionId,
          option_label: 'B',
          option_text: optionB.trim(),
          is_correct: correctOption === 'B',
          peer_percentage: correctOption === 'B' ? 78 : 7,
        },
        {
          question_id: questionId,
          option_label: 'C',
          option_text: optionC.trim(),
          is_correct: correctOption === 'C',
          peer_percentage: correctOption === 'C' ? 78 : 8,
        },
        {
          question_id: questionId,
          option_label: 'D',
          option_text: optionD.trim(),
          is_correct: correctOption === 'D',
          peer_percentage: correctOption === 'D' ? 78 : 8,
        },
      ]

      const { error: optErr } = await supabase.from('mcq_options').insert(optionsPayload)
      if (optErr) throw optErr

      toast.success('Clinical Question successfully published to QBank!')
      navigate({ to: '/questions' })
    } catch (err: any) {
      toast.error('Failed to save question: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId)
  const selectedTopic = topics.find((t) => t.id === selectedTopicId)

  return (
    <>
      <Header>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => navigate({ to: '/questions' })}
            className='h-8 w-8 text-muted-foreground'
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <h1 className='text-lg font-semibold tracking-tight'>Question Authoring Studio</h1>
        </div>
        <div className='ms-auto flex items-center gap-2'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <form onSubmit={handleSaveQuestion}>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6'>
            <div>
              <h2 className='text-2xl font-bold tracking-tight'>Author Clinical Question</h2>
              <p className='text-sm text-muted-foreground'>
                Craft vignettes, distractors, and golden pearls for FMGE, NEET PG, and USMLE candidates.
              </p>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => navigate({ to: '/questions' })}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={saving} className='gap-2'>
                <Save className='h-4 w-4' />
                {saving ? 'Saving...' : 'Publish to QBank'}
              </Button>
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
            {/* Left Column: Form Inputs (7 cols) */}
            <div className='lg:col-span-7 space-y-6'>
              {/* 1. Curriculum Hierarchy Card */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <Layers className='h-4 w-4 text-primary' />
                    Curriculum Location
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Assign this question to a medical specialty chapter, or to a standalone mock test.
                  </CardDescription>
                </CardHeader>
                <CardContent className='pt-0'>
                  <div className='mb-4'>
                    <Label className='text-xs'>Target Course *</Label>
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
                  <Tabs value={questionMode} onValueChange={(v: any) => setQuestionMode(v)} className='w-full'>
                    <TabsList className='w-full grid grid-cols-2 mb-4'>
                      <TabsTrigger value='curriculum'>QBank Curriculum</TabsTrigger>
                      <TabsTrigger value='assessment'>Mock Test</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value='curriculum' className='grid grid-cols-1 sm:grid-cols-3 gap-3 mt-0'>
                      <div>
                        <Label className='text-xs'>Subject</Label>
                        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                          <SelectTrigger className='mt-1 text-xs'>
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

                      <div>
                        <Label className='text-xs'>Chapter</Label>
                        <Select
                          value={selectedChapterId}
                          onValueChange={setSelectedChapterId}
                          disabled={chapters.length === 0}
                        >
                          <SelectTrigger className='mt-1 text-xs'>
                            <SelectValue placeholder={chapters.length === 0 ? 'No Chapters' : 'Select Chapter'} />
                          </SelectTrigger>
                          <SelectContent>
                            {chapters.map((chap) => (
                              <SelectItem key={chap.id} value={chap.id}>
                                {chap.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className='text-xs'>Topic</Label>
                        <Select
                          value={selectedTopicId}
                          onValueChange={setSelectedTopicId}
                          disabled={topics.length === 0}
                        >
                          <SelectTrigger className='mt-1 text-xs'>
                            <SelectValue placeholder={topics.length === 0 ? 'No Topics' : 'Select Topic'} />
                          </SelectTrigger>
                          <SelectContent>
                            {topics.map((top) => (
                              <SelectItem key={top.id} value={top.id}>
                                {top.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value='assessment' className='mt-0'>
                      <div>
                        <Label className='text-xs'>Target Assessment</Label>
                        <Select
                          value={selectedAssessmentId}
                          onValueChange={setSelectedAssessmentId}
                          disabled={assessments.length === 0}
                        >
                          <SelectTrigger className='mt-1 text-xs'>
                            <SelectValue placeholder={assessments.length === 0 ? 'No Assessments Found' : 'Select Test'} />
                          </SelectTrigger>
                          <SelectContent>
                            {assessments.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.title} ({a.category.replace('-', ' ')})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className='text-[11px] text-muted-foreground mt-2'>
                          Questions added to mock tests do not appear in the general QBank curriculum flow.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* 2. Clinical Vignette & Question Stem */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <HelpCircle className='h-4 w-4 text-primary' />
                    Question Content
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-4 pt-0'>
                  <div className='space-y-1.5'>
                    <Label htmlFor='vignette' className='text-xs'>
                      Clinical Vignette / Patient Case (Optional)
                    </Label>
                    <Textarea
                      id='vignette'
                      placeholder='A 54-year-old female presents to the emergency department with a 3-hour history of severe substernal chest pressure radiating to her left jaw. ECG reveals ST-segment elevation in leads II, III, and aVF...'
                      value={clinicalVignette}
                      onChange={(e) => setClinicalVignette(e.target.value)}
                      rows={3}
                      className='text-xs leading-relaxed resize-none'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label htmlFor='qtext' className='text-xs font-semibold'>
                      Question Prompt / Stem *
                    </Label>
                    <Input
                      id='qtext'
                      placeholder='Which of the following coronary arteries is most likely occluded?'
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      required
                      className='text-sm'
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 3. Four Multiple Choice Options */}
              <Card>
                <CardHeader className='pb-3'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-base'>Answer Options</CardTitle>
                      <CardDescription className='text-xs'>
                        Provide 4 choices and select the single correct option.
                      </CardDescription>
                    </div>
                    <Badge variant='outline' className='text-[11px] font-mono text-emerald-600 border-emerald-300'>
                      Correct: Option {correctOption}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className='space-y-3 pt-0'>
                  <RadioGroup
                    value={correctOption}
                    onValueChange={(val: any) => setCorrectOption(val)}
                    className='space-y-2.5'
                  >
                    {[
                      { letter: 'A', val: optionA, setVal: setOptionA, placeholder: 'Right coronary artery (RCA)' },
                      { letter: 'B', val: optionB, setVal: setOptionB, placeholder: 'Left anterior descending (LAD)' },
                      { letter: 'C', val: optionC, setVal: setOptionC, placeholder: 'Left circumflex artery (LCx)' },
                      { letter: 'D', val: optionD, setVal: setOptionD, placeholder: 'Left main coronary artery (LMCA)' },
                    ].map((opt) => (
                      <div
                        key={opt.letter}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                          correctOption === opt.letter
                            ? 'bg-emerald-50/70 border-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-700'
                            : 'bg-card border-border/70'
                        }`}
                      >
                        <RadioGroupItem value={opt.letter} id={`opt-${opt.letter}`} />
                        <span className='font-mono font-bold text-sm w-4'>{opt.letter}</span>
                        <Input
                          placeholder={opt.placeholder}
                          value={opt.val}
                          onChange={(e) => opt.setVal(e.target.value)}
                          required
                          className='h-9 text-xs flex-1 bg-background'
                        />
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* 4. Golden Pearl & Clinical Explanation */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <Sparkles className='h-4 w-4 text-amber-500' />
                    Clinical Pearl & Explanation
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Define the core high-yield exam takeaway and comprehensive distractor reasoning.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4 pt-0'>
                  <div className='space-y-1.5'>
                    <Label htmlFor='pearl' className='text-xs font-semibold flex items-center gap-1.5'>
                      <Sparkles className='h-3 w-3 text-amber-500' />
                      High-Yield Golden Pearl *
                    </Label>
                    <Textarea
                      id='pearl'
                      placeholder='Key takeaway: Nitrates predominantly cause venodilation (preload reduction) at standard clinical doses; arteriolar dilation occurs only at higher doses.'
                      value={goldenPearl}
                      onChange={(e) => setGoldenPearl(e.target.value)}
                      rows={2}
                      className='text-xs leading-relaxed resize-none'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label htmlFor='explanation' className='text-xs font-semibold'>
                      Detailed Clinical Explanation & Distractor Analysis *
                    </Label>
                    <Textarea
                      id='explanation'
                      placeholder='Nitroglycerin exerts its primary anti-anginal effect via venous capacitance vessel dilation (venodilation). This causes pooling of blood in peripheral veins, reducing venous return and left ventricular preload (LVEDV)...'
                      value={explanation}
                      onChange={(e) => setExplanation(e.target.value)}
                      rows={4}
                      className='text-xs leading-relaxed resize-none'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label htmlFor='reference' className='text-xs'>
                      Textbook Citation / Reference (Optional)
                    </Label>
                    <Input
                      id='reference'
                      placeholder="Harrison's Internal Medicine 21st Ed. / Goodman & Gilman"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className='text-xs h-9'
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 5. Classification & Difficulty */}
              <Card>
                <CardContent className='pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label className='text-xs'>Difficulty Level</Label>
                    <Select value={difficulty} onValueChange={(val: any) => setDifficulty(val)}>
                      <SelectTrigger className='text-xs'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='Easy'>Easy (Rapid Recall)</SelectItem>
                        <SelectItem value='Moderate'>Moderate (Clinical Scenario)</SelectItem>
                        <SelectItem value='Hard'>Hard (Multi-Step Synthesis)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='flex items-center justify-between rounded-lg border p-3'>
                    <div className='space-y-0.5'>
                      <Label htmlFor='hy-toggle' className='text-xs font-semibold'>
                        High-Yield Tag
                      </Label>
                      <p className='text-[11px] text-muted-foreground'>
                        Feature in Daily High-Yield MCQ Drill
                      </p>
                    </div>
                    <Switch id='hy-toggle' checked={isHighYield} onCheckedChange={setIsHighYield} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Live Mobile Card Preview (5 cols) */}
            <div className='lg:col-span-5'>
              <div className='sticky top-20 space-y-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-1.5 text-xs font-semibold text-muted-foreground'>
                    <Smartphone className='h-4 w-4' />
                    <span>Live Hilum Mobile App Preview</span>
                  </div>
                  <Badge variant='outline' className='text-[10px]'>
                    Synchronized
                  </Badge>
                </div>

                {/* Simulated Mobile Card */}
                <div className='rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 shadow-xl'>
                  {/* Subject Tag & Status bar */}
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center gap-1.5'>
                      {questionMode === 'curriculum' ? (
                        <span className='px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider'>
                          {selectedSubject?.name || 'SUBJECT'} {selectedTopic ? `• ${selectedTopic.title}` : ''}
                        </span>
                      ) : (
                        <span className='px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-bold text-[10px] uppercase tracking-wider'>
                          MOCK EXAM
                        </span>
                      )}
                      {isHighYield && (
                        <span className='flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 font-bold text-[10px]'>
                          <Flame className='h-3 w-3 fill-amber-500' />
                          HIGH YIELD
                        </span>
                      )}
                    </div>
                    <span className='text-[10px] capitalize text-muted-foreground font-medium'>
                      {difficulty}
                    </span>
                  </div>

                  {/* Vignette Preview */}
                  {clinicalVignette ? (
                    <p className='text-[11.5px] leading-relaxed text-slate-700 dark:text-slate-300 mb-2 italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800'>
                      "{clinicalVignette}"
                    </p>
                  ) : null}

                  {/* Question Stem Preview */}
                  <h4 className='text-[13px] font-bold text-slate-900 dark:text-white leading-snug mb-3'>
                    {questionText || 'Enter your question prompt above to preview...'}
                  </h4>

                  {/* Options Preview */}
                  <div className='space-y-1.5 mb-3'>
                    {[
                      { letter: 'A', text: optionA },
                      { letter: 'B', text: optionB },
                      { letter: 'C', text: optionC },
                      { letter: 'D', text: optionD },
                    ].map((opt) => {
                      const isCorrect = correctOption === opt.letter
                      return (
                        <div
                          key={opt.letter}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] font-medium transition-all ${
                            isCorrect
                              ? 'bg-emerald-50 text-emerald-950 border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700 font-semibold'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-bold ${
                              isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {opt.letter}
                          </div>
                          <span className='truncate flex-1'>{opt.text || `Option ${opt.letter}`}</span>
                          {isCorrect && <CheckCircle2 className='h-3.5 w-3.5 text-emerald-600 shrink-0' />}
                        </div>
                      )
                    })}
                  </div>

                  {/* Golden Pearl Preview Box */}
                  {goldenPearl ? (
                    <div className='rounded-lg bg-blue-50/80 dark:bg-blue-950/40 p-2.5 border border-blue-200 dark:border-blue-900 text-[11px] leading-relaxed text-blue-950 dark:text-blue-200 mb-2'>
                      <div className='font-bold text-[10px] text-blue-700 dark:text-blue-300 flex items-center gap-1 mb-0.5 uppercase tracking-wider'>
                        <Sparkles className='h-3 w-3' />
                        Clinical Pearl
                      </div>
                      <p>{goldenPearl}</p>
                    </div>
                  ) : null}

                  {/* Explanation Preview Box */}
                  {explanation ? (
                    <div className='rounded-lg bg-slate-100 dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300'>
                      <div className='font-bold text-[10px] text-slate-900 dark:text-white flex items-center gap-1 mb-0.5 uppercase tracking-wider'>
                        <CheckCircle2 className='h-3 w-3 text-emerald-600' />
                        Distractor Rationale
                      </div>
                      <p className='line-clamp-3'>{explanation}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </form>
      </Main>
    </>
  )
}
