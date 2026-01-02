import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// ============================================
// ANALYTICS TRACKING API
// Public endpoints for privacy-first visitor tracking
// No authentication required - uses anonymous session IDs
// ============================================

interface TrackSessionStartBody {
  tenant_id: string
  session_id: string
  entry_page: string
  entry_source?: string
  referrer?: string
  device_type?: string
}

interface TrackSessionEndBody {
  session_id: string
  exit_page?: string
  total_time_seconds?: number
}

interface TrackPageViewBody {
  tenant_id: string
  session_id: string
  room_id?: string
  page_type: string
  page_path: string
  time_on_page?: number
}

interface TrackEventBody {
  tenant_id: string
  session_id: string
  room_id?: string
  booking_id?: string
  event_type: string
  event_category: string
  event_label?: string
  event_value?: number
  metadata?: Record<string, unknown>
}

/**
 * POST /api/track/session/start
 * Start a new anonymous session
 */
router.post('/session/start', async (req: Request, res: Response) => {
  try {
    const body = req.body as TrackSessionStartBody

    if (!body.tenant_id || !body.session_id || !body.entry_page) {
      return res.status(400).json({ error: 'Missing required fields: tenant_id, session_id, entry_page' })
    }

    // Validate tenant exists
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', body.tenant_id)
      .single()

    if (!tenant) {
      return res.status(404).json({ error: 'Invalid tenant' })
    }

    // Determine entry source from referrer
    let entrySource = body.entry_source || 'direct'
    if (body.referrer && !body.entry_source) {
      entrySource = categorizeReferrer(body.referrer)
    }

    // Insert session
    const { data, error } = await supabase
      .from('analytics_sessions')
      .insert({
        tenant_id: body.tenant_id,
        session_id: body.session_id,
        entry_page: body.entry_page,
        entry_source: entrySource,
        referrer: body.referrer,
        device_type: body.device_type || 'desktop',
        page_count: 1
      })
      .select()
      .single()

    if (error) {
      // Session might already exist (duplicate request)
      if (error.code === '23505') {
        return res.json({ success: true, message: 'Session already exists' })
      }
      console.error('Error creating session:', error)
      return res.status(500).json({ error: 'Failed to create session' })
    }

    res.json({ success: true, session: data })
  } catch (error) {
    console.error('Error in session start:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/track/session/end
 * End a session (called via sendBeacon on page unload)
 */
router.post('/session/end', async (req: Request, res: Response) => {
  try {
    const body = req.body as TrackSessionEndBody

    if (!body.session_id) {
      return res.status(400).json({ error: 'Missing session_id' })
    }

    const { error } = await supabase
      .from('analytics_sessions')
      .update({
        ended_at: new Date().toISOString(),
        exit_page: body.exit_page,
        total_time_seconds: body.total_time_seconds
      })
      .eq('session_id', body.session_id)

    if (error) {
      console.error('Error ending session:', error)
      return res.status(500).json({ error: 'Failed to end session' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error in session end:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/track/pageview
 * Track a page view
 */
router.post('/pageview', async (req: Request, res: Response) => {
  try {
    const body = req.body as TrackPageViewBody

    if (!body.tenant_id || !body.session_id || !body.page_type || !body.page_path) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Insert page view
    const { error: pvError } = await supabase
      .from('analytics_page_views')
      .insert({
        tenant_id: body.tenant_id,
        session_id: body.session_id,
        room_id: body.room_id || null,
        page_type: body.page_type,
        page_path: body.page_path,
        time_on_page: body.time_on_page || null
      })

    if (pvError) {
      console.error('Error tracking page view:', pvError)
      return res.status(500).json({ error: 'Failed to track page view' })
    }

    // Update session page count - fetch current and increment
    const { data: session } = await supabase
      .from('analytics_sessions')
      .select('page_count')
      .eq('session_id', body.session_id)
      .single()

    if (session) {
      await supabase
        .from('analytics_sessions')
        .update({ page_count: (session.page_count || 0) + 1 })
        .eq('session_id', body.session_id)
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error in pageview tracking:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/track/event
 * Track a custom event (click, form submit, etc.)
 */
router.post('/event', async (req: Request, res: Response) => {
  try {
    const body = req.body as TrackEventBody

    if (!body.tenant_id || !body.session_id || !body.event_type || !body.event_category) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { error } = await supabase
      .from('analytics_events')
      .insert({
        tenant_id: body.tenant_id,
        session_id: body.session_id,
        room_id: body.room_id || null,
        booking_id: body.booking_id || null,
        event_type: body.event_type,
        event_category: body.event_category,
        event_label: body.event_label,
        event_value: body.event_value,
        metadata: body.metadata || {}
      })

    if (error) {
      console.error('Error tracking event:', error)
      return res.status(500).json({ error: 'Failed to track event' })
    }

    // If this is a conversion event, update session
    if (body.event_category === 'conversion') {
      await supabase
        .from('analytics_sessions')
        .update({
          converted: true,
          conversion_type: body.event_type,
          booking_id: body.booking_id || null
        })
        .eq('session_id', body.session_id)
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error in event tracking:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/track/conversion
 * Track a conversion (booking completed)
 */
router.post('/conversion', async (req: Request, res: Response) => {
  try {
    const { session_id, booking_id, tenant_id, conversion_type = 'booking' } = req.body

    if (!session_id || !tenant_id) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Update session with conversion
    const { error } = await supabase
      .from('analytics_sessions')
      .update({
        converted: true,
        conversion_type,
        booking_id: booking_id || null
      })
      .eq('session_id', session_id)

    if (error) {
      console.error('Error tracking conversion:', error)
      return res.status(500).json({ error: 'Failed to track conversion' })
    }

    // Also log as event
    await supabase
      .from('analytics_events')
      .insert({
        tenant_id,
        session_id,
        booking_id: booking_id || null,
        event_type: conversion_type,
        event_category: 'conversion',
        event_label: 'Booking completed'
      })

    res.json({ success: true })
  } catch (error) {
    console.error('Error in conversion tracking:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Helper: Categorize referrer into traffic source
 */
function categorizeReferrer(referrer: string): string {
  if (!referrer) return 'direct'

  const url = referrer.toLowerCase()

  // Search engines
  if (url.includes('google.') || url.includes('bing.') || url.includes('yahoo.') ||
      url.includes('duckduckgo.') || url.includes('baidu.')) {
    return 'organic'
  }

  // Social media
  if (url.includes('facebook.') || url.includes('instagram.') || url.includes('twitter.') ||
      url.includes('linkedin.') || url.includes('tiktok.') || url.includes('pinterest.') ||
      url.includes('youtube.')) {
    return 'social'
  }

  // Check for UTM parameters indicating paid traffic
  if (url.includes('utm_medium=cpc') || url.includes('utm_medium=paid') ||
      url.includes('gclid=') || url.includes('fbclid=')) {
    return 'paid'
  }

  // Email sources
  if (url.includes('mail.') || url.includes('outlook.') || url.includes('gmail.')) {
    return 'email'
  }

  // Everything else is referral
  return 'referral'
}

export default router
