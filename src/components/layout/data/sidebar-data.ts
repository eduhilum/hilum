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
    name: 'Hilum Administrator',
    email: 'admin@hilum.com',
    avatar: '/images/favicon.png',
  },
  teams: [
    {
      name: 'Hilum Admin Portal',
      logo: Stethoscope,
      plan: 'Medical & Examination CMS',
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
          title: 'Courses',
          url: '/courses',
          icon: Layers,
        },
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
          title: 'Grand Mocks',
          url: '/grand-mocks',
          icon: ClipboardList,
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
