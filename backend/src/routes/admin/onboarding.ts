import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, requirePermission, logAdminAction } from '../../middleware/superAdmin.js'

const router = Router()

/**
 * GET /api/admin/onboarding/stats
 * Get onboarding funnel statistics
 */
router.get('/stats', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get signups in period
    const { count: totalSignups } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())

    // Get tenants that completed profile
    const { count: completedProfile } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .not('business_name', 'is', null)
      .not('business_email', 'is', null)

    // Get tenants that added first room
    const { data: tenantsWithRooms } = await supabase
      .from('tenants')
      .select('id')
      .gte('created_at', startDate.toISOString())

    const tenantIds = tenantsWithRooms?.map(t => t.id) || []

    let addedRoom = 0
    if (tenantIds.length > 0) {
      const { count } = await supabase
        .from('rooms')
        .select('tenant_id', { count: 'exact', head: true })
        .in('tenant_id', tenantIds)
      addedRoom = count || 0
    }

    // Get tenants that received first booking
    let receivedBooking = 0
    if (tenantIds.length > 0) {
      const { count } = await supabase
        .from('bookings')
        .select('tenant_id', { count: 'exact', head: true })
        .in('tenant_id', tenantIds)
      receivedBooking = count || 0
    }

    // Get converted to paid
    const { count: convertedToPaid } = await supabase
      .from('tenant_subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('tenant_id', tenantIds)
      .eq('status', 'active')
      .not('payment_provider_subscription_id', 'is', null)

    const funnel = [
      { step: 'Signed Up', count: totalSignups || 0, rate: 100 },
      {
        step: 'Completed Profile',
        count: completedProfile || 0,
        rate: totalSignups ? Math.round((completedProfile || 0) / totalSignups * 100) : 0
      },
      {
        step: 'Added First Room',
        count: addedRoom,
        rate: totalSignups ? Math.round(addedRoom / totalSignups * 100) : 0
      },
      {
        step: 'Received First Booking',
        count: receivedBooking,
        rate: totalSignups ? Math.round(receivedBooking / totalSignups * 100) : 0
      },
      {
        step: 'Converted to Paid',
        count: convertedToPaid || 0,
        rate: totalSignups ? Math.round((convertedToPaid || 0) / totalSignups * 100) : 0
      }
    ]

    res.json({
      period: `${days} days`,
      funnel,
      totalSignups: totalSignups || 0,
      conversionRate: totalSignups ? ((convertedToPaid || 0) / totalSignups * 100).toFixed(1) + '%' : '0%'
    })
  } catch (error) {
    console.error('Get onboarding stats error:', error)
    res.status(500).json({ error: 'Failed to get onboarding stats' })
  }
})

/**
 * GET /api/admin/onboarding/incomplete
 * Get tenants with incomplete onboarding
 */
