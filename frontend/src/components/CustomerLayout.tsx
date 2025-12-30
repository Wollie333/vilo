import { Outlet } from 'react-router-dom'
import CustomerSidebar from './CustomerSidebar'
import CustomerHeader from './CustomerHeader'

export default function CustomerLayout() {
  return (
    <div style={{ backgroundColor: 'var(--bg-primary)' }} className="flex h-screen transition-colors">
      <CustomerSidebar />
      <div style={{ backgroundColor: 'var(--bg-secondary)' }} className="flex flex-col flex-1 overflow-hidden transition-colors">
        <CustomerHeader />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
