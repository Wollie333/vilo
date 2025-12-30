import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Building2, Calendar, Send, User } from 'lucide-react'
import Button from '../../components/Button'
import { portalApi, SupportTicket } from '../../services/portalApi'
import { useNotification } from '../../contexts/NotificationContext'
import { useCustomerAuth } from '../../contexts/CustomerAuthContext'

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  open: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
}

export default function CustomerSupportThread() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()
  const { customer: _customer } = useCustomerAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (id) {
      loadTicket()
    }
  }, [id])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.support_replies])

  const loadTicket = async () => {
    if (!id) return

    try {
      setLoading(true)
      const data = await portalApi.getTicket(id)
      setTicket(data)
    } catch (error) {
      console.error('Failed to load ticket:', error)
      showError('Error', 'Failed to load support ticket')
    } finally {
      setLoading(false)
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

  const handleSendReply = async () => {
    if (!id || !replyContent.trim()) return

    try {
      setSending(true)
      await portalApi.replyToTicket(id, replyContent.trim())
      setReplyContent('')
      await loadTicket()
      showSuccess('Reply Sent', 'Your message has been sent')
    } catch (error: any) {
      showError('Error', error.message || 'Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading ticket...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Ticket not found</p>
          <Link to="/portal/support" className="text-gray-900 hover:underline">
            Back to support
          </Link>
        </div>
      </div>
    )
  }

  const isTicketClosed = ticket.status === 'closed'

  return (
    <div className="p-8 bg-white min-h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/portal/support')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={18} />
          Back to Support
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{ticket.subject}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Building2 size={14} />
                {ticket.tenants?.business_name}
              </span>
              <span>Created {formatDate(ticket.created_at)}</span>
            </div>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[ticket.status]}`}>
            {ticket.status}
          </span>
        </div>
      </div>

      {/* Related Booking */}
      {ticket.bookings && (
        <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Related Booking</p>
          <Link
            to={`/portal/bookings/${ticket.booking_id}`}
            className="text-sm font-medium text-gray-900 hover:underline flex items-center gap-2"
          >
            <Calendar size={14} />
            {ticket.bookings.room_name} - {formatDate(ticket.bookings.check_in)}
          </Link>
        </div>
      )}

      {/* Messages Thread */}
      <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Original Message */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">You</span>
                <span className="text-xs text-gray-500">
                  {formatDate(ticket.created_at)} at {formatTime(ticket.created_at)}
                </span>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-gray-700 whitespace-pre-wrap">{ticket.message}</p>
              </div>
            </div>
          </div>

          {/* Replies */}
          {ticket.support_replies?.map((reply) => (
            <div key={reply.id} className={`flex gap-3 ${reply.sender_type === 'customer' ? '' : 'flex-row-reverse'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                reply.sender_type === 'customer' ? 'bg-gray-200' : 'bg-blue-100'
              }`}>
                <User size={16} className={reply.sender_type === 'customer' ? 'text-gray-600' : 'text-blue-600'} />
              </div>
              <div className="flex-1 max-w-[80%]">
                <div className={`flex items-center gap-2 mb-1 ${reply.sender_type === 'admin' ? 'justify-end' : ''}`}>
                  <span className="font-medium text-gray-900">
                    {reply.sender_type === 'customer' ? 'You' : reply.sender_name || 'Property Manager'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(reply.created_at)} at {formatTime(reply.created_at)}
                  </span>
                </div>
                <div className={`rounded-lg p-3 ${
                  reply.sender_type === 'customer'
                    ? 'bg-white border border-gray-200'
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <p className="text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                </div>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Reply Input */}
        {!isTicketClosed ? (
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Type your message..."
                rows={2}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
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
            <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
          </div>
        ) : (
          <div className="p-4 border-t border-gray-200 bg-gray-100 text-center">
            <p className="text-sm text-gray-500">This ticket is closed. You cannot send more messages.</p>
          </div>
        )}
      </div>
    </div>
  )
}
