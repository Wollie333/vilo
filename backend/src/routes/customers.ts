import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'
import { attachUserContext, requireAuth, requirePermission } from '../middleware/permissions.js'

const router = Router()

// Apply auth middleware to all routes
router.use(attachUserContext)

// ============================================
// CUSTOMER LIST FOR ADMIN
// ============================================

/**
 * Get all customers for tenant (derived from bookings)
 * GET /api/customers
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const { search, sort = 'last_stay', order = 'desc', page = '1', limit = '20' } = req.query

    // Get all bookings for tenant with customer data
    let query = supabase
      .from('bookings')
      .select(`
        id,
        guest_name,
        guest_email,
        guest_phone,
        total_amount,
        currency,
        check_in,
        check_out,
        created_at,
        customer_id,
        customers (
          id,
          name,
          email,
          phone,
          created_at,
          last_login_at
        )
      `)
      .eq('tenant_id', tenantId)
      .not('guest_email', 'is', null)

    const { data: bookings, error } = await query

    if (error) {
      console.error('Error fetching bookings:', error)
      return res.status(500).json({ error: 'Failed to fetch customers' })
    }

    // Aggregate by email to get unique customers with stats
    const customerMap = new Map<string, any>()

    for (const booking of bookings || []) {
      const email = booking.guest_email?.toLowerCase()
      if (!email) continue

      const existing = customerMap.get(email)

      if (existing) {
        existing.bookingCount += 1
        existing.totalSpent += booking.total_amount || 0

        // Update first/last stay dates
        if (new Date(booking.check_in) < new Date(existing.firstStay)) {
          existing.firstStay = booking.check_in
        }
        if (new Date(booking.check_in) > new Date(existing.lastStay)) {
          existing.lastStay = booking.check_in
        }

        // Update name/phone if we have better data
        if (booking.customers) {
          existing.name = booking.customers.name || existing.name
          existing.phone = booking.customers.phone || existing.phone
          existing.customerId = booking.customers.id
          existing.hasPortalAccess = !!booking.customers.last_login_at
        } else if (!existing.name && booking.guest_name) {
          existing.name = booking.guest_name
        }
        if (!existing.phone && booking.guest_phone) {
          existing.phone = booking.guest_phone
        }
      } else {
        customerMap.set(email, {
          email,
          name: booking.customers?.name || booking.guest_name || null,
          phone: booking.customers?.phone || booking.guest_phone || null,
          customerId: booking.customers?.id || null,
          hasPortalAccess: booking.customers?.last_login_at ? true : false,
          bookingCount: 1,
          totalSpent: booking.total_amount || 0,
          currency: booking.currency || 'ZAR',
          firstStay: booking.check_in,
          lastStay: booking.check_in,
          createdAt: booking.customers?.created_at || booking.created_at
        })
      }
    }

    let customers = Array.from(customerMap.values())

    // Apply search filter
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase()
      customers = customers.filter(c =>
        c.email?.toLowerCase().includes(searchLower) ||
        c.name?.toLowerCase().includes(searchLower) ||
        c.phone?.includes(search)
      )
    }

    // Apply sorting
    const sortField = sort as string
    const sortOrder = order === 'asc' ? 1 : -1

    customers.sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortField) {
        case 'name':
          aVal = a.name?.toLowerCase() || ''
          bVal = b.name?.toLowerCase() || ''
          break
        case 'email':
          aVal = a.email?.toLowerCase() || ''
          bVal = b.email?.toLowerCase() || ''
          break
        case 'bookings':
          aVal = a.bookingCount
          bVal = b.bookingCount
          break
        case 'total_spent':
          aVal = a.totalSpent
          bVal = b.totalSpent
          break
        case 'first_stay':
          aVal = new Date(a.firstStay).getTime()
          bVal = new Date(b.firstStay).getTime()
          break
        case 'last_stay':
        default:
          aVal = new Date(a.lastStay).getTime()
          bVal = new Date(b.lastStay).getTime()
          break
      }

      if (aVal < bVal) return -1 * sortOrder
      if (aVal > bVal) return 1 * sortOrder
      return 0
    })

    // Apply pagination
    const pageNum = parseInt(page as string, 10)
    const limitNum = parseInt(limit as string, 10)
    const startIndex = (pageNum - 1) * limitNum
    const endIndex = startIndex + limitNum

    const paginatedCustomers = customers.slice(startIndex, endIndex)

    res.json({
      customers: paginatedCustomers,
      total: customers.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(customers.length / limitNum)
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get customer statistics
 * GET /api/customers/stats
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId

    // Get all bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('guest_email, total_amount')
      .eq('tenant_id', tenantId)
      .not('guest_email', 'is', null)

    if (error) {
      console.error('Error fetching bookings:', error)
      return res.status(500).json({ error: 'Failed to fetch statistics' })
    }

    // Calculate stats
    const emailCounts = new Map<string, number>()
    let totalRevenue = 0

    for (const booking of bookings || []) {
      const email = booking.guest_email?.toLowerCase()
      if (email) {
        emailCounts.set(email, (emailCounts.get(email) || 0) + 1)
        totalRevenue += booking.total_amount || 0
      }
    }

    const totalCustomers = emailCounts.size
    const repeatCustomers = Array.from(emailCounts.values()).filter(count => count > 1).length
    const averageBookingsPerCustomer = totalCustomers > 0
      ? (bookings?.length || 0) / totalCustomers
      : 0

    // Get customers with portal access
    const { count: portalAccessCount } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .not('last_login_at', 'is', null)
      .in('email', Array.from(emailCounts.keys()))

    res.json({
      totalCustomers,
      repeatCustomers,
      repeatRate: totalCustomers > 0 ? (repeatCustomers / totalCustomers * 100).toFixed(1) : 0,
      totalRevenue,
      averageBookingsPerCustomer: averageBookingsPerCustomer.toFixed(1),
      customersWithPortalAccess: portalAccessCount || 0
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Export customers as CSV
 * GET /api/customers/export
 */
