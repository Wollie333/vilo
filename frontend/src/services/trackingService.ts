// ============================================
// TRACKING SERVICE
// Privacy-first analytics tracking
// No fingerprinting, no cookies, POPIA/GDPR compliant
// ============================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

interface TrackingConfig {
  tenantId: string
}

class TrackingService {
  private sessionId: string
  private tenantId: string | null = null
  private sessionStartTime: number
  private currentPage: string = ''
  private pageStartTime: number = Date.now()

  constructor() {
    // Generate fresh session ID (no persistence across sessions - privacy first)
    this.sessionId = this.getOrCreateSession()
    this.sessionStartTime = Date.now()

    // Track session end on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.endSession())
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.trackTimeOnPage()
        }
      })
    }
  }

  private getOrCreateSession(): string {
    // Use sessionStorage - cleared when tab closes (privacy-first)
    let id = sessionStorage.getItem('vilo_session')
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem('vilo_session', id)
    }
    return id
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop'

    const ua = navigator.userAgent.toLowerCase()
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) return 'mobile'
    return 'desktop'
  }

  private getReferrerSource(): string {
    if (typeof document === 'undefined') return 'direct'

    const referrer = document.referrer.toLowerCase()
    if (!referrer) return 'direct'

    // Search engines
    if (referrer.includes('google.') || referrer.includes('bing.') ||
        referrer.includes('yahoo.') || referrer.includes('duckduckgo.')) {
      return 'organic'
    }

    // Social media
    if (referrer.includes('facebook.') || referrer.includes('instagram.') ||
        referrer.includes('twitter.') || referrer.includes('linkedin.') ||
        referrer.includes('tiktok.') || referrer.includes('youtube.')) {
      return 'social'
    }

    // Check URL for paid markers
    const url = new URL(window.location.href)
    if (url.searchParams.get('gclid') || url.searchParams.get('fbclid') ||
        url.searchParams.get('utm_medium') === 'cpc' ||
        url.searchParams.get('utm_medium') === 'paid') {
      return 'paid'
    }

    return 'referral'
  }

  /**
   * Initialize tracking for a tenant
   */
  init(config: TrackingConfig): void {
    this.tenantId = config.tenantId
    this.startSession()
  }

  /**
   * Start a new session
   */
  private async startSession(): Promise<void> {
    if (!this.tenantId) return

    try {
      await fetch(`${API_URL}/track/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: this.tenantId,
          session_id: this.sessionId,
          entry_page: window.location.pathname,
          entry_source: this.getReferrerSource(),
          referrer: document.referrer,
          device_type: this.getDeviceType()
        })
      })
    } catch (error) {
      console.error('Tracking: Failed to start session', error)
    }
  }

  /**
   * End the session
   */
  private endSession(): void {
    if (!this.tenantId) return

    const totalTime = Math.floor((Date.now() - this.sessionStartTime) / 1000)

    // Use sendBeacon for reliable delivery on page unload
    navigator.sendBeacon(
      `${API_URL}/track/session/end`,
      JSON.stringify({
        session_id: this.sessionId,
        exit_page: window.location.pathname,
        total_time_seconds: totalTime
      })
    )
  }

  /**
   * Track a page view
   */
  async trackPageView(pageType: string, roomId?: string): Promise<void> {
    if (!this.tenantId) return

    // Track time on previous page
    this.trackTimeOnPage()

    // Update current page
    this.currentPage = window.location.pathname
    this.pageStartTime = Date.now()

    try {
      await fetch(`${API_URL}/track/pageview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: this.tenantId,
          session_id: this.sessionId,
          room_id: roomId,
          page_type: pageType,
          page_path: window.location.pathname
        })
      })
    } catch (error) {
      console.error('Tracking: Failed to track page view', error)
    }
  }

  /**
   * Track time spent on page
   */
  private trackTimeOnPage(): void {
    if (!this.currentPage) return

    const timeOnPage = Math.floor((Date.now() - this.pageStartTime) / 1000)

    // Only track if significant time was spent (> 2 seconds)
    if (timeOnPage > 2) {
      navigator.sendBeacon(
        `${API_URL}/track/pageview`,
        JSON.stringify({
          tenant_id: this.tenantId,
          session_id: this.sessionId,
          page_path: this.currentPage,
          page_type: 'time_update',
          time_on_page: timeOnPage
        })
      )
    }
  }

  /**
   * Track a custom event
   */
  async trackEvent(
    eventType: string,
    eventCategory: 'engagement' | 'conversion' | 'navigation',
    options?: {
      roomId?: string
      bookingId?: string
      eventLabel?: string
      eventValue?: number
      metadata?: Record<string, unknown>
    }
  ): Promise<void> {
    if (!this.tenantId) return

    try {
      await fetch(`${API_URL}/track/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: this.tenantId,
          session_id: this.sessionId,
          event_type: eventType,
          event_category: eventCategory,
          room_id: options?.roomId,
          booking_id: options?.bookingId,
          event_label: options?.eventLabel,
          event_value: options?.eventValue,
          metadata: options?.metadata
        })
      })
    } catch (error) {
      console.error('Tracking: Failed to track event', error)
    }
  }

  /**
   * Track a conversion (booking completed)
   */
  async trackConversion(bookingId: string, _value?: number): Promise<void> {
    if (!this.tenantId) return

    try {
      await fetch(`${API_URL}/track/conversion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: this.tenantId,
          session_id: this.sessionId,
          booking_id: bookingId,
          conversion_type: 'booking'
        })
      })
    } catch (error) {
      console.error('Tracking: Failed to track conversion', error)
    }
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string {
    return this.sessionId
  }
}

// Export singleton instance
export const trackingService = new TrackingService()

// Export types
export type { TrackingConfig }
