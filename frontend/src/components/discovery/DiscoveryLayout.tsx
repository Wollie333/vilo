import { Outlet } from 'react-router-dom'
import DiscoveryHeader from './DiscoveryHeader'
import DiscoveryFooter from './DiscoveryFooter'

export default function DiscoveryLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <DiscoveryHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <DiscoveryFooter />
    </div>
  )
}