router.get('/export', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId

    // Get all bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        guest_name,
        guest_email,
        guest_phone,
        total_amount,
        currency,
        check_in,
        customers (
          name,
          email,
          phone
        )
      `)
      .eq('tenant_id', tenantId)
      .not('guest_email', 'is', null)

    if (error) {
      console.error('Error fetching bookings:', error)
      return res.status(500).json({ error: 'Failed to export customers' })
    }

    // Aggregate by email
    const customerMap = new Map<string, any>()

    for (const booking of bookings || []) {
      const email = booking.guest_email?.toLowerCase()
      if (!email) continue

      const existing = customerMap.get(email)

      if (existing) {
        existing.bookingCount += 1
        existing.totalSpent += booking.total_amount || 0

        if (new Date(booking.check_in) < new Date(existing.firstStay)) {
          existing.firstStay = booking.check_in
        }
        if (new Date(booking.check_in) > new Date(existing.lastStay)) {
          existing.lastStay = booking.check_in
        }
      } else {
        customerMap.set(email, {
          email,
          name: (booking.customers as any)?.name || booking.guest_name || '',
          phone: (booking.customers as any)?.phone || booking.guest_phone || '',
          bookingCount: 1,
          totalSpent: booking.total_amount || 0,
          currency: booking.currency || 'ZAR',
          firstStay: booking.check_in,
          lastStay: booking.check_in
        })
      }
    }

    const customers = Array.from(customerMap.values())

    // Generate CSV
    const headers = ['Name', 'Email', 'Phone', 'Total Bookings', 'Total Spent', 'Currency', 'First Stay', 'Last Stay']
    const rows = customers.map(c => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.email}"`,
      `"${c.phone || ''}"`,
      c.bookingCount,
      c.totalSpent.toFixed(2),
      c.currency,
      c.firstStay,
      c.lastStay
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="customers-${new Date().toISOString().split('T')[0]}.csv"`)
    res.send(csv)
  } catch (error) {
    console.error('Error exporting customers:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get single customer details
 * GET /api/customers/:email
 */
router.get('/:email', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const { email } = req.params

    // Get all bookings for this customer at this tenant
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        reviews (
          id,
          rating,
          title,
          content,
          owner_response,
          status,
          created_at
        )
      `)
      .eq('tenant_id', tenantId)
      .ilike('guest_email', email)
      .order('check_in', { ascending: false })

    if (error) {
      console.error('Error fetching customer bookings:', error)
      return res.status(500).json({ error: 'Failed to fetch customer' })
    }

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    // Get customer record if exists
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .ilike('email', email)
      .single()

    // Get support tickets
    const { data: supportTickets } = await supabase
      .from('support_messages')
      .select('*')
      .eq('tenant_id', tenantId)
      .ilike('sender_email', email)
      .order('created_at', { ascending: false })

    // Calculate stats
    const totalSpent = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)
    const avgRating = bookings
      .filter(b => b.reviews && b.reviews.length > 0)
      .reduce((sum, b) => sum + (b.reviews[0]?.rating || 0), 0) /
      bookings.filter(b => b.reviews && b.reviews.length > 0).length || null

    res.json({
      customer: {
        email,
        name: customer?.name || bookings[0].guest_name,
        phone: customer?.phone || bookings[0].guest_phone,
        customerId: customer?.id || null,
        hasPortalAccess: !!customer?.last_login_at,
        lastLoginAt: customer?.last_login_at || null
      },
      stats: {
        totalBookings: bookings.length,
        totalSpent,
        currency: bookings[0].currency || 'ZAR',
        firstStay: bookings[bookings.length - 1].check_in,
        lastStay: bookings[0].check_in,
        averageRating: avgRating
      },
      bookings,
      supportTickets: supportTickets || []
    })
  } catch (error) {
    console.error('Error fetching customer:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get support tickets for admin view
 * GET /api/customers/support/tickets
 */
router.get('/support/tickets', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const { status, source, assigned_to, page = '1', limit = '20' } = req.query

    let query = supabase
      .from('support_messages')
      .select(`
        *,
        customers (
          id,
          name,
          email
        ),
        bookings (
          id,
          room_name,
          check_in,
          check_out
        ),
        support_replies (
          id
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (status && typeof status === 'string' && status !== 'all') {
      query = query.eq('status', status)
    }

    // Filter by source (website or portal)
    if (source && typeof source === 'string' && source !== 'all') {
      query = query.eq('source', source)
    }

    // Filter by assigned team member
    if (assigned_to && typeof assigned_to === 'string') {
      if (assigned_to === 'unassigned') {
        query = query.is('assigned_to', null)
      } else if (assigned_to !== 'all') {
        query = query.eq('assigned_to', assigned_to)
      }
    }

    const { data: tickets, error, count } = await query

    if (error) {
      console.error('Error fetching support tickets:', error)
      return res.status(500).json({ error: 'Failed to fetch support tickets' })
    }

    // Apply pagination
    const pageNum = parseInt(page as string, 10)
    const limitNum = parseInt(limit as string, 10)
    const startIndex = (pageNum - 1) * limitNum
    const endIndex = startIndex + limitNum

    const paginatedTickets = (tickets || []).slice(startIndex, endIndex).map(t => ({
      ...t,
      replyCount: t.support_replies?.length || 0
    }))

    res.json({
      tickets: paginatedTickets,
      total: tickets?.length || 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((tickets?.length || 0) / limitNum)
    })
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get single support ticket with thread (admin)
 * GET /api/customers/support/tickets/:id
 */
router.get('/support/tickets/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const { id } = req.params

    const { data: ticket, error } = await supabase
      .from('support_messages')
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone
        ),
        bookings (
          id,
          room_name,
          check_in,
          check_out,
          status,
          total_amount
        ),
        support_replies (
          id,
          content,
          sender_type,
          sender_name,
          created_at
        )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !ticket) {
      return res.status(404).json({ error: 'Support ticket not found' })
    }

    // Sort replies
    if (ticket.support_replies) {
      ticket.support_replies.sort((a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }

    res.json(ticket)
  } catch (error) {
    console.error('Error fetching support ticket:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Reply to support ticket (admin)
 * POST /api/customers/support/tickets/:id/reply
 */
router.post('/support/tickets/:id/reply', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const userId = req.userContext!.userId
    const { id } = req.params
    const { content, status } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    // Verify ticket belongs to tenant
    const { data: ticket, error: fetchError } = await supabase
      .from('support_messages')
      .select('id, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !ticket) {
      return res.status(404).json({ error: 'Support ticket not found' })
    }

    // Get admin user info
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    const adminName = user?.user_metadata?.first_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
      : 'Property Manager'

    // Create reply
    const { data: reply, error: createError } = await supabase
      .from('support_replies')
      .insert({
        message_id: id,
        content,
        sender_type: 'admin',
        sender_id: userId,
        sender_name: adminName
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating reply:', createError)
      return res.status(500).json({ error: 'Failed to create reply' })
    }

    // Update ticket status
    const newStatus = status || (ticket.status === 'new' ? 'open' : ticket.status)
    await supabase
      .from('support_messages')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    res.json({
      success: true,
      reply
    })
  } catch (error) {
    console.error('Error creating reply:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Update support ticket status (admin)
 * PATCH /api/customers/support/tickets/:id
 */
router.patch('/support/tickets/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const { id } = req.params
    const { status, priority, assigned_to } = req.body

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) updateData.status = status
    if (priority) updateData.priority = priority
    // Handle assignment (can be null to unassign)
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to

    const { data: ticket, error } = await supabase
      .from('support_messages')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating ticket:', error)
      return res.status(500).json({ error: 'Failed to update ticket' })
    }

    res.json({
      success: true,
      ticket
    })
  } catch (error) {
    console.error('Error updating ticket:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get team members for ticket assignment
 * GET /api/customers/support/team-members
 */
router.get('/support/team-members', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId

    // Get owner from tenants table
    const { data: tenant } = await supabase
      .from('tenants')
      .select('owner_user_id')
      .eq('id', tenantId)
      .single()

    // Get team members from tenant_members table
    const { data: members, error: membersError } = await supabase
      .from('tenant_members')
      .select('user_id, role')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    if (membersError) {
      console.error('Error fetching team members:', membersError)
      return res.status(500).json({ error: 'Failed to fetch team members' })
    }

    // Collect all user IDs (owner + members)
    const userIds: string[] = []
    if (tenant?.owner_user_id) {
      userIds.push(tenant.owner_user_id)
    }
    if (members) {
      members.forEach(m => userIds.push(m.user_id))
    }

    // Fetch user details from auth
    const teamMembers = await Promise.all(
      userIds.map(async (userId) => {
        const { data: { user } } = await supabase.auth.admin.getUserById(userId)
        const memberRecord = members?.find(m => m.user_id === userId)
        return {
          id: userId,
          email: user?.email || '',
          name: user?.user_metadata?.first_name
            ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
            : null,
          role: userId === tenant?.owner_user_id ? 'owner' : (memberRecord?.role || 'member'),
          avatar_url: user?.user_metadata?.avatar_url || null
        }
      })
    )

    res.json(teamMembers)
  } catch (error) {
    console.error('Error fetching team members:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