router.get('/incomplete', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const step = req.query.step as string

    const offset = (page - 1) * limit

    // Get recently signed up tenants
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    let query = supabase
      .from('tenants')
      .select(`
        id,
        business_name,
        business_email,
        created_at,
        rooms (id),
        bookings (id),
        tenant_subscriptions (status)
      `, { count: 'exact' })
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    // Filter by specific incomplete step
    if (step === 'profile') {
      query = query.or('business_name.is.null,business_email.is.null')
    }

    query = query.range(offset, offset + limit - 1)

    const { data: tenants, count, error } = await query

    if (error) {
      return res.status(500).json({ error: 'Failed to get incomplete onboarding' })
    }

    // Analyze each tenant's onboarding status
    const incompleteTenants = tenants?.map((tenant: any) => {
      const hasProfile = tenant.business_name && tenant.business_email
      const hasRoom = (tenant.rooms?.length || 0) > 0
      const hasBooking = (tenant.bookings?.length || 0) > 0
      const hasPaid = tenant.tenant_subscriptions?.some((s: any) => s.status === 'active')

      let currentStep = 'signup'
      let nextStep: string | null = 'profile'

      if (hasProfile) {
        currentStep = 'profile'
        nextStep = 'add_room'
      }
      if (hasRoom) {
        currentStep = 'add_room'
        nextStep = 'first_booking'
      }
      if (hasBooking) {
        currentStep = 'first_booking'
        nextStep = 'upgrade'
      }
      if (hasPaid) {
        currentStep = 'completed'
        nextStep = null
      }

      return {
        id: tenant.id,
        name: tenant.business_name || 'No name',
        email: tenant.business_email,
        signedUp: tenant.created_at,
        daysSinceSignup: Math.floor((Date.now() - new Date(tenant.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        currentStep,
        nextStep,
        completedSteps: {
          profile: hasProfile,
          room: hasRoom,
          booking: hasBooking,
          paid: hasPaid
        }
      }
    }).filter((t: any) => t.currentStep !== 'completed') || []

    res.json({
      tenants: incompleteTenants,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('Get incomplete onboarding error:', error)
    res.status(500).json({ error: 'Failed to get incomplete onboarding' })
  }
})

/**
 * GET /api/admin/onboarding/dropoff
 * Analyze where users drop off
 */
router.get('/dropoff', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get all tenants in period
    const { data: tenants } = await supabase
      .from('tenants')
      .select(`
        id,
        business_name,
        business_email,
        created_at,
        rooms (id),
        bookings (id),
        tenant_subscriptions (status, payment_provider_subscription_id)
      `)
      .gte('created_at', startDate.toISOString())

    // Analyze drop-off points
    const dropoff = {
      afterSignup: 0,     // Never completed profile
      afterProfile: 0,    // Completed profile but no room
      afterRoom: 0,       // Added room but no booking
      afterBooking: 0,    // Got booking but didn't upgrade
      completed: 0        // Full journey completed
    }

    tenants?.forEach((tenant: any) => {
      const hasProfile = tenant.business_name && tenant.business_email
      const hasRoom = (tenant.rooms?.length || 0) > 0
      const hasBooking = (tenant.bookings?.length || 0) > 0
      const hasPaid = tenant.tenant_subscriptions?.some(
        (s: any) => s.status === 'active' && s.payment_provider_subscription_id
      )

      if (!hasProfile) {
        dropoff.afterSignup++
      } else if (!hasRoom) {
        dropoff.afterProfile++
      } else if (!hasBooking) {
        dropoff.afterRoom++
      } else if (!hasPaid) {
        dropoff.afterBooking++
      } else {
        dropoff.completed++
      }
    })

    const total = tenants?.length || 0

    res.json({
      period: `${days} days`,
      totalSignups: total,
      dropoff: [
        {
          stage: 'After Signup (No Profile)',
          count: dropoff.afterSignup,
          percentage: total ? ((dropoff.afterSignup / total) * 100).toFixed(1) + '%' : '0%'
        },
        {
          stage: 'After Profile (No Room)',
          count: dropoff.afterProfile,
          percentage: total ? ((dropoff.afterProfile / total) * 100).toFixed(1) + '%' : '0%'
        },
        {
          stage: 'After Room (No Booking)',
          count: dropoff.afterRoom,
          percentage: total ? ((dropoff.afterRoom / total) * 100).toFixed(1) + '%' : '0%'
        },
        {
          stage: 'After Booking (Not Upgraded)',
          count: dropoff.afterBooking,
          percentage: total ? ((dropoff.afterBooking / total) * 100).toFixed(1) + '%' : '0%'
        },
        {
          stage: 'Completed Full Journey',
          count: dropoff.completed,
          percentage: total ? ((dropoff.completed / total) * 100).toFixed(1) + '%' : '0%'
        }
      ]
    })
  } catch (error) {
    console.error('Get dropoff analysis error:', error)
    res.status(500).json({ error: 'Failed to get dropoff analysis' })
  }
})

/**
 * POST /api/admin/onboarding/nudge/:tenantId
 * Send a nudge notification to help tenant complete onboarding
 */
router.post('/nudge/:tenantId', requirePermission('marketing'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId } = req.params
    const { message, channel = 'email' } = req.body

    // Get tenant info
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('business_name, business_email')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    // In a real implementation, you would send the actual email or notification here
    // For now, we'll log the action

    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'onboarding.nudge',
        resourceType: 'tenant',
        resourceId: tenantId,
        description: `Sent onboarding nudge to ${tenant.business_email}`,
        metadata: {
          channel,
          message: message?.substring(0, 100)
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({
      success: true,
      message: `Nudge sent to ${tenant.business_name || tenant.business_email}`,
      channel
    })
  } catch (error) {
    console.error('Send nudge error:', error)
    res.status(500).json({ error: 'Failed to send nudge' })
  }
})

/**
 * GET /api/admin/onboarding/time-to-value
 * Analyze time-to-value metrics
 */
router.get('/time-to-value', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 90
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get tenants with their first booking time
    const { data: tenants } = await supabase
      .from('tenants')
      .select(`
        id,
        created_at,
        bookings (created_at)
      `)
      .gte('created_at', startDate.toISOString())

    const timeToFirstBooking: number[] = []

    tenants?.forEach((tenant: any) => {
      if (tenant.bookings?.length > 0) {
        const signupDate = new Date(tenant.created_at)
        const firstBookingDate = new Date(
          tenant.bookings.reduce((min: string, b: any) => b.created_at < min ? b.created_at : min, tenant.bookings[0].created_at)
        )
        const daysToFirstBooking = Math.floor((firstBookingDate.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24))
        if (daysToFirstBooking >= 0) {
          timeToFirstBooking.push(daysToFirstBooking)
        }
      }
    })

    // Calculate statistics
    const avg = timeToFirstBooking.length > 0
      ? timeToFirstBooking.reduce((a, b) => a + b, 0) / timeToFirstBooking.length
      : 0

    const sorted = [...timeToFirstBooking].sort((a, b) => a - b)
    const median = sorted.length > 0
      ? sorted[Math.floor(sorted.length / 2)]
      : 0

    // Distribution
    const distribution = {
      sameDay: timeToFirstBooking.filter(d => d === 0).length,
      within7Days: timeToFirstBooking.filter(d => d > 0 && d <= 7).length,
      within30Days: timeToFirstBooking.filter(d => d > 7 && d <= 30).length,
      over30Days: timeToFirstBooking.filter(d => d > 30).length
    }

    res.json({
      period: `${days} days`,
      tenantsAnalyzed: tenants?.length || 0,
      tenantsWithBooking: timeToFirstBooking.length,
      timeToFirstBooking: {
        average: avg.toFixed(1) + ' days',
        median: median + ' days',
        fastest: sorted[0] !== undefined ? sorted[0] + ' days' : 'N/A',
        slowest: sorted[sorted.length - 1] !== undefined ? sorted[sorted.length - 1] + ' days' : 'N/A'
      },
      distribution
    })
  } catch (error) {
    console.error('Get time-to-value error:', error)
    res.status(500).json({ error: 'Failed to get time-to-value metrics' })
  }
})

export default router
