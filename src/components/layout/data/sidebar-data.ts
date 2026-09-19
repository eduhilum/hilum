import {
  LayoutDashboard,
  BookOpen,
  Layers,
  HelpCircle,
  PlusCircle,
  Video,
  UploadCloud,
  Settings,
  Stethoscope,
  Users,
  ClipboardList,
  MonitorPlay,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'DocLock Administrator',
    email: 'admin@doclock.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'DocLock Medical',
      logo: Stethoscope,
      plan: 'Curriculum & QBank',
    },
  ],
  navGroups: [
    {
      title: 'Overview',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'Curriculum & Content',
      items: [
        {
          title: 'Medical Subjects',
          url: '/subjects',
          icon: BookOpen,
          badge: '19',
        },
        {
          title: 'Chapters & Topics',
          url: '/curriculum',
          icon: Layers,
        },
        {
          title: 'Flashcards',
          url: '/flashcards',
          icon: Layers,
        },
        {
          title: 'Tests & Assessments',
          url: '/tests',
          icon: ClipboardList,
        },
        {
          title: 'Live Classes',
          url: '/live-classes',
          icon: MonitorPlay,
        },
      ],
    },
    {
      title: 'Video Lectures',
      items: [
        {
          title: 'All Video Classes',
          url: '/videos',
          icon: Video,
        },
        {
          title: 'Upload Lecture',
          url: '/videos/new',
          icon: UploadCloud,
        },
      ],
    },
    {
      title: 'Question Bank (QBank)',
      items: [
        {
          title: 'All Questions',
          url: '/questions',
          icon: HelpCircle,
        },
        {
          title: 'New Question Editor',
          url: '/questions/new',
          icon: PlusCircle,
        },
      ],
    },
    {
      title: 'Management & System',
      items: [
        {
          title: 'Users & Candidates',
          url: '/users',
          icon: Users,
        },
        {
          title: 'Settings',
          url: '/settings',
          icon: Settings,
        },
      ],
    },
  ],
}
