import { useState } from 'react'
import { MessageSquare, ExternalLink, Filter, ChevronDown, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface SupportTicket {
  id: string
  subject: string
  message: string
  status: string
  created_at: string
}

interface SupportSectionProps {
  tickets: SupportTicket[]
}

const ticketStatusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  open: 'bg-amber-100 text-amber-700',
  pending: 'bg-orange-100 text-orange-700',
  resolved: 'bg-accent-100 text-accent-700',
  closed: 'bg-gray-100 text-gray-700',
}

const ticketStatusLabels: Record<string, string> = {
  new: 'New',
  open: 'Open',
  pending: 'Pending',
  resolved: 'Resolved',
  closed: 'Closed',
}

const ticketStatusIcons: Record<string, typeof AlertCircle> = {
  new: AlertCircle,
  open: MessageSquare,
  pending: Clock,
  resolved: CheckCircle2,
  closed: CheckCircle2,
}

export default function SupportSection({ tickets }: SupportSectionProps) {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Get unique statuses for filter
  const availableStatuses = Array.from(new Set(tickets.map(t => t.status)))

  // Filter and sort tickets
  const filteredTickets = tickets
    .filter(ticket => statusFilter === 'all' || ticket.status === statusFilter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Summary counts
  const openCount = tickets.filter(t => ['new', 'open', 'pending'].includes(t.status)).length
  const resolvedCount = tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      {tickets.length > 0 && (
        <div className="flex gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${openCount > 0 ? 'bg-amber-500' : 'bg-gray-300'}`} />
            <span className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{openCount}</span> Open
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-500" />
            <span className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{resolvedCount}</span> Resolved
            </span>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex justify-end">
        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
              statusFilter !== 'all'
                ? 'bg-accent-50 border-accent-200 text-accent-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} />
            {statusFilter !== 'all' ? ticketStatusLabels[statusFilter] : 'All Status'}
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {showFilters && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <button
                onClick={() => { setStatusFilter('all'); setShowFilters(false) }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg ${statusFilter === 'all' ? 'text-accent-600 font-medium' : 'text-gray-700'}`}
              >
                All Status
              </button>
              {availableStatuses.map(status => (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(status); setShowFilters(false) }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 last:rounded-b-lg ${statusFilter === status ? 'text-accent-600 font-medium' : 'text-gray-700'}`}
                >
                  {ticketStatusLabels[status] || status}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''} found
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="py-16 text-center">
          <MessageSquare size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            {tickets.length === 0 ? 'No support tickets' : 'No tickets match your filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => {
            const StatusIcon = ticketStatusIcons[ticket.status] || MessageSquare

            return (
              <div
                key={ticket.id}
                onClick={() => navigate(`/dashboard/support/${ticket.id}`)}
                className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <StatusIcon size={16} className="text-gray-400 shrink-0" />
                      <h3 className="font-semibold text-gray-900 truncate">{ticket.subject}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${ticketStatusColors[ticket.status]}`}>
                        {ticketStatusLabels[ticket.status] || ticket.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2 pl-7">{ticket.message}</p>
                    <p className="text-xs text-gray-400 pl-7">{formatDate(ticket.created_at)}</p>
                  </div>
                  <ExternalLink size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0 ml-4" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
