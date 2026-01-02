import type { LucideIcon } from 'lucide-react'

export type SectionStatus = 'complete' | 'partial' | 'empty'

export interface SectionItem {
  id: string
  name: string
  icon: LucideIcon
}

export interface SectionGroup {
  id: string
  name: string
  items: SectionItem[]
}

export interface IncompleteItem {
  id: string
  label: string
  section: string
}
