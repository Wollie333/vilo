import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  User,
  Calendar,
  Star,
  MessageSquare,
  Activity,
  StickyNote,
  Tag,
  Building2
} from 'lucide-react'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import { customersApi, CustomerDetail as CustomerDetailType, CustomerReview, CustomerNote, CustomerUpdateData, CustomerActivity } from '../services/api'

// Import new CRM components
import {
  CustomerDetailLayout,
  CustomerDetailSidebar,
  CustomerActionsPanel,
  OverviewSection,
  BookingsSection,
  ReviewsSection,
  SupportSection,
  ContactSection,
  BusinessDetailsSection,
  ActivitySection,
  NotesSection,
  TagsSection
} from '../components/customer-detail'
import type { SectionGroup } from '../components/customer-detail'
import { useCustomerEngagement, buildEngagementData } from '../hooks/useCustomerEngagement'

export default function CustomerDetail() {
  const { email } = useParams<{ email: string }>()
  const navigate = useNavigate()
  const { tenant, user } = useAuth()
  const [customerData, setCustomerData] = useState<CustomerDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('overview')
  const { showError } = useNotification()

  // Customer notes and activities
  const [notes, setNotes] = useState<CustomerNote[]>([])
  const [activities, setActivities] = useState<CustomerActivity[]>([])
  const [tags] = useState<string[]>([])

  useEffect(() => {
    if (email) {
      loadCustomer()
      loadNotes()
      loadActivities()
    }
  }, [email])

  const loadCustomer = async () => {
    if (!email) return

    try {
      setLoading(true)
      const data = await customersApi.getByEmail(decodeURIComponent(email))
      setCustomerData(data)
    } catch (error) {
      console.error('Failed to load customer:', error)
      showError('Error', 'Failed to load customer details')
    } finally {
      setLoading(false)
    }
  }

  const loadNotes = async () => {
    if (!email) return

    try {
      const notesData = await customersApi.getNotes(decodeURIComponent(email))
      setNotes(notesData)
    } catch (error) {
      console.error('Failed to load notes:', error)
    }
  }

  const loadActivities = async () => {
    if (!email) return

    try {
      const activitiesData = await customersApi.getActivities(decodeURIComponent(email))
      setActivities(activitiesData)
    } catch (error) {
      console.error('Failed to load activities:', error)
      // Activities are optional, don't show error to user
    }
  }

  // Note CRUD handlers
  const handleCreateNote = async (content: string) => {
    if (!email) return

    try {
      const newNote = await customersApi.addNote(decodeURIComponent(email), content)
      setNotes(prev => [newNote, ...prev])
      // Reload activities to show the new note activity
      loadActivities()
    } catch (error) {
      console.error('Failed to add note:', error)
      showError('Error', 'Failed to add note')
      throw error
    }
  }

  const handleUpdateNote = async (noteId: string, content: string) => {
    if (!email) return

    try {
      const updatedNote = await customersApi.updateNote(decodeURIComponent(email), noteId, content)
      setNotes(prev => prev.map(n => n.id === noteId ? updatedNote : n))
    } catch (error) {
      console.error('Failed to update note:', error)
      showError('Error', 'Failed to update note')
      throw error
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!email) return

    try {
      await customersApi.deleteNote(decodeURIComponent(email), noteId)
      setNotes(prev => prev.filter(n => n.id !== noteId))
    } catch (error) {
      console.error('Failed to delete note:', error)
      showError('Error', 'Failed to delete note')
      throw error
    }
  }

  // Handler for updating customer details (contact info & business details)
  const handleUpdateCustomer = async (updates: CustomerUpdateData) => {
    if (!email || !customerData) return

    try {
      const result = await customersApi.update(decodeURIComponent(email), updates)
      // Update local state with the updated customer data
      setCustomerData({
        ...customerData,
        customer: {
          ...customerData.customer,
          name: result.customer.name,
          phone: result.customer.phone,
          profilePictureUrl: result.customer.profilePictureUrl,
          businessName: result.customer.businessName,
          businessVatNumber: result.customer.businessVatNumber,
          businessRegistrationNumber: result.customer.businessRegistrationNumber,
          businessAddressLine1: result.customer.businessAddressLine1,
          businessAddressLine2: result.customer.businessAddressLine2,
          businessCity: result.customer.businessCity,
          businessPostalCode: result.customer.businessPostalCode,
          businessCountry: result.customer.businessCountry,
          useBusinessDetailsOnInvoice: result.customer.useBusinessDetailsOnInvoice
        }
      })
    } catch (error) {
      console.error('Failed to update customer:', error)
      showError('Error', 'Failed to update customer details')
      throw error
    }
  }

  // Build engagement data for the hook
  const engagementData = useMemo(() => {
    if (!customerData) return null
    return buildEngagementData(
      customerData.customer,
      customerData.stats,
      customerData.supportTickets,
      notes,
      tags
    )
  }, [customerData, notes, tags])

  const { engagementScore, getSectionStatus } = useCustomerEngagement(engagementData)

  // Build section groups for sidebar
  const sectionGroups: SectionGroup[] = useMemo(() => {
    if (!customerData) return []

    return [
      {
        id: 'profile',
        name: 'Profile',
        items: [
          { id: 'overview', name: 'Overview', icon: LayoutDashboard },
          { id: 'contact', name: 'Contact Info', icon: User },
          { id: 'business', name: 'Business Details', icon: Building2 },
        ]
      },
      {
        id: 'history',
        name: 'History',
        items: [
          { id: 'bookings', name: 'Bookings', icon: Calendar, count: customerData.bookings.length },
          { id: 'reviews', name: 'Reviews', icon: Star, count: customerData.reviews?.length || 0 },
          { id: 'support', name: 'Support', icon: MessageSquare, count: customerData.supportTickets.length },
        ]
      },
      {
        id: 'engagement',
        name: 'Engagement',
        items: [
          { id: 'activity', name: 'Activity', icon: Activity },
          { id: 'notes', name: 'Notes', icon: StickyNote, count: notes.length },
          { id: 'tags', name: 'Tags', icon: Tag, count: tags.length },
        ]
      }
    ]
  }, [customerData, notes, tags])

  // Build fallback activity timeline from customer data (used when no API activities exist)
  const fallbackActivities = useMemo(() => {
    if (!customerData) return []

    const items: Array<{
      id: string
      type: 'booking' | 'review' | 'support'
      title: string
      description?: string
      date: string
      metadata?: { bookingId?: string; ticketId?: string }
    }> = []

    // Add bookings as activities
    customerData.bookings.forEach((booking: any) => {
      items.push({
        id: `booking-${booking.id}`,
        type: 'booking',
        title: `Booking at ${booking.room_name}`,
        description: `${booking.status} • Check-in ${new Date(booking.check_in).toLocaleDateString()}`,
        date: booking.created_at || booking.check_in,
        metadata: { bookingId: booking.id }
      })
    })

    // Add reviews as activities
    customerData.reviews?.forEach((review: CustomerReview) => {
      items.push({
        id: `review-${review.id}`,
        type: 'review',
        title: `Left a ${review.rating}-star review`,
        description: review.title || review.room_name,
        date: review.created_at,
        metadata: { bookingId: review.booking_id }
      })
    })

    // Add support tickets as activities
    customerData.supportTickets.forEach((ticket: any) => {
      items.push({
        id: `support-${ticket.id}`,
        type: 'support',
        title: `Support ticket: ${ticket.subject}`,
        description: ticket.status,
        date: ticket.created_at,
        metadata: { ticketId: ticket.id }
      })
    })

    // Sort by date (most recent first)
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [customerData])

  // Combine real API activities with fallback (prefer API activities if available)
  const displayActivities = useMemo(() => {
    // If we have real API activities, use them
    if (activities.length > 0) {
      return activities
    }
    // Otherwise fall back to computed activities from bookings/reviews/tickets
    return fallbackActivities
  }, [activities, fallbackActivities])

  // Handle section navigation
  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId)
  }

  // Handle adding note from quick actions
  const handleAddNote = () => {
    setActiveSection('notes')
    // The NotesSection will handle the actual adding
  }

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          Loading customer details...
        </div>
      </div>
    )
  }

  if (!customerData) {
    return (
      <div className="min-h-full bg-gray-50 flex flex-col items-center justify-center">
        <User size={48} className="text-gray-300 mb-3" />
        <p className="text-gray-500">Customer not found</p>
      </div>
    )
  }

  const { customer, stats, bookings, reviews, supportTickets } = customerData

  // Render the active section content
  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <OverviewSection
            stats={stats}
            recentBookings={bookings}
            recentReviews={reviews || []}
            recentTickets={supportTickets}
            onNavigateToSection={handleSectionChange}
          />
        )

      case 'contact':
        return (
          <ContactSection
            contact={{
              name: customer.name,
              email: customer.email,
              phone: customer.phone
            }}
            isEditable={true}
            onUpdate={async (updates) => {
              await handleUpdateCustomer({
                name: updates.name || undefined,
                phone: updates.phone || undefined
              })
            }}
          />
        )

      case 'business':
        return (
          <BusinessDetailsSection
            details={{
              businessName: customer.businessName,
              businessVatNumber: customer.businessVatNumber,
              businessRegistrationNumber: customer.businessRegistrationNumber,
              businessAddressLine1: customer.businessAddressLine1,
              businessAddressLine2: customer.businessAddressLine2,
              businessCity: customer.businessCity,
              businessPostalCode: customer.businessPostalCode,
              businessCountry: customer.businessCountry,
              useBusinessDetailsOnInvoice: customer.useBusinessDetailsOnInvoice
            }}
            onSave={async (updates) => {
              await handleUpdateCustomer(updates)
            }}
          />
        )

      case 'bookings':
        return <BookingsSection bookings={bookings} />

      case 'reviews':
        return <ReviewsSection reviews={reviews || []} />

      case 'support':
        return <SupportSection tickets={supportTickets} />

      case 'activity':
        return <ActivitySection activities={displayActivities} />

      case 'notes':
        return (
          <NotesSection
            notes={notes.map(n => ({
              id: n.id,
              content: n.content,
              created_by: n.created_by_name,
              created_at: n.created_at,
              updated_at: n.updated_at
            }))}
            currentUserName={user?.email || 'Staff'}
            onAddNote={handleCreateNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
          />
        )

      case 'tags':
        return (
          <TagsSection
            tags={tags}
            // Note: Add handlers when backend is ready
            // onAddTag={handleAddTag}
            // onRemoveTag={handleRemoveTag}
          />
        )

      default:
        return null
    }
  }

  return (
    <CustomerDetailLayout
      title={customer.name || 'Unnamed Customer'}
      subtitle={customer.email}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      sectionGroups={sectionGroups}
      getSectionStatus={getSectionStatus}
      engagementPercentage={engagementScore}
      onBack={() => navigate('/dashboard/customers')}
      sidebar={
        <CustomerDetailSidebar
          sectionGroups={sectionGroups}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          getSectionStatus={getSectionStatus}
          engagementPercentage={engagementScore}
        />
      }
      actionsPanel={
        <CustomerActionsPanel
          customer={{
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            hasPortalAccess: customer.hasPortalAccess,
            profilePictureUrl: customer.profilePictureUrl,
            businessName: customer.businessName,
            businessVatNumber: customer.businessVatNumber,
            businessRegistrationNumber: customer.businessRegistrationNumber,
            businessAddressLine1: customer.businessAddressLine1,
            businessAddressLine2: customer.businessAddressLine2,
            businessCity: customer.businessCity,
            businessPostalCode: customer.businessPostalCode,
            businessCountry: customer.businessCountry,
            useBusinessDetailsOnInvoice: customer.useBusinessDetailsOnInvoice
          }}
          stats={stats}
          tenant={tenant}
          onAddNote={handleAddNote}
          onEditBusinessDetails={() => setActiveSection('business')}
        />
      }
    >
      {renderSection()}
    </CustomerDetailLayout>
  )
}
