import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import ICAL from 'ical.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface ParsedBooking {
  external_id: string
  guest_name: string
  check_in: string
  check_out: string
  notes?: string
}

// Demo iCal data for testing
const DEMO_CALENDARS: Record<string, string> = {
  airbnb: path.join(__dirname, '../data/demo-ical-airbnb.ics'),
  booking: path.join(__dirname, '../data/demo-ical-booking.ics'),
  booking_com: path.join(__dirname, '../data/demo-ical-booking.ics'),
}

/**
 * Fetch iCal data from a URL or demo source
 */
export async function fetchICalFeed(url: string): Promise<string> {
  // Handle demo URLs (demo://airbnb, demo://booking)
  if (url.startsWith('demo://')) {
    const platform = url.replace('demo://', '').toLowerCase()
    return getDemoICalData(platform)
  }

  // Fetch real URL
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Vilo-Booking-Sync/1.0',
        'Accept': 'text/calendar, application/calendar+json, text/plain',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch iCal: ${response.status} ${response.statusText}`)
    }

    return await response.text()
  } catch (error: any) {
    console.error('Error fetching iCal feed:', error.message)
    throw new Error(`Failed to fetch iCal feed: ${error.message}`)
  }
}

/**
 * Get demo iCal data for testing
 */
function getDemoICalData(platform: string): string {
  const filePath = DEMO_CALENDARS[platform]

  if (!filePath) {
    throw new Error(`Unknown demo platform: ${platform}. Available: ${Object.keys(DEMO_CALENDARS).join(', ')}`)
  }

  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch (error: any) {
    console.error(`Error reading demo iCal file: ${filePath}`, error.message)
    throw new Error(`Demo calendar file not found for: ${platform}`)
  }
}

/**
 * Parse iCal data and extract bookings
 */
export function parseICalFeed(icalData: string, platform?: string): ParsedBooking[] {
  try {
    const jcalData = ICAL.parse(icalData)
    const comp = new ICAL.Component(jcalData)
    const events = comp.getAllSubcomponents('vevent')

    const bookings: ParsedBooking[] = []

    for (const eventComp of events) {
      try {
        const event = new ICAL.Event(eventComp)

        // Extract guest name from summary
        let guestName = event.summary || 'Unknown Guest'

        // Clean up common prefixes from OTAs
        guestName = guestName
          .replace(/^Airbnb Guest - /i, '')
          .replace(/^Booking\.com - /i, '')
          .replace(/^Reserved - /i, '')
          .replace(/^Blocked - /i, '')
          .replace(/^Not available - /i, '')
          .trim()

        // Skip blocked/unavailable events if they don't have a real guest name
        const summary = event.summary?.toLowerCase() || ''
        if (
          summary.includes('blocked') ||
          summary.includes('not available') ||
          summary.includes('unavailable') ||
          summary === 'reserved'
        ) {
          continue
        }

        // Get dates
        const startDate = event.startDate
        const endDate = event.endDate

        if (!startDate || !endDate) {
          console.warn('Skipping event without dates:', event.uid)
          continue
        }

        // Format dates as YYYY-MM-DD
        const checkIn = formatDate(startDate.toJSDate())
        const checkOut = formatDate(endDate.toJSDate())

        // Extract description/notes
        const description = eventComp.getFirstPropertyValue('description')
        const notes = typeof description === 'string' ? description.replace(/\\n/g, '\n') : undefined

        bookings.push({
          external_id: event.uid || `${platform}-${checkIn}-${guestName}`,
          guest_name: guestName,
          check_in: checkIn,
          check_out: checkOut,
          notes: notes,
        })
      } catch (eventError: any) {
        console.warn('Error parsing event:', eventError.message)
        continue
      }
    }

    console.log(`Parsed ${bookings.length} bookings from iCal feed`)
    return bookings
  } catch (error: any) {
    console.error('Error parsing iCal data:', error.message)
    throw new Error(`Failed to parse iCal data: ${error.message}`)
  }
}

/**
 * Format a date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Sync iCal feed and return parsed bookings
 */
export async function syncICalFeed(url: string, platform?: string): Promise<ParsedBooking[]> {
  const icalData = await fetchICalFeed(url)
  return parseICalFeed(icalData, platform)
}

/**
 * Validate an iCal URL by attempting to fetch and parse it
 */
export async function validateICalUrl(url: string): Promise<{ valid: boolean; error?: string; eventCount?: number }> {
  try {
    const icalData = await fetchICalFeed(url)
    const bookings = parseICalFeed(icalData)
    return { valid: true, eventCount: bookings.length }
  } catch (error: any) {
    return { valid: false, error: error.message }
  }
}
