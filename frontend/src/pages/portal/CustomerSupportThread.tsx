import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Calendar,
  Send,
  User,
  Sparkles,
  Tag,
  Phone,
  Mail,
  ExternalLink,
  Clock,
  CheckCircle2,
  MessageCircle,
  Check
} from 'lucide-react'
import { portalApi, SupportTicket } from '../../services/portalApi'
import { useCustomerAuth } from '../../contexts/CustomerAuthContext'
import SystemMessageCard, { parseWebsiteInquiry, parseCouponClaim } from '../../components/portal/SystemMessageCard'

// WhatsApp-style message status checkmarks
type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read'

function MessageCheckmarks({ status }: { status: MessageStatus }) {
  if (status === 'sending') {
    return (
      <span className="text-gray-400">
        <Clock className="w-3.5 h-3.5" />
      </span>
    )
  }

  if (status === 'sent') {
    return (
      <span className="text-gray-400">
        <Check className="w-3.5 h-3.5" />
      </span>
    )
  }

  if (status === 'delivered') {
    return (
      <span className="text-gray-400 flex -space-x-1.5">
        <Check className="w-3.5 h-3.5" />
        <Check className="w-3.5 h-3.5" />
      </span>
    )
  }

  // read
  return (
    <span className="text-blue-500 flex -space-x-1.5">
      <Check className="w-3.5 h-3.5" />
      <Check className="w-3.5 h-3.5" />
    </span>
  )
}

const statusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  new: { bg: 'bg-blue-50', text: 'text-blue-700', icon: MessageCircle },
  open: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
  pending: { bg: 'bg-orange-50', text: 'text-orange-700', icon: Clock },
  resolved: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle2 },
  closed: { bg: 'bg-gray-100', text: 'text-gray-600', icon: CheckCircle2 },
}

