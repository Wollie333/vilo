import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  return (
    <div style={{ backgroundColor: 'var(--bg-primary)' }} className="flex h-screen transition-colors">
      <Sidebar />
      <div style={{ backgroundColor: 'var(--bg-secondary)' }} className="flex flex-col flex-1 overflow-hidden transition-colors">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
