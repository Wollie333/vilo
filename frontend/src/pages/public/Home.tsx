import { Loader2 } from 'lucide-react'
import { useHomeData } from '../../hooks/useHomeData'
import { useCMSPage } from '../../hooks/useCMSPage'
import { useTenant } from '../../contexts/TenantContext'
import { SectionRenderer } from '../../components/sections'

export default function Home() {
  const { rooms, reviews, loading: dataLoading } = useHomeData()
  const { sections, colors, loading: cmsLoading } = useCMSPage('home')
  const { tenant } = useTenant()

  // Show loading state while fetching CMS settings
  if (cmsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <SectionRenderer
      pageType="home"
      sections={sections}
      rooms={rooms}
      reviews={reviews}
      loading={dataLoading}
      tenant={tenant}
      colors={colors}
    />
  )
}