// Utility to make links, phones, and emails clickable
function linkifyText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []

  // Combined regex for URLs, emails, and phone numbers
  const combinedRegex = /(https?:\/\/[^\s]+)|([\w.-]+@[\w.-]+\.\w+)|(\+?[\d\s()-]{10,})/gi

  let lastIndex = 0
  let match

  while ((match = combinedRegex.exec(text)) !== null) {
    // Add text before the match
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

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

// Parse coupon claim message to extract details
function parseCouponClaimMessage(message: string): {
  isCouponClaim: boolean
  couponCode?: string
  couponName?: string
  discount?: string
  checkIn?: string
  checkOut?: string
  guestName?: string
  guestEmail?: string
  guestPhone?: string
} {
  const isCouponClaim = message.includes('Coupon Claim Request')

  if (!isCouponClaim) return { isCouponClaim: false }

  const codeMatch = message.match(/Code:\s*(\S+)/i)
  const nameMatch = message.match(/Name:\s*(.+?)(?:\n|$)/i)
  const discountMatch = message.match(/Discount:\s*(.+?)(?:\n|$)/i)
  const checkInMatch = message.match(/Check-in:\s*(\d{4}-\d{2}-\d{2})/i)
  const checkOutMatch = message.match(/Check-out:\s*(\d{4}-\d{2}-\d{2})/i)
  const guestNameMatch = message.match(/Contact Information:[\s\S]*?Name:\s*(.+?)(?:\n|$)/i)
  const guestEmailMatch = message.match(/Email:\s*([\w.-]+@[\w.-]+\.\w+)/i)
  const guestPhoneMatch = message.match(/Phone:\s*(\+?[\d\s()-]+)/i)

  return {
    isCouponClaim: true,
    couponCode: codeMatch?.[1],
    couponName: nameMatch?.[1]?.trim(),
    discount: discountMatch?.[1]?.trim(),
    checkIn: checkInMatch?.[1],
    checkOut: checkOutMatch?.[1],
    guestName: guestNameMatch?.[1]?.trim(),
    guestEmail: guestEmailMatch?.[1]?.trim(),
    guestPhone: guestPhoneMatch?.[1]?.trim()
  }
}

// Format message with proper sections for system messages (coupon claims, website inquiries)
function formatMessage(message: string, isOriginal: boolean = false): React.ReactNode {
  // Check for website inquiry
  const inquiryParsed = parseWebsiteInquiry(message)
  if (inquiryParsed.isInquiry && isOriginal) {
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
  if (couponParsed.isCouponClaim && isOriginal) {
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

  // Regular message - linkify and preserve whitespace
  return (
    <div className="whitespace-pre-wrap">
      {linkifyText(message)}
    </div>
  )
}

export default function CustomerSupportThread() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { customer } = useCustomerAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Welcome banner state
  const [showWelcome, setShowWelcome] = useState(false)
  const [welcomeBusinessName, setWelcomeBusinessName] = useState('')
  const welcomeShownRef = useRef(false)

  // Parse coupon details from message
  const couponDetails = useMemo(() => {
    if (!ticket?.message) return null
    return parseCouponClaimMessage(ticket.message)
  }, [ticket?.message])

  useEffect(() => {
    if (id) {
      loadTicket()
    }
  }, [id])

  // Show welcome notification for new users from coupon claim
  useEffect(() => {
    if (searchParams.get('welcome') === 'true' && !welcomeShownRef.current) {
      welcomeShownRef.current = true
      const businessName = searchParams.get('business') || 'the property'
      setWelcomeBusinessName(decodeURIComponent(businessName))
      setShowWelcome(true)

      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        setShowWelcome(false)
      }, 8000)

      return () => clearTimeout(timer)
    }
  }, [searchParams])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.support_replies])

  const loadTicket = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const data = await portalApi.getTicket(id)
      setTicket(data)
    } catch (err) {
      console.error('Failed to load ticket:', err)
      setError('Failed to load support ticket')
    } finally {
      setLoading(false)
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

  const handleSendReply = async () => {
    if (!id || !replyContent.trim() || !ticket) return

    const messageContent = replyContent.trim()
    const tempId = `temp-${Date.now()}`

    // Optimistically add the message to the UI immediately
    const optimisticReply = {
      id: tempId,
      content: messageContent,
      sender_type: 'customer' as const,
      sender_name: customer?.name || 'You',
      created_at: new Date().toISOString(),
      status: 'sending' as const
    }

    setTicket(prev => prev ? {
      ...prev,
      support_replies: [...(prev.support_replies || []), optimisticReply]
    } : prev)

    setReplyContent('')
    setSending(true)
    setError(null)

    try {
      const response = await portalApi.replyToTicket(id, messageContent)

      // Update the optimistic message with the real data
      setTicket(prev => {
        if (!prev) return prev
        const replies = prev.support_replies || []
        return {
          ...prev,
          support_replies: replies.map(reply =>
            reply.id === tempId
              ? { ...response.reply, status: 'delivered' as const }
              : reply
          )
        }
      })
    } catch (err: any) {
      // Remove the optimistic message on error and show error inline
      setTicket(prev => {
        if (!prev) return prev
        return {
          ...prev,
          support_replies: (prev.support_replies || []).filter(reply => reply.id !== tempId)
        }
      })
      setError(err.message || 'Failed to send message')
      setReplyContent(messageContent) // Restore the message so user can retry
    } finally {
      setSending(false)
    }
  }

  const handleBookNow = () => {
    if (!ticket?.tenants?.slug) return

    // Build URL with pre-filled params
    const params = new URLSearchParams()
    if (couponDetails?.couponCode) {
      params.set('coupon', couponDetails.couponCode)
    }
    if (couponDetails?.checkIn) {
      params.set('checkIn', couponDetails.checkIn)
    }
    if (couponDetails?.checkOut) {
      params.set('checkOut', couponDetails.checkOut)
    }
    if (couponDetails?.guestName) {
      params.set('name', couponDetails.guestName)
    }
    if (couponDetails?.guestEmail) {
      params.set('email', couponDetails.guestEmail)
    }
    if (couponDetails?.guestPhone) {
      params.set('phone', couponDetails.guestPhone)
    }

    const queryString = params.toString()
    navigate(`/accommodation/${ticket.tenants.slug}/book${queryString ? `?${queryString}` : ''}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-accent-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading conversation...</p>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Conversation not found</p>
          <Link
            to="/portal/support"
            className="text-accent-600 hover:text-accent-700 font-medium"
          >
            ← Back to Support
          </Link>
        </div>
      </div>
    )
  }

  const isTicketClosed = ticket.status === 'closed'
  const statusInfo = statusConfig[ticket.status] || statusConfig.new
  const StatusIcon = statusInfo.icon

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white">
        <div className="px-6 py-4">
          {/* Welcome Banner - Inline */}
          {showWelcome && (
            <div className="mb-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Welcome to Your Customer Portal!</h3>
                  <p className="text-white/90 text-sm mt-0.5">
                    Chat directly with {welcomeBusinessName}. Type a message below to continue.
                  </p>
                </div>
                <button
                  onClick={() => setShowWelcome(false)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/portal/support')}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  {ticket.subject}
                </h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full ${statusInfo.bg} ${statusInfo.text}`}>
                  <StatusIcon className="w-3 h-3" />
                  {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Building2 size={14} />
                  {ticket.tenants?.business_name}
                </span>
                <span>•</span>
                <span>{formatDate(ticket.created_at)}</span>
              </div>
            </div>

            {/* Book Now Button for Coupon Claims */}
            {couponDetails?.isCouponClaim && ticket.tenants?.slug && (
              <button
                onClick={handleBookNow}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg"
              >
                <Calendar className="w-4 h-4" />
                Book Now
              </button>
            )}
          </div>
        </div>

        {/* Related Booking Banner */}
        {ticket.bookings && (
          <div className="px-6 pb-3">
            <Link
              to={`/portal/bookings/${ticket.booking_id}`}
              className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Calendar size={16} className="text-accent-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Related Booking</p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {ticket.bookings.room_name} • {formatDate(ticket.bookings.check_in)}
                </p>
              </div>
              <ExternalLink size={14} className="text-gray-400" />
            </Link>
          </div>
        )}
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Original Message */}
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              {customer?.profilePictureUrl ? (
                <img
                  src={customer.profilePictureUrl}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-medium">
                  {customer?.name?.charAt(0) || 'Y'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold text-gray-900">You</span>
                <span className="text-xs text-gray-400">
                  {formatTime(ticket.created_at)}
                </span>
              </div>
              <div className="bg-white rounded-2xl rounded-tl-md p-4 shadow-sm border border-gray-100">
                {formatMessage(ticket.message, true)}
                {/* Original message is always delivered/read */}
                <div className="flex justify-end mt-1 -mb-1">
                  <MessageCheckmarks status="delivered" />
                </div>
              </div>
            </div>
          </div>

          {/* Replies */}
          {ticket.support_replies?.map((reply, index) => {
            const isCustomer = reply.sender_type === 'customer'
            const showDateDivider = index === 0 ||
              new Date(reply.created_at).toDateString() !==
              new Date(ticket.support_replies![index - 1]?.created_at || ticket.created_at).toDateString()

            return (
              <div key={reply.id}>
                {showDateDivider && (
                  <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 font-medium">
                      {formatDate(reply.created_at)}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}

                <div className={`flex gap-3 ${!isCustomer ? 'flex-row-reverse' : ''}`}>
                  <div className="flex-shrink-0">
                    {isCustomer ? (
                      customer?.profilePictureUrl ? (
                        <img
                          src={customer.profilePictureUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-medium">
                          {customer?.name?.charAt(0) || 'Y'}
                        </div>
                      )
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                        {ticket.tenants?.business_name?.charAt(0) || 'P'}
                      </div>
                    )}
                  </div>
                  <div className={`flex-1 min-w-0 max-w-[85%] ${!isCustomer ? 'flex flex-col items-end' : ''}`}>
                    <div className={`flex items-baseline gap-2 mb-1 ${!isCustomer ? 'flex-row-reverse' : ''}`}>
                      <span className="font-semibold text-gray-900">
                        {isCustomer ? 'You' : (reply.sender_name || ticket.tenants?.business_name || 'Property')}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(reply.created_at)}
                      </span>
                    </div>
                    <div className={`rounded-2xl p-4 shadow-sm ${
                      isCustomer
                        ? 'bg-white rounded-tl-md border border-gray-100'
                        : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-md'
                    }`}>
                      <div className={`whitespace-pre-wrap ${!isCustomer ? 'text-white' : ''}`}>
                        {isCustomer ? formatMessage(reply.content) : reply.content}
                      </div>
                      {/* WhatsApp-style checkmarks for customer messages */}
                      {isCustomer && (
                        <div className="flex justify-end mt-1 -mb-1">
                          <MessageCheckmarks status={reply.status || 'delivered'} />
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
        {!isTicketClosed ? (
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <textarea
                  value={replyContent}
                  onChange={(e) => {
                    setReplyContent(e.target.value)
                    if (error) setError(null) // Clear error when typing
                  }}
                  placeholder="Type your message..."
                  rows={1}
                  className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/30 resize-none bg-white transition-colors shadow-lg"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px'
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
                className="p-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white rounded-xl transition-all disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                <Send size={20} className={sending ? 'animate-pulse' : ''} />
              </button>
            </div>
            {error ? (
              <p className="text-xs text-red-500 mt-2 text-center">
                {error} — tap send to retry
              </p>
            ) : (
              <p className="text-xs text-white/80 mt-2 text-center">
                Press Enter to send • Shift+Enter for new line
              </p>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto text-center py-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-500">
              <CheckCircle2 className="w-4 h-4" />
              This conversation has been closed
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
