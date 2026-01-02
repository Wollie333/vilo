import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search,
  Send,
  User,
  Globe,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Inbox,
  Calendar,
  Phone,
  Mail,
  ExternalLink,
  Tag,
  MoreHorizontal,
  RefreshCw,
  Filter,
  Archive,
  Check,
  ShoppingCart,
  X,
  Plus
} from 'lucide-react'
import { supportApi, SupportTicket, TeamMember } from '../services/api'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import SystemMessageCard, { parseWebsiteInquiry, parseCouponClaim } from '../components/portal/SystemMessageCard'

// Parse coupon claim message to extract details
function parseCouponClaimDetails(message: string): {
  isCouponClaim: boolean
  couponCode?: string
  checkIn?: string
  checkOut?: string
  guestName?: string
  guestEmail?: string
  guestPhone?: string
} {
  const isCouponClaim = message.includes('Coupon Claim Request')
  if (!isCouponClaim) return { isCouponClaim: false }

  const codeMatch = message.match(/Code:\s*(\S+)/i)
  const checkInMatch = message.match(/Check-in:\s*(\d{4}-\d{2}-\d{2})/i)
  const checkOutMatch = message.match(/Check-out:\s*(\d{4}-\d{2}-\d{2})/i)
  const guestNameMatch = message.match(/Contact Information:[\s\S]*?Name:\s*(.+?)(?:\n|$)/i)
  const guestEmailMatch = message.match(/Email:\s*([\w.-]+@[\w.-]+\.\w+)/i)
  const guestPhoneMatch = message.match(/Phone:\s*(\+?[\d\s()-]+)/i)

  return {
    isCouponClaim: true,
    couponCode: codeMatch?.[1],
    checkIn: checkInMatch?.[1],
    checkOut: checkOutMatch?.[1],
    guestName: guestNameMatch?.[1]?.trim(),
    guestEmail: guestEmailMatch?.[1]?.trim(),
    guestPhone: guestPhoneMatch?.[1]?.trim()
  }
}

// WhatsApp-style message status checkmarks
type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read'

function MessageCheckmarks({ status, light = false }: { status: MessageStatus; light?: boolean }) {
  const baseColor = light ? 'text-white/70' : 'text-gray-400'
  const readColor = light ? 'text-blue-200' : 'text-blue-500'

  if (status === 'sending') {
    return (
      <span className={baseColor}>
        <Clock className="w-3.5 h-3.5" />
      </span>
    )
  }

  if (status === 'sent') {
    return (
      <span className={baseColor}>
        <Check className="w-3.5 h-3.5" />
      </span>
    )
  }

  if (status === 'delivered') {
    return (
      <span className={`${baseColor} flex -space-x-1.5`}>
        <Check className="w-3.5 h-3.5" />
        <Check className="w-3.5 h-3.5" />
      </span>
    )
  }

  // read
  return (
    <span className={`${readColor} flex -space-x-1.5`}>
      <Check className="w-3.5 h-3.5" />
      <Check className="w-3.5 h-3.5" />
    </span>
  )
}

