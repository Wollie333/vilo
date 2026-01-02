import { Home, Eye, Calendar, DollarSign, TrendingUp, Trophy } from 'lucide-react'
import Table from '../../../components/Table'
import { RoomPerformance } from '../../../services/analyticsApi'

interface Props {
  rooms: RoomPerformance[] | null
  loading?: boolean
  currency?: string
}

function formatCurrency(amount: number, currency = 'ZAR'): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function RoomPerformanceSection({ rooms, loading, currency = 'ZAR' }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-100">
            <Home className="text-cyan-600" size={20} />
          </div>
          <div>
            <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold">Room Performance</h2>
            <p style={{ color: 'var(--text-muted)' }} className="text-sm">Individual room metrics and rankings</p>
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-6 animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} style={{ backgroundColor: 'var(--bg-secondary)' }} className="h-12 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!rooms || rooms.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-100">
            <Home className="text-cyan-600" size={20} />
          </div>
          <div>
            <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold">Room Performance</h2>
            <p style={{ color: 'var(--text-muted)' }} className="text-sm">Individual room metrics and rankings</p>
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-6">
          <div style={{ color: 'var(--text-muted)' }} className="flex items-center justify-center h-32 text-sm">
            No room data available
          </div>
        </div>
      </div>
    )
  }

  // Sort by revenue for top performers
  const sortedByRevenue = [...rooms].sort((a, b) => b.revenue - a.revenue)
  const topPerformers = sortedByRevenue.slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-cyan-100">
          <Home className="text-cyan-600" size={20} />
        </div>
        <div>
          <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold">Room Performance</h2>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm">Individual room metrics and rankings</p>
        </div>
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topPerformers.map((room, index) => (
            <div
              key={room.room_id}
              className={`rounded-xl border p-5 ${
                index === 0 ? 'border-amber-200 bg-amber-50/30' :
                index === 1 ? 'border-gray-300 bg-gray-50/30' :
                'border-orange-200 bg-orange-50/30'
              }`}
              style={index === 1 ? { backgroundColor: 'var(--bg-secondary)' } : undefined}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${
                  index === 0 ? 'bg-amber-100' :
                  index === 1 ? 'bg-gray-200' :
                  'bg-orange-100'
                }`}>
                  <Trophy size={18} className={
                    index === 0 ? 'text-amber-600' :
                    index === 1 ? 'text-gray-600' :
                    'text-orange-600'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ color: 'var(--text-primary)' }} className="text-sm font-semibold truncate">{room.room_name}</p>
                  <p style={{ color: 'var(--text-muted)' }} className="text-xs">#{index + 1} Top Earner</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p style={{ color: 'var(--text-muted)' }}>Revenue</p>
                  <p style={{ color: 'var(--text-primary)' }} className="font-bold">{formatCurrency(room.revenue, currency)}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)' }}>Occupancy</p>
                  <p style={{ color: 'var(--text-primary)' }} className="font-bold">{(room.occupancyRate || 0).toFixed(0)}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Room Table */}
      <Table>
        <Table.Header>
          <tr>
            <Table.HeaderCell>Room</Table.HeaderCell>
            <Table.HeaderCell align="right">
              <div className="flex items-center justify-end gap-1">
                <Eye size={14} />
                Views
              </div>
            </Table.HeaderCell>
            <Table.HeaderCell align="right">
              <div className="flex items-center justify-end gap-1">
                <Calendar size={14} />
                Bookings
              </div>
            </Table.HeaderCell>
            <Table.HeaderCell align="right">
              <div className="flex items-center justify-end gap-1">
                <DollarSign size={14} />
                Revenue
              </div>
            </Table.HeaderCell>
            <Table.HeaderCell align="right">Occupancy</Table.HeaderCell>
            <Table.HeaderCell align="right">
              <div className="flex items-center justify-end gap-1">
                <TrendingUp size={14} />
                Conversion
              </div>
            </Table.HeaderCell>
          </tr>
        </Table.Header>
        <Table.Body>
          {rooms.map((room, index) => (
            <Table.Row key={room.room_id}>
              <Table.Cell>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    index < 3 ? 'bg-accent-100 text-accent-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <span style={{ color: 'var(--text-primary)' }} className="font-medium">{room.room_name}</span>
                </div>
              </Table.Cell>
              <Table.Cell align="right">
                <span style={{ color: 'var(--text-primary)' }}>{(room.views || 0).toLocaleString()}</span>
              </Table.Cell>
              <Table.Cell align="right">
                <span style={{ color: 'var(--text-primary)' }}>{room.bookings}</span>
              </Table.Cell>
              <Table.Cell align="right">
                <span style={{ color: 'var(--text-primary)' }} className="font-medium">{formatCurrency(room.revenue, currency)}</span>
              </Table.Cell>
              <Table.Cell align="right">
                <div className="flex items-center justify-end gap-2">
                  <div style={{ backgroundColor: 'var(--bg-secondary)' }} className="w-16 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        (room.occupancyRate || 0) >= 70 ? 'bg-green-500' :
                        (room.occupancyRate || 0) >= 50 ? 'bg-blue-500' :
                        (room.occupancyRate || 0) >= 30 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(room.occupancyRate || 0, 100)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium ${
                    (room.occupancyRate || 0) >= 70 ? 'text-green-600' :
                    (room.occupancyRate || 0) >= 50 ? 'text-blue-600' :
                    (room.occupancyRate || 0) >= 30 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {(room.occupancyRate || 0).toFixed(0)}%
                  </span>
                </div>
              </Table.Cell>
              <Table.Cell align="right">
                <span className={`text-sm font-medium ${
                  (room.conversionRate || 0) >= 5 ? 'text-green-600' :
                  (room.conversionRate || 0) >= 2 ? 'text-blue-600' : ''
                }`} style={(room.conversionRate || 0) < 2 ? { color: 'var(--text-muted)' } : undefined}>
                  {(room.conversionRate || 0).toFixed(1)}%
                </span>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  )
}
