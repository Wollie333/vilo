import { useState, useEffect, useRef } from 'react'
import {
  Search,
  Send,
  User,
  Globe,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Inbox,
  Calendar
} from 'lucide-react'
import Button from '../components/Button'
import { supportApi, SupportTicket, TeamMember } from '../services/api'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  open: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-orange-100 text-orange-700',
  resolved: 'bg-accent-100 text-accent-700',
  closed: 'bg-gray-100 text-gray-700',
}

const statusIcons: Record<string, React.ReactNode> = {
  new: <AlertCircle size={14} />,
  open: <Clock size={14} />,
  pending: <Clock size={14} />,
  resolved: <CheckCircle size={14} />,
  closed: <XCircle size={14} />,
}

const sourceConfig = {
  website: { label: 'Website', icon: Globe, color: 'bg-purple-100 text-purple-700' },
  portal: { label: 'Portal', icon: User, color: 'bg-teal-100 text-teal-700' }
}

export default function Support() {
  const { showSuccess, showError } = useNotification()
  const { tenant, tenantLoading } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Ticket list state
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [loadingTicket, setLoadingTicket] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  // Filter state
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [assignedFilter, setAssignedFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Reply state
  const [replyContent, setReplyContent] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    // Wait for tenant to be loaded before fetching tickets
    if (!tenantLoading && tenant) {
      loadTickets()
      loadTeamMembers()
    } else if (!tenantLoading && !tenant) {
      setLoading(false)
    }
  }, [tenantLoading, tenant, sourceFilter, statusFilter, assignedFilter])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedTicket?.support_replies])

  const loadTickets = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (sourceFilter !== 'all') params.source = sourceFilter
      if (statusFilter !== 'all') params.status = statusFilter
      if (assignedFilter !== 'all') params.assigned_to = assignedFilter

      const response = await supportApi.getTickets(params)
      setTickets(response.tickets)
    } catch (error) {
      console.error('Failed to load tickets:', error)
      showError('Error', 'Failed to load support tickets')
    } finally {
      setLoading(false)
    }
  }

  const loadTeamMembers = async () => {
    try {
      const members = await supportApi.getTeamMembers()
      setTeamMembers(members)
    } catch (error) {
      console.error('Failed to load team members:', error)
    }
  }

  const loadTicketDetails = async (ticketId: string) => {
    try {
      setLoadingTicket(true)
      const ticket = await supportApi.getTicket(ticketId)
      setSelectedTicket(ticket)
    } catch (error) {
      console.error('Failed to load ticket:', error)
      showError('Error', 'Failed to load ticket details')
    } finally {
      setLoadingTicket(false)
    }
  }

  const handleSendReply = async () => {
    if (!selectedTicket || !replyContent.trim()) return

    try {
      setSending(true)
      await supportApi.replyToTicket(selectedTicket.id, { content: replyContent.trim() })
      setReplyContent('')
      await loadTicketDetails(selectedTicket.id)
      await loadTickets()
      showSuccess('Reply Sent', 'Your message has been sent')
    } catch (error: any) {
      showError('Error', error.message || 'Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (status: string) => {
    if (!selectedTicket) return

    try {
      await supportApi.updateTicket(selectedTicket.id, { status })
      await loadTicketDetails(selectedTicket.id)
      await loadTickets()
      showSuccess('Status Updated', `Ticket marked as ${status}`)
    } catch (error: any) {
      showError('Error', error.message || 'Failed to update status')
    }
  }

  const handleAssignmentChange = async (assignedTo: string | null) => {
    if (!selectedTicket) return

    try {
      await supportApi.updateTicket(selectedTicket.id, { assigned_to: assignedTo })
      await loadTicketDetails(selectedTicket.id)
      await loadTickets()
      showSuccess('Assignment Updated', assignedTo ? 'Ticket assigned' : 'Ticket unassigned')
    } catch (error: any) {
      showError('Error', error.message || 'Failed to update assignment')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateString)
  }

  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      ticket.subject.toLowerCase().includes(query) ||
      ticket.sender_email.toLowerCase().includes(query) ||
      (ticket.sender_name?.toLowerCase() || '').includes(query)
    )
  })

  const getSenderName = (ticket: SupportTicket) => {
    return ticket.sender_name || ticket.customers?.name || ticket.sender_email
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-secondary)' }} className="p-6 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 style={{ color: 'var(--text-primary)' }} className="text-2xl font-semibold">Support Center</h1>
        <p style={{ color: 'var(--text-secondary)' }} className="text-sm mt-1">
          Manage customer inquiries and website messages
        </p>
      </div>

      {/* Main Content - Email Client Layout */}
      <div
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        className="border rounded-lg overflow-hidden flex"
        // Full height minus header and padding
      >
        {/* Left Panel - Ticket List */}
        <div
          style={{ borderColor: 'var(--border-color)' }}
          className="w-96 border-r flex flex-col"
        >
          {/* Filters */}
          <div style={{ borderColor: 'var(--border-color)' }} className="p-4 border-b space-y-3">
            {/* Source Tabs */}
            <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              {[
                { value: 'all', label: 'All' },
                { value: 'website', label: 'Website' },
                { value: 'portal', label: 'Portal' }
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setSourceFilter(tab.value)}
                  className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    sourceFilter === tab.value
                      ? 'bg-white shadow-sm'
                      : 'hover:bg-white/50'
                  }`}
                  style={{ color: 'var(--text-primary)' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-md border focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Status & Assignment Filters */}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm rounded-md border focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={assignedFilter}
                onChange={(e) => setAssignedFilter(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm rounded-md border focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="all">All Assigned</option>
                <option value="unassigned">Unassigned</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name || member.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ticket List */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <Inbox size={48} style={{ color: 'var(--text-muted)' }} className="mb-3" />
                <p style={{ color: 'var(--text-secondary)' }} className="font-medium">No tickets found</p>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm mt-1">
                  {searchQuery ? 'Try a different search' : 'Support tickets will appear here'}
                </p>
              </div>
            ) : (
              <div>
                {filteredTickets.map(ticket => {
                  const SourceIcon = sourceConfig[ticket.source]?.icon || MessageCircle
                  const isSelected = selectedTicket?.id === ticket.id

                  return (
                    <button
                      key={ticket.id}
                      onClick={() => loadTicketDetails(ticket.id)}
                      className={`w-full text-left p-4 border-b transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`flex-shrink-0 px-1.5 py-0.5 text-xs font-medium rounded ${sourceConfig[ticket.source]?.color || 'bg-gray-100'}`}>
                            <SourceIcon size={12} className="inline mr-1" />
                            {ticket.source === 'website' ? 'Web' : 'Portal'}
                          </span>
                          <span className={`flex-shrink-0 px-1.5 py-0.5 text-xs font-medium rounded flex items-center gap-1 ${statusColors[ticket.status]}`}>
                            {statusIcons[ticket.status]}
                            {ticket.status}
                          </span>
                        </div>
                        <span style={{ color: 'var(--text-muted)' }} className="text-xs flex-shrink-0">
                          {formatRelativeTime(ticket.created_at)}
                        </span>
                      </div>

                      <p style={{ color: 'var(--text-primary)' }} className="font-medium text-sm truncate mb-1">
                        {ticket.subject}
                      </p>

                      <div className="flex items-center justify-between">
                        <p style={{ color: 'var(--text-secondary)' }} className="text-sm truncate">
                          {getSenderName(ticket)}
                        </p>
                        {ticket.replyCount && ticket.replyCount > 0 && (
                          <span style={{ color: 'var(--text-muted)' }} className="text-xs flex items-center gap-1">
                            <MessageCircle size={12} />
                            {ticket.replyCount}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Thread View */}
        <div className="flex-1 flex flex-col" style={{ minHeight: 'calc(100vh - 180px)' }}>
          {loadingTicket ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
                <p style={{ color: 'var(--text-muted)' }}>Loading ticket...</p>
              </div>
            </div>
          ) : !selectedTicket ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle size={64} style={{ color: 'var(--text-muted)' }} className="mb-4" />
              <p style={{ color: 'var(--text-secondary)' }} className="font-medium text-lg">Select a ticket</p>
              <p style={{ color: 'var(--text-muted)' }} className="text-sm mt-1">
                Choose a ticket from the list to view the conversation
              </p>
            </div>
          ) : (
            <>
              {/* Ticket Header */}
              <div style={{ borderColor: 'var(--border-color)' }} className="p-4 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-2">
                      {selectedTicket.subject}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sourceConfig[selectedTicket.source]?.color}`}>
                        {selectedTicket.source === 'website' ? 'Website Inquiry' : 'Portal Ticket'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedTicket.status]}`}>
                        {selectedTicket.status}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Created {formatDate(selectedTicket.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Status Actions */}
                  <div className="flex items-center gap-2">
                    {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                      <Button
                        variant="outline"
                        onClick={() => handleStatusChange('resolved')}
                        className="text-sm px-3 py-1.5"
                      >
                        <CheckCircle size={14} className="mr-1" />
                        Resolve
                      </Button>
                    )}
                    {selectedTicket.status !== 'closed' && (
                      <Button
                        variant="outline"
                        onClick={() => handleStatusChange('closed')}
                        className="text-sm px-3 py-1.5"
                      >
                        <XCircle size={14} className="mr-1" />
                        Close
                      </Button>
                    )}
                  </div>
                </div>

                {/* Sender Info & Assignment */}
                <div className="mt-4 flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-4">
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>From: </span>
                      <span style={{ color: 'var(--text-primary)' }} className="font-medium">
                        {getSenderName(selectedTicket)}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}> ({selectedTicket.sender_email})</span>
                    </div>
                    {selectedTicket.sender_phone && (
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Phone: </span>
                        <span style={{ color: 'var(--text-primary)' }}>{selectedTicket.sender_phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Assignment Dropdown */}
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--text-muted)' }}>Assigned to:</span>
                    <select
                      value={selectedTicket.assigned_to || ''}
                      onChange={(e) => handleAssignmentChange(e.target.value || null)}
                      className="px-2 py-1 text-sm rounded border focus:outline-none focus:ring-1"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name || member.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Related Booking */}
                {selectedTicket.bookings && (
                  <div className="mt-3 p-2 rounded-md flex items-center gap-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ color: 'var(--text-muted)' }} className="text-sm">Related Booking:</span>
                    <span style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
                      {selectedTicket.bookings.room_name} ({formatDate(selectedTicket.bookings.check_in)} - {formatDate(selectedTicket.bookings.check_out)})
                    </span>
                  </div>
                )}
              </div>

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                {/* Original Message */}
                <div className="flex gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    {selectedTicket.source === 'website' ? (
                      <Globe size={16} style={{ color: 'var(--text-muted)' }} />
                    ) : (
                      <User size={16} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ color: 'var(--text-primary)' }} className="font-medium">
                        {getSenderName(selectedTicket)}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }} className="text-xs">
                        {formatDate(selectedTicket.created_at)} at {formatTime(selectedTicket.created_at)}
                      </span>
                    </div>
                    <div
                      className="rounded-lg p-3 border"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                    >
                      <p style={{ color: 'var(--text-primary)' }} className="whitespace-pre-wrap">
                        {selectedTicket.message}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {selectedTicket.support_replies?.map((reply) => (
                  <div
                    key={reply.id}
                    className={`flex gap-3 ${reply.sender_type === 'admin' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        reply.sender_type === 'admin' ? 'bg-blue-100' : ''
                      }`}
                      style={reply.sender_type !== 'admin' ? { backgroundColor: 'var(--bg-secondary)' } : {}}
                    >
                      <User size={16} className={reply.sender_type === 'admin' ? 'text-blue-600' : ''}
                        style={reply.sender_type !== 'admin' ? { color: 'var(--text-muted)' } : {}}
                      />
                    </div>
                    <div className="flex-1 max-w-[80%]">
                      <div className={`flex items-center gap-2 mb-1 ${reply.sender_type === 'admin' ? 'justify-end' : ''}`}>
                        <span style={{ color: 'var(--text-primary)' }} className="font-medium">
                          {reply.sender_type === 'admin' ? reply.sender_name || 'You' : getSenderName(selectedTicket)}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }} className="text-xs">
                          {formatDate(reply.created_at)} at {formatTime(reply.created_at)}
                        </span>
                      </div>
                      <div
                        className={`rounded-lg p-3 ${reply.sender_type === 'admin' ? 'bg-blue-50 border-blue-200' : ''}`}
                        style={reply.sender_type !== 'admin' ? {
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border-color)',
                          border: '1px solid var(--border-color)'
                        } : { border: '1px solid' }}
                      >
                        <p style={{ color: 'var(--text-primary)' }} className="whitespace-pre-wrap">
                          {reply.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input */}
              {selectedTicket.status !== 'closed' ? (
                <div style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }} className="p-4 border-t">
                  <div className="flex gap-3">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Type your reply..."
                      rows={3}
                      className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-1 resize-none"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendReply()
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={!replyContent.trim() || sending}
                      className="self-end"
                    >
                      {sending ? '...' : <Send size={18} />}
                    </Button>
                  </div>
                  <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-2">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              ) : (
                <div
                  style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}
                  className="p-4 border-t text-center"
                >
                  <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                    This ticket is closed. Reopen it to send more messages.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2 text-sm px-3 py-1.5"
                    onClick={() => handleStatusChange('open')}
                  >
                    Reopen Ticket
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
