import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uppajgqaapuiptzruyna.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// ============================================================================
// TYPESCRIPT DATABASE ENTITY TYPES
// ============================================================================

export interface UserProfile {
  id: string
  candidate_id: string
  full_name: string
  email: string
  avatar_url: string | null
  role: 'candidate' | 'faculty' | 'admin'
  is_pro_pass_active: boolean
  pro_pass_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface Subject {
  id: string
  name: string
  chapters_count: number
  mcq_count: number
  duration_hours: number
  video_count: number
  icon_name: string
  icon_bg_color: string
  icon_color: string
  categories: string[]
  created_at: string
}

export interface Chapter {
  id: string
  subject_id: string
  chapter_number: number
  title: string
  created_at: string
}

export interface Topic {
  id: string
  chapter_id: string
  title: string
  mcq_count: number
  duration_minutes: number
  is_high_yield: boolean
  created_at: string
}

export interface Assessment {
  id: string
  title: string
  category: 'grand-tests' | 'subject-tests' | 'mini-mocks' | 'pyqs'
  tag: string
  tag_bg_color: string
  tag_text_color: string
  tests_count: number
  mcqs_count: number
  duration_hours: number
  icon_name: string
  icon_bg_color: string
  icon_color: string
  start_time?: string | null
  end_time?: string | null
  enrolled_count?: number
  created_at: string
}

export interface McqOption {
  id: string
  question_id: string
  option_label: 'A' | 'B' | 'C' | 'D'
  option_text: string
  is_correct: boolean
  peer_percentage?: number
  option_explanation?: string | null
}

export interface McqQuestion {
  id: string
  topic_id: string | null
  assessment_id?: string | null
  question_number?: number
  clinical_vignette: string
  explanation: string
  golden_pearl: string
  difficulty: 'Easy' | 'Moderate' | 'Hard'
  is_high_yield: boolean
  is_image_based?: boolean
  image_url?: string | null
  image_caption?: string | null
  reference?: string | null
  created_at: string
  options?: McqOption[]
}

export interface FacultyProfile {
  id: string
  name: string
  title: string
  institution: string
  avatar_url: string
  created_at?: string
}

export interface VideoTimestamp {
  id?: string
  video_id?: string
  time_string: string
  seconds: number
  title: string
  is_high_yield?: boolean
}

export interface VideoPearl {
  id?: string
  video_id?: string
  pearl_text: string
}

export interface VideoClass {
  id: string
  subject_id: string
  faculty_id: string
  class_number: number
  title: string
  chapter_title: string
  duration: string
  duration_seconds: number
  video_url: string
  thumbnail_url: string
  is_high_yield: boolean
  views_count?: string
  rating?: number
  description: string
  notes_pdf_url?: string | null
  notes_pdf_size?: string | null
  associated_topic_id?: string | null
  created_at: string
  faculty?: FacultyProfile
  timestamps?: VideoTimestamp[]
  pearls?: VideoPearl[]
}

export interface LiveSession {
  id: string
  title: string
  subject_id: string
  chapter: string
  faculty_id: string
  status: 'scheduled' | 'upcoming' | 'live' | 'ended'
  start_time: string
  duration_minutes: number
  attendees_count: number
  stream_url: string | null
  thumbnail_url: string
  key_topics: string[]
  created_at: string
}

export interface FlashcardDeck {
  id: string
  subject_name: string
  icon_name: string
  accent_color: string
}

export interface Flashcard {
  id: string
  deck_id: string
  subject_name: string
  chapter_name: string
  category: string
  question: string
  answer: string
  high_yield_pearl: string
  image_url?: string | null
  created_at: string
}