// Status configuration
const statusConfig: Record<string, { label: string; bg: string; text: string; icon: typeof CheckCircle2 }> = {
  new: { label: 'New', bg: 'bg-blue-100', text: 'text-blue-700', icon: AlertCircle },
  open: { label: 'Open', bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  pending: { label: 'Pending', bg: 'bg-orange-100', text: 'text-orange-700', icon: Clock },
  resolved: { label: 'Resolved', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  closed: { label: 'Closed', bg: 'bg-gray-100', text: 'text-gray-600', icon: XCircle },
}

const sourceConfig: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  website: { label: 'Website', icon: Globe, color: 'bg-purple-100 text-purple-700' },
  portal: { label: 'Portal', icon: User, color: 'bg-teal-100 text-teal-700' }
}

// Utility to make links, phones, and emails clickable
function linkifyText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const combinedRegex = /(https?:\/\/[^\s]+)|([\w.-]+@[\w.-]+\.\w+)|(\+?[\d\s()-]{10,})/gi

  let lastIndex = 0
  let match

  while ((match = combinedRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const [fullMatch, url, email, phone] = match

    if (url) {
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-600 hover:text-accent-700 underline inline-flex items-center gap-1"
        >
          {url.length > 40 ? url.slice(0, 40) + '...' : url}
          <ExternalLink className="w-3 h-3" />
        </a>
      )
    } else if (email) {
      parts.push(
        <a
          key={match.index}
          href={`mailto:${email}`}
          className="text-accent-600 hover:text-accent-700 underline inline-flex items-center gap-1"
        >
          <Mail className="w-3 h-3" />
          {email}
        </a>
      )
    } else if (phone) {
      const cleanPhone = phone.replace(/[\s()-]/g, '')
      parts.push(
        <a
          key={match.index}
          href={`tel:${cleanPhone}`}
          className="text-accent-600 hover:text-accent-700 underline inline-flex items-center gap-1"
        >
          <Phone className="w-3 h-3" />
          {phone}
        </a>
      )
    }

    lastIndex = match.index + fullMatch.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

// Parse and format system messages (website inquiries, coupon claims)
function formatMessageContent(message: string, isAdmin: boolean = false): React.ReactNode {
  // Check for website inquiry
  const inquiryParsed = parseWebsiteInquiry(message)
  if (inquiryParsed.isInquiry && !isAdmin) {
    return (
      <SystemMessageCard
        type="website_inquiry"
        contact={inquiryParsed.contact}
        stay={inquiryParsed.stay}
        message={inquiryParsed.message}
      />
    )
  }

  // Check for coupon claim
  const couponParsed = parseCouponClaim(message)
  if (couponParsed.isCouponClaim && !isAdmin) {
    return (
      <SystemMessageCard
        type="coupon_claim"
        coupon={couponParsed.coupon}
        contact={couponParsed.contact}
        stay={couponParsed.stay}
        additionalNotes={couponParsed.additionalNotes}
      />
    )
  }

  // Regular message - linkify
  return (
    <div className="whitespace-pre-wrap">
      {linkifyText(message)}
    </div>
  )
}

export default function Support() {
  const { showSuccess, showError } = useNotification()
  const { tenant, tenantLoading } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()

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
  const [showFilters, setShowFilters] = useState(false)

  // Reply state
  const [replyContent, setReplyContent] = useState('')
  const [sending, setSending] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  // Action menu state
  const [showActionMenu, setShowActionMenu] = useState(false)

  // Compose new message modal state
  const [showComposeModal, setShowComposeModal] = useState(false)
  const [composeEmail, setComposeEmail] = useState('')
  const [composeName, setComposeName] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeMessage, setComposeMessage] = useState('')
  const [composeSending, setComposeSending] = useState(false)

  // Parse coupon claim details from selected ticket
  const couponClaimDetails = useMemo(() => {
    if (!selectedTicket?.message) return null
    const details = parseCouponClaimDetails(selectedTicket.message)
    return details.isCouponClaim ? details : null
  }, [selectedTicket?.message])

  // Handle booking for customer (opens checkout with prefilled details)
  const handleBookForCustomer = () => {
    if (!tenant?.slug || !couponClaimDetails) return

    const params = new URLSearchParams()
    if (couponClaimDetails.checkIn) params.set('checkIn', couponClaimDetails.checkIn)
    if (couponClaimDetails.checkOut) params.set('checkOut', couponClaimDetails.checkOut)
    if (couponClaimDetails.guestName) params.set('name', couponClaimDetails.guestName)
    if (couponClaimDetails.guestEmail) params.set('email', couponClaimDetails.guestEmail)
    if (couponClaimDetails.guestPhone) params.set('phone', couponClaimDetails.guestPhone)
    if (couponClaimDetails.couponCode) params.set('coupon', couponClaimDetails.couponCode)

    const bookingUrl = `/accommodation/${tenant.slug}/book?${params.toString()}`
    window.open(bookingUrl, '_blank')
  }

  useEffect(() => {
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

  // Handle query params for new message
  useEffect(() => {
    const newMessageEmail = searchParams.get('newMessage')
    const name = searchParams.get('name')
    if (newMessageEmail) {
      setComposeEmail(decodeURIComponent(newMessageEmail))
      setComposeName(name ? decodeURIComponent(name) : '')
      setShowComposeModal(true)
      // Clear the query params
      setSearchParams({})
    }
  }, [searchParams])

  const handleSendNewMessage = async () => {
    if (!composeEmail.trim() || !composeSubject.trim() || !composeMessage.trim()) {
      showError('Error', 'Please fill in all fields')
      return
    }

    try {
      setComposeSending(true)
      await supportApi.createTicket({
        sender_email: composeEmail,
        sender_name: composeName || undefined,
        subject: composeSubject,
        message: composeMessage,
        source: 'portal'
      })
      showSuccess('Message Sent', 'Your message has been sent to the customer')
      setShowComposeModal(false)
      setComposeEmail('')
      setComposeName('')
      setComposeSubject('')
      setComposeMessage('')
      loadTickets()
    } catch (error: any) {
      showError('Error', error.message || 'Failed to send message')
    } finally {
      setComposeSending(false)
    }
  }

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

    const messageContent = replyContent.trim()
    const tempId = `temp-${Date.now()}`

    // Optimistically add the message to the UI immediately
    const optimisticReply = {
      id: tempId,
      content: messageContent,
      sender_type: 'admin' as const,
      sender_name: tenant?.business_name || 'You',
      created_at: new Date().toISOString(),
      status: 'sending' as MessageStatus
    }

    setSelectedTicket(prev => prev ? {
      ...prev,
      support_replies: [...(prev.support_replies || []), optimisticReply]
    } : prev)

    setReplyContent('')
    setSending(true)
    setReplyError(null)

    try {
      const response = await supportApi.replyToTicket(selectedTicket.id, { content: messageContent })

      // Update the optimistic message with the real data
      setSelectedTicket(prev => {
        if (!prev) return prev
        const replies = prev.support_replies || []
        return {
          ...prev,
          support_replies: replies.map(reply =>
            reply.id === tempId
              ? { ...response.reply, status: 'delivered' as MessageStatus }
              : reply
          )
        }
      })

      // Update ticket list in background (don't await)
      loadTickets()
    } catch (error: any) {
      // Remove the optimistic message on error
      setSelectedTicket(prev => {
        if (!prev) return prev
        return {
          ...prev,
          support_replies: (prev.support_replies || []).filter(reply => reply.id !== tempId)
        }
      })
      setReplyError(error.message || 'Failed to send reply')
      setReplyContent(messageContent) // Restore the message so user can retry
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
      setShowActionMenu(false)
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
      showSuccess('Updated', assignedTo ? 'Ticket assigned successfully' : 'Ticket unassigned')
    } catch (error: any) {
      showError('Error', error.message || 'Failed to update assignment')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
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

    if (diffMins < 1) return 'Just now'
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
    return ticket.sender_name || ticket.customers?.name || ticket.sender_email.split('@')[0]
  }

  const getSenderInitials = (ticket: SupportTicket) => {
    const name = getSenderName(ticket)
    return name.slice(0, 2).toUpperCase()
  }

  // Stats
  const stats = {
    total: tickets.length,
    new: tickets.filter(t => t.status === 'new').length,
    open: tickets.filter(t => t.status === 'open' || t.status === 'pending').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Center</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage customer inquiries and messages
            </p>
          </div>

          {/* Search + Stats Bar - next to refresh */}
          <div className="flex items-center gap-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent focus:bg-white transition-colors"
              />
            </div>

            <div className="h-4 w-px bg-gray-200" />

            <button
              onClick={() => setStatusFilter(statusFilter === 'new' ? 'all' : 'new')}
              className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${
                statusFilter === 'new' ? 'bg-blue-100 ring-2 ring-blue-300' : 'hover:bg-gray-100'
              }`}
              title="Filter by New"
            >
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{stats.new}</span> New
              </span>
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'open' ? 'all' : 'open')}
              className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${
                statusFilter === 'open' ? 'bg-amber-100 ring-2 ring-amber-300' : 'hover:bg-gray-100'
              }`}
              title="Filter by Open"
            >
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{stats.open}</span> Open
              </span>
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'resolved' ? 'all' : 'resolved')}
              className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${
                statusFilter === 'resolved' ? 'bg-green-100 ring-2 ring-green-300' : 'hover:bg-gray-100'
              }`}
              title="Filter by Resolved"
            >
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{stats.resolved}</span> Resolved
              </span>
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <button
              onClick={() => setStatusFilter('all')}
              className={`text-sm transition-colors ${
                statusFilter === 'all' ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Show all tickets"
            >
              {stats.total} total
            </button>

            <button
              onClick={() => setShowComposeModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">New Message</span>
            </button>

            <button
              onClick={() => loadTickets()}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Compose New Message Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowComposeModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">New Message</h2>
              <button
                onClick={() => setShowComposeModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={composeEmail}
                    onChange={(e) => setComposeEmail(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="customer@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
                  <input
                    type="text"
                    value={composeName}
                    onChange={(e) => setComposeName(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="Customer name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  placeholder="Message subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none"
                  placeholder="Write your message..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowComposeModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNewMessage}
                disabled={composeSending || !composeEmail.trim() || !composeSubject.trim() || !composeMessage.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent-600 hover:bg-accent-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                {composeSending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Ticket List */}
        <div className="w-[400px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
          {/* Filters */}
          <div className="p-4 border-b border-gray-100">
            {/* Filter Toggles */}
            <div className="flex items-center gap-2">
              <div className="flex-1 flex gap-1 p-1 bg-gray-100 rounded-lg">
                {['all', 'website', 'portal'].map(source => (
                  <button
                    key={source}
                    onClick={() => setSourceFilter(source)}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      sourceFilter === source
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {source === 'all' ? 'All' : source === 'website' ? 'Website' : 'Portal'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${
                  showFilters ? 'bg-accent-100 text-accent-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="flex gap-2 pt-1">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
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
                  className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  <option value="all">All Assignees</option>
                  <option value="unassigned">Unassigned</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name || member.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Ticket List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-accent-600 rounded-full animate-spin" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 px-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Inbox className="w-8 h-8 text-gray-400" />
                </div>
                <p className="font-medium text-gray-900">No tickets found</p>
                <p className="text-sm text-gray-500 mt-1 text-center">
                  {searchQuery ? 'Try adjusting your search' : 'New support requests will appear here'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredTickets.map(ticket => {
                  const isSelected = selectedTicket?.id === ticket.id
                  const StatusIcon = statusConfig[ticket.status]?.icon || AlertCircle
                  const isCouponClaim = ticket.message?.includes('Coupon Claim Request')

                  return (
                    <button
                      key={ticket.id}
                      onClick={() => loadTicketDetails(ticket.id)}
                      className={`w-full text-left p-4 transition-all hover:bg-gray-50 ${
                        isSelected ? 'bg-accent-50 border-l-2 border-l-accent-500' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-medium text-sm ${
                          ticket.source === 'website'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-teal-100 text-teal-700'
                        }`}>
                          {getSenderInitials(ticket)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="font-medium text-gray-900 truncate">
                              {getSenderName(ticket)}
                            </span>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {formatRelativeTime(ticket.created_at)}
                            </span>
                          </div>

                          <p className="text-sm text-gray-900 font-medium truncate mb-1">
                            {ticket.subject}
                          </p>

                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded ${statusConfig[ticket.status]?.bg} ${statusConfig[ticket.status]?.text}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig[ticket.status]?.label}
                            </span>
                            {isCouponClaim && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded bg-emerald-100 text-emerald-700">
                                <Tag className="w-3 h-3" />
                                Coupon
                              </span>
                            )}
                            {ticket.replyCount && ticket.replyCount > 0 && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {ticket.replyCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Conversation */}
        <div className="flex-1 flex flex-col bg-white">
          {loadingTicket ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-10 h-10 border-2 border-gray-200 border-t-accent-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading conversation...</p>
              </div>
            </div>
          ) : !selectedTicket ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-sm">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500">
                  Choose a ticket from the list to view the conversation and respond
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Conversation Header */}
              <div className="flex-shrink-0 border-b border-gray-200 bg-white">
                <div className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-lg font-semibold text-gray-900 truncate">
                          {selectedTicket.subject}
                        </h2>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig[selectedTicket.status]?.bg} ${statusConfig[selectedTicket.status]?.text}`}>
                          {React.createElement(statusConfig[selectedTicket.status]?.icon || AlertCircle, { className: 'w-3 h-3' })}
                          {statusConfig[selectedTicket.status]?.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {getSenderName(selectedTicket)}
                        </span>
                        <a
                          href={`mailto:${selectedTicket.sender_email}`}
                          className="flex items-center gap-1 hover:text-accent-600"
                        >
                          <Mail className="w-4 h-4" />
                          {selectedTicket.sender_email}
                        </a>
                        {selectedTicket.sender_phone && (
                          <a
                            href={`tel:${selectedTicket.sender_phone}`}
                            className="flex items-center gap-1 hover:text-accent-600"
                          >
                            <Phone className="w-4 h-4" />
                            {selectedTicket.sender_phone}
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Book for Customer button (only for coupon claims) */}
                      {couponClaimDetails && (
                        <button
                          onClick={handleBookForCustomer}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Book for Customer
                        </button>
                      )}

                      {/* Assignment */}
                      <select
                        value={selectedTicket.assigned_to || ''}
                        onChange={(e) => handleAssignmentChange(e.target.value || null)}
                        className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map(member => (
                          <option key={member.id} value={member.id}>
                            {member.name || member.email}
                          </option>
                        ))}
                      </select>

                      {/* Quick Actions */}
                      <div className="relative">
                        <button
                          onClick={() => setShowActionMenu(!showActionMenu)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>

                        {showActionMenu && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowActionMenu(false)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                              {selectedTicket.status !== 'resolved' && (
                                <button
                                  onClick={() => handleStatusChange('resolved')}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  Mark as Resolved
                                </button>
                              )}
                              {selectedTicket.status !== 'pending' && (
                                <button
                                  onClick={() => handleStatusChange('pending')}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Clock className="w-4 h-4 text-orange-600" />
                                  Mark as Pending
                                </button>
                              )}
                              {selectedTicket.status === 'new' && (
                                <button
                                  onClick={() => handleStatusChange('open')}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <MessageCircle className="w-4 h-4 text-amber-600" />
                                  Mark as Open
                                </button>
                              )}
                              <div className="border-t border-gray-100 my-1" />
                              {selectedTicket.status !== 'closed' ? (
                                <button
                                  onClick={() => handleStatusChange('closed')}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Archive className="w-4 h-4 text-gray-600" />
                                  Close Ticket
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange('open')}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <RefreshCw className="w-4 h-4 text-accent-600" />
                                  Reopen Ticket
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Related Booking */}
                {selectedTicket.bookings && (
                  <div className="px-6 pb-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Calendar className="w-4 h-4 text-accent-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Related Booking</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedTicket.bookings.room_name} • {formatDate(selectedTicket.bookings.check_in)} - {formatDate(selectedTicket.bookings.check_out)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
                  {/* Original Message */}
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-medium text-sm ${
                      selectedTicket.source === 'website'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-teal-100 text-teal-700'
                    }`}>
                      {getSenderInitials(selectedTicket)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="font-semibold text-gray-900">{getSenderName(selectedTicket)}</span>
                        <span className="text-xs text-gray-400">
                          {formatTime(selectedTicket.created_at)} • {formatDate(selectedTicket.created_at)}
                        </span>
                        <span className={`px-1.5 py-0.5 text-xs rounded ${sourceConfig[selectedTicket.source]?.color}`}>
                          {sourceConfig[selectedTicket.source]?.label}
                        </span>
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-md p-4 shadow-sm border border-gray-100">
                        {formatMessageContent(selectedTicket.message)}
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {selectedTicket.support_replies?.map((reply, index) => {
                    const isAdmin = reply.sender_type === 'admin'
                    const prevReply = selectedTicket.support_replies?.[index - 1]
                    const showDateDivider = !prevReply ||
                      new Date(reply.created_at).toDateString() !== new Date(prevReply.created_at).toDateString()

                    return (
                      <div key={reply.id}>
                        {showDateDivider && (
                          <div className="flex items-center gap-4 my-6">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-xs text-gray-400 font-medium px-2">
                              {formatDate(reply.created_at)}
                            </span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>
                        )}

                        <div className={`flex gap-4 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-medium text-sm ${
                            isAdmin
                              ? 'bg-accent-100 text-accent-700'
                              : selectedTicket.source === 'website'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-teal-100 text-teal-700'
                          }`}>
                            {isAdmin ? (reply.sender_name?.slice(0, 2).toUpperCase() || 'ME') : getSenderInitials(selectedTicket)}
                          </div>
                          <div className={`flex-1 min-w-0 max-w-[80%] ${isAdmin ? 'flex flex-col items-end' : ''}`}>
                            <div className={`flex items-baseline gap-2 mb-2 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                              <span className="font-semibold text-gray-900">
                                {isAdmin ? (reply.sender_name || 'You') : getSenderName(selectedTicket)}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatTime(reply.created_at)}
                              </span>
                            </div>
                            <div className={`rounded-2xl p-4 shadow-sm ${
                              isAdmin
                                ? 'bg-gradient-to-br from-accent-500 to-accent-600 text-white rounded-tr-md'
                                : 'bg-white rounded-tl-md border border-gray-100'
                            }`}>
                              <div className="whitespace-pre-wrap">
                                {isAdmin ? reply.content : formatMessageContent(reply.content)}
                              </div>
                              {/* WhatsApp-style checkmarks for admin messages */}
                              {isAdmin && (
                                <div className="flex justify-end mt-1 -mb-1">
                                  <MessageCheckmarks status={reply.status || 'delivered'} light />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Reply Input */}
              <div className="flex-shrink-0 border-t border-emerald-600 bg-emerald-500 p-4">
                {selectedTicket.status !== 'closed' ? (
                  <div className="max-w-3xl mx-auto">
                    <div className="flex gap-3 items-center">
                      <div className="flex-1">
                        <textarea
                          value={replyContent}
                          onChange={(e) => {
                            setReplyContent(e.target.value)
                            if (replyError) setReplyError(null)
                          }}
                          placeholder="Type your reply..."
                          rows={1}
                          className="w-full px-4 py-3 bg-white border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/30 resize-none transition-colors shadow-lg"
                          style={{ minHeight: '48px', maxHeight: '150px' }}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement
                            target.style.height = 'auto'
                            target.style.height = Math.min(target.scrollHeight, 150) + 'px'
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleSendReply()
                            }
                          }}
                        />
                      </div>
                      <button
                        onClick={handleSendReply}
                        disabled={!replyContent.trim() || sending}
                        className="p-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
                      >
                        <Send className={`w-5 h-5 ${sending ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                    {replyError ? (
                      <p className="text-xs text-red-500 mt-2 text-center">
                        {replyError} — tap send to retry
                      </p>
                    ) : (
                      <p className="text-xs text-white/80 mt-2 text-center">
                        Press Enter to send • Shift+Enter for new line
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto text-center">
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600">
                      <Archive className="w-4 h-4" />
                      <span>This ticket is closed</span>
                      <button
                        onClick={() => handleStatusChange('open')}
                        className="font-medium text-accent-600 hover:text-accent-700"
                      >
                        Reopen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
