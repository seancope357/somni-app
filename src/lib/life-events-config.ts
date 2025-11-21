import { 
  Briefcase, 
  Heart, 
  Activity, 
  Plane, 
  CloudRain, 
  Trophy, 
  Users, 
  DollarSign, 
  Home, 
  BookOpen, 
  Star,
  LucideIcon
} from 'lucide-react'

export type LifeEventCategory = 
  | 'work' 
  | 'relationship' 
  | 'health' 
  | 'travel' 
  | 'loss' 
  | 'achievement' 
  | 'social' 
  | 'finance' 
  | 'move' 
  | 'study' 
  | 'other'

export interface LifeEvent {
  id: string
  user_id: string
  title: string
  description?: string
  category: LifeEventCategory
  intensity?: number // 1-5
  date_start: string // YYYY-MM-DD
  date_end?: string // YYYY-MM-DD
  tags?: string[]
  created_at: string
  updated_at: string
}

export const CATEGORY_CONFIG: Record<LifeEventCategory, {
  icon: LucideIcon
  label: string
  color: string
  bgColor: string
  borderColor: string
}> = {
  work: {
    icon: Briefcase,
    label: 'Work',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  relationship: {
    icon: Heart,
    label: 'Relationship',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200'
  },
  health: {
    icon: Activity,
    label: 'Health',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  travel: {
    icon: Plane,
    label: 'Travel',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  loss: {
    icon: CloudRain,
    label: 'Loss',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
  achievement: {
    icon: Trophy,
    label: 'Achievement',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  social: {
    icon: Users,
    label: 'Social',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  finance: {
    icon: DollarSign,
    label: 'Finance',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200'
  },
  move: {
    icon: Home,
    label: 'Move',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  study: {
    icon: BookOpen,
    label: 'Study',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200'
  },
  other: {
    icon: Star,
    label: 'Other',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200'
  }
}

export const INTENSITY_COLORS = [
  'bg-gray-300',
  'bg-blue-300',
  'bg-indigo-400',
  'bg-purple-500',
  'bg-pink-600'
]
