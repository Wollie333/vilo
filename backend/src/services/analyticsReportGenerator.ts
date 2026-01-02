import PDFDocument from 'pdfkit'
// @ts-ignore - json2csv has no type declarations
import { Parser } from 'json2csv'
import { supabase } from '../lib/supabase.js'
import {
  getDashboardSummary,
  getRevenueBreakdown,
  getRoomPerformance,
  getCustomerSegments,
  getReviewAnalytics,
  calculateHospitalityKPIs,
  getConversionFunnel,
  getTrafficSources
} from './analyticsService.js'

// ============================================
// ANALYTICS REPORT GENERATOR
// PDF and CSV report generation with branding
// ============================================

// Currency formatting
function formatCurrency(amount: number, currency: string = 'ZAR'): string {
  const symbols: Record<string, string> = {
    ZAR: 'R',
    USD: '$',
    EUR: '€',
    GBP: '£',
    NGN: '₦'
  }
  const symbol = symbols[currency] || currency + ' '
  return `${symbol}${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

// Format percentage
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

// Get report title based on type
function getReportTitle(reportType: string): string {
  const titles: Record<string, string> = {
    comprehensive: 'Comprehensive Analytics Report',
    revenue: 'Revenue Report',
    bookings: 'Bookings Report',
    occupancy: 'Occupancy Report',
    traffic: 'Traffic & Engagement Report'
  }
  return titles[reportType] || 'Analytics Report'
}

interface TenantInfo {
  id: string
  business_name: string
  logo_url?: string
  address_line1?: string
  city?: string
  postal_code?: string
  business_email?: string
  business_phone?: string
  vat_number?: string
  company_registration_number?: string
  currency?: string
}

/**
 * Generate PDF report based on report type
 */
export async function generateAnalyticsReportPDF(
  tenantId: string,
  reportType: string,
  startDate: string,
  endDate: string
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const buffers: Buffer[] = []

      // Fetch tenant info for branding
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, business_name, logo_url, address_line1, city, postal_code, business_email, business_phone, vat_number, company_registration_number, currency')
        .eq('id', tenantId)
        .single()

      if (tenantError) {
        console.error('Tenant query error:', tenantError)
        throw new Error(`Tenant query failed: ${tenantError.message}`)
      }

      if (!tenant) {
        throw new Error(`Tenant not found for ID: ${tenantId}`)
      }

      const currency = tenant.currency || 'ZAR'

      // A4 size PDF
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
        info: {
          Title: `${getReportTitle(reportType)} - ${tenant.business_name}`,
          Author: tenant.business_name,
          Subject: getReportTitle(reportType),
          Keywords: 'analytics, report, hospitality'
        }
      })

      doc.on('data', (chunk) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', reject)

      const pageWidth = 595.28
      const margin = 50
      const contentWidth = pageWidth - margin * 2

      // Brand colors
      const brandColor = '#047857'
      const primaryText = '#111827'
      const secondaryText = '#6B7280'
      const lightBg = '#F9FAFB'
      const borderColor = '#E5E7EB'

      let yPos = margin

      // =====================
      // COVER PAGE (all reports)
      // =====================
      doc.fontSize(24)
        .fillColor(brandColor)
        .font('Helvetica-Bold')
        .text(tenant.business_name, margin, yPos + 100, { align: 'center', width: contentWidth })

      doc.fontSize(18)
        .fillColor(primaryText)
        .font('Helvetica')
        .text(getReportTitle(reportType), margin, yPos + 150, { align: 'center', width: contentWidth })

      doc.fontSize(14)
        .fillColor(secondaryText)
        .text(`${formatDate(startDate)} - ${formatDate(endDate)}`, margin, yPos + 180, { align: 'center', width: contentWidth })

      // Business details at bottom
      yPos = 600
      doc.fontSize(10).fillColor(secondaryText).font('Helvetica')
      if (tenant.address_line1) {
        doc.text(tenant.address_line1, margin, yPos, { align: 'center', width: contentWidth })
        yPos += 15
      }
      if (tenant.city || tenant.postal_code) {
        doc.text(`${tenant.city || ''} ${tenant.postal_code || ''}`.trim(), margin, yPos, { align: 'center', width: contentWidth })
        yPos += 15
      }
      if (tenant.business_email) {
        doc.text(tenant.business_email, margin, yPos, { align: 'center', width: contentWidth })
        yPos += 15
      }
      if (tenant.business_phone) {
        doc.text(tenant.business_phone, margin, yPos, { align: 'center', width: contentWidth })
      }

      // Generate report based on type
      switch (reportType) {
        case 'revenue':
          await generateRevenueReport(doc, tenantId, startDate, endDate, currency, { margin, contentWidth, pageWidth, brandColor, primaryText, secondaryText, lightBg, borderColor })
          break
        case 'bookings':
          await generateBookingsReport(doc, tenantId, startDate, endDate, currency, { margin, contentWidth, pageWidth, brandColor, primaryText, secondaryText, lightBg, borderColor })
          break
        case 'occupancy':
          await generateOccupancyReport(doc, tenantId, startDate, endDate, currency, { margin, contentWidth, pageWidth, brandColor, primaryText, secondaryText, lightBg, borderColor })
          break
        case 'traffic':
          await generateTrafficReport(doc, tenantId, startDate, endDate, { margin, contentWidth, pageWidth, brandColor, primaryText, secondaryText, lightBg, borderColor })
          break
        case 'comprehensive':
        default:
          await generateComprehensiveReport(doc, tenantId, startDate, endDate, currency, { margin, contentWidth, pageWidth, brandColor, primaryText, secondaryText, lightBg, borderColor })
          break
      }

      // Add footer to all pages
      const pages = doc.bufferedPageRange()
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i)
        doc.fontSize(9).fillColor(secondaryText).font('Helvetica')
          .text(`Page ${i + 1} of ${pages.count}`, margin, 800, { align: 'center', width: contentWidth })
        doc.text(`Generated on ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} | Powered by Vilo`, margin, 815, { align: 'center', width: contentWidth })
      }

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

interface StyleConfig {
  margin: number
  contentWidth: number
  pageWidth: number
  brandColor: string
  primaryText: string
  secondaryText: string
  lightBg: string
  borderColor: string
}

// Helper to add section header
function addSectionHeader(doc: PDFKit.PDFDocument, title: string, yPos: number, styles: StyleConfig): number {
  doc.fontSize(18)
    .fillColor(styles.brandColor)
    .font('Helvetica-Bold')
    .text(title, styles.margin, yPos)

  yPos += 30
  doc.strokeColor(styles.borderColor)
    .lineWidth(1)
    .moveTo(styles.margin, yPos)
    .lineTo(styles.pageWidth - styles.margin, yPos)
    .stroke()

  return yPos + 20
}

/**
 * REVENUE REPORT - Focus on revenue metrics only
 */
async function generateRevenueReport(
  doc: PDFKit.PDFDocument,
  tenantId: string,
  startDate: string,
  endDate: string,
  currency: string,
  styles: StyleConfig
): Promise<void> {
  const revenue = await getRevenueBreakdown(tenantId, startDate, endDate)
  const summary = await getDashboardSummary(tenantId, startDate, endDate)

  doc.addPage()
  let yPos = styles.margin

  yPos = addSectionHeader(doc, 'Revenue Overview', yPos, styles)

  // Total revenue highlight
  doc.rect(styles.margin, yPos, styles.contentWidth, 60).fill(styles.lightBg)
  doc.fontSize(12).fillColor(styles.secondaryText).font('Helvetica').text('Total Revenue', styles.margin + 20, yPos + 12)
  doc.fontSize(28).fillColor(styles.brandColor).font('Helvetica-Bold').text(formatCurrency(revenue.total, currency), styles.margin + 20, yPos + 30)
  yPos += 80

  // Revenue comparison
  const revenueMetrics = [
    { label: 'Total Bookings', value: summary.totalBookings.toString() },
    { label: 'Avg. Booking Value', value: formatCurrency(summary.totalBookings > 0 ? revenue.total / summary.totalBookings : 0, currency) },
    { label: 'Revenue Growth', value: formatPercent(summary.trends?.revenue || 0) }
  ]

  const boxWidth = (styles.contentWidth - 20) / 3
  for (let i = 0; i < revenueMetrics.length; i++) {
    const x = styles.margin + i * (boxWidth + 10)
    doc.rect(x, yPos, boxWidth, 50).fill(styles.lightBg)
    doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica').text(revenueMetrics[i].label, x + 10, yPos + 10)
    doc.fontSize(16).fillColor(styles.primaryText).font('Helvetica-Bold').text(revenueMetrics[i].value, x + 10, yPos + 28)
  }
  yPos += 70

  // Revenue by Room
  if (revenue.byRoom.length > 0) {
    doc.fontSize(14).fillColor(styles.primaryText).font('Helvetica-Bold').text('Revenue by Room', styles.margin, yPos)
    yPos += 25

    doc.rect(styles.margin, yPos, styles.contentWidth, 25).fill(styles.lightBg)
    doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica-Bold')
    doc.text('Room', styles.margin + 10, yPos + 8)
    doc.text('Bookings', styles.margin + 220, yPos + 8)
    doc.text('Revenue', styles.margin + 300, yPos + 8)
    doc.text('% of Total', styles.margin + 400, yPos + 8)
    yPos += 25

    for (const room of revenue.byRoom.slice(0, 10)) {
      const pct = revenue.total > 0 ? (room.revenue / revenue.total) * 100 : 0
      doc.fontSize(9).fillColor(styles.primaryText).font('Helvetica')
      doc.text(room.room_name.substring(0, 35), styles.margin + 10, yPos + 5)
      doc.text(room.bookings.toString(), styles.margin + 220, yPos + 5)
      doc.text(formatCurrency(room.revenue, currency), styles.margin + 300, yPos + 5)
      doc.text(formatPercent(pct), styles.margin + 400, yPos + 5)
      yPos += 20
    }
    yPos += 20
  }

  // Revenue by Source
  if (revenue.bySource.length > 0) {
    doc.fontSize(14).fillColor(styles.primaryText).font('Helvetica-Bold').text('Revenue by Booking Source', styles.margin, yPos)
    yPos += 25

    for (const source of revenue.bySource) {
      doc.fontSize(10).fillColor(styles.secondaryText).font('Helvetica')
        .text(source.source.charAt(0).toUpperCase() + source.source.slice(1), styles.margin, yPos, { continued: true, width: 150 })
      doc.fillColor(styles.primaryText).font('Helvetica-Bold')
        .text(`${formatCurrency(source.revenue, currency)} (${source.count} bookings)`, { align: 'right' })
      yPos += 20
    }
  }
}

/**
 * BOOKINGS REPORT - Focus on booking metrics
 */
async function generateBookingsReport(
  doc: PDFKit.PDFDocument,
  tenantId: string,
  startDate: string,
  endDate: string,
  currency: string,
  styles: StyleConfig
): Promise<void> {
  const summary = await getDashboardSummary(tenantId, startDate, endDate)
  const kpis = await calculateHospitalityKPIs(tenantId, startDate, endDate)

  // Fetch recent bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, guest_name, room_name, check_in, check_out, status, total_amount, source, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false })
    .limit(20)

  doc.addPage()
  let yPos = styles.margin

  yPos = addSectionHeader(doc, 'Bookings Overview', yPos, styles)

  // Key booking metrics
  const bookingMetrics = [
    { label: 'Total Bookings', value: summary.totalBookings.toString() },
    { label: 'Confirmed', value: (bookings?.filter(b => b.status === 'confirmed').length || 0).toString() },
    { label: 'Avg. Lead Time', value: `${kpis.bookingLeadTime} days` },
    { label: 'Cancellation Rate', value: formatPercent(kpis.cancellationRate) }
  ]

  const boxWidth = (styles.contentWidth - 30) / 4
  for (let i = 0; i < bookingMetrics.length; i++) {
    const x = styles.margin + i * (boxWidth + 10)
    doc.rect(x, yPos, boxWidth, 50).fill(styles.lightBg)
    doc.fontSize(8).fillColor(styles.secondaryText).font('Helvetica').text(bookingMetrics[i].label, x + 8, yPos + 10)
    doc.fontSize(16).fillColor(styles.primaryText).font('Helvetica-Bold').text(bookingMetrics[i].value, x + 8, yPos + 28)
  }
  yPos += 70

  // Booking trends
  doc.fontSize(14).fillColor(styles.primaryText).font('Helvetica-Bold').text('Booking Metrics', styles.margin, yPos)
  yPos += 25

  const metrics = [
    { label: 'Average Length of Stay', value: `${kpis.lengthOfStay} nights` },
    { label: 'Repeat Guest Rate', value: formatPercent(kpis.repeatGuestRate) },
    { label: 'Average Booking Value', value: formatCurrency(kpis.adr, currency) }
  ]

  for (const metric of metrics) {
    doc.fontSize(10).fillColor(styles.secondaryText).font('Helvetica')
      .text(metric.label, styles.margin, yPos, { continued: true, width: 200 })
    doc.fillColor(styles.primaryText).font('Helvetica-Bold').text(metric.value, { align: 'right' })
    yPos += 22
  }
  yPos += 30

  // Recent bookings table
  if (bookings && bookings.length > 0) {
    doc.fontSize(14).fillColor(styles.primaryText).font('Helvetica-Bold').text('Recent Bookings', styles.margin, yPos)
    yPos += 25

    doc.rect(styles.margin, yPos, styles.contentWidth, 22).fill(styles.lightBg)
    doc.fontSize(8).fillColor(styles.secondaryText).font('Helvetica-Bold')
    doc.text('Guest', styles.margin + 8, yPos + 7)
    doc.text('Room', styles.margin + 120, yPos + 7)
    doc.text('Check-in', styles.margin + 240, yPos + 7)
    doc.text('Status', styles.margin + 320, yPos + 7)
    doc.text('Amount', styles.margin + 400, yPos + 7)
    yPos += 22

    for (const booking of bookings.slice(0, 12)) {
      doc.fontSize(8).fillColor(styles.primaryText).font('Helvetica')
      doc.text(booking.guest_name?.substring(0, 18) || 'N/A', styles.margin + 8, yPos + 5)
      doc.text(booking.room_name?.substring(0, 18) || 'N/A', styles.margin + 120, yPos + 5)
      doc.text(formatDate(booking.check_in), styles.margin + 240, yPos + 5)
      doc.text(booking.status, styles.margin + 320, yPos + 5)
      doc.text(formatCurrency(booking.total_amount || 0, currency), styles.margin + 400, yPos + 5)
      yPos += 18
    }
  }
}

/**
 * OCCUPANCY REPORT - Focus on occupancy metrics
 */
async function generateOccupancyReport(
  doc: PDFKit.PDFDocument,
  tenantId: string,
  startDate: string,
  endDate: string,
  currency: string,
  styles: StyleConfig
): Promise<void> {
  const summary = await getDashboardSummary(tenantId, startDate, endDate)
  const kpis = await calculateHospitalityKPIs(tenantId, startDate, endDate)
  const roomPerformance = await getRoomPerformance(tenantId, startDate, endDate)

  doc.addPage()
  let yPos = styles.margin

  yPos = addSectionHeader(doc, 'Occupancy Analysis', yPos, styles)

  // Main occupancy metric
  doc.rect(styles.margin, yPos, styles.contentWidth, 80).fill(styles.lightBg)
  doc.fontSize(12).fillColor(styles.secondaryText).font('Helvetica').text('Overall Occupancy Rate', styles.margin + 20, yPos + 15)
  doc.fontSize(42).fillColor(styles.brandColor).font('Helvetica-Bold').text(formatPercent(summary.occupancyRate), styles.margin + 20, yPos + 35)
  yPos += 100

  // Key occupancy metrics
  const occupancyMetrics = [
    { label: 'RevPAR', value: formatCurrency(kpis.revpar, currency), desc: 'Revenue per available room' },
    { label: 'ADR', value: formatCurrency(kpis.adr, currency), desc: 'Average daily rate' },
    { label: 'Avg. Stay', value: `${kpis.lengthOfStay} nights`, desc: 'Average length of stay' }
  ]

  const boxWidth = (styles.contentWidth - 20) / 3
  for (let i = 0; i < occupancyMetrics.length; i++) {
    const x = styles.margin + i * (boxWidth + 10)
    doc.rect(x, yPos, boxWidth, 65).fill(styles.lightBg)
    doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica').text(occupancyMetrics[i].label, x + 10, yPos + 10)
    doc.fontSize(18).fillColor(styles.primaryText).font('Helvetica-Bold').text(occupancyMetrics[i].value, x + 10, yPos + 28)
    doc.fontSize(7).fillColor(styles.secondaryText).font('Helvetica').text(occupancyMetrics[i].desc, x + 10, yPos + 50)
  }
  yPos += 85

  // Room-by-room occupancy
  if (roomPerformance.length > 0) {
    doc.fontSize(14).fillColor(styles.primaryText).font('Helvetica-Bold').text('Occupancy by Room', styles.margin, yPos)
    yPos += 25

    doc.rect(styles.margin, yPos, styles.contentWidth, 22).fill(styles.lightBg)
    doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica-Bold')
    doc.text('Room', styles.margin + 10, yPos + 7)
    doc.text('Occupancy', styles.margin + 200, yPos + 7)
    doc.text('Bookings', styles.margin + 300, yPos + 7)
    doc.text('Revenue', styles.margin + 400, yPos + 7)
    yPos += 22

    // Sort by occupancy rate
    const sorted = [...roomPerformance].sort((a, b) => b.occupancyRate - a.occupancyRate)

    for (const room of sorted.slice(0, 12)) {
      doc.fontSize(9).fillColor(styles.primaryText).font('Helvetica')
      doc.text(room.room_name.substring(0, 30), styles.margin + 10, yPos + 5)

      // Occupancy bar
      const barWidth = (room.occupancyRate / 100) * 80
      doc.rect(styles.margin + 200, yPos + 3, barWidth, 12).fill(styles.brandColor)
      doc.text(formatPercent(room.occupancyRate), styles.margin + 285, yPos + 5)

      doc.text(room.bookings.toString(), styles.margin + 300, yPos + 5)
      doc.text(formatCurrency(room.revenue, currency), styles.margin + 400, yPos + 5)
      yPos += 22
    }
  }
}

/**
 * TRAFFIC REPORT - Focus on traffic and engagement
 */
async function generateTrafficReport(
  doc: PDFKit.PDFDocument,
  tenantId: string,
  startDate: string,
  endDate: string,
  styles: StyleConfig
): Promise<void> {
  const summary = await getDashboardSummary(tenantId, startDate, endDate)
  const funnel = await getConversionFunnel(tenantId, startDate, endDate)
  const trafficSources = await getTrafficSources(tenantId, startDate, endDate)

  doc.addPage()
  let yPos = styles.margin

  yPos = addSectionHeader(doc, 'Traffic & Engagement', yPos, styles)

  // Traffic metrics
  const trafficMetrics = [
    { label: 'Total Sessions', value: summary.totalSessions.toString() },
    { label: 'Page Views', value: summary.totalPageViews.toString() },
    { label: 'Conversion Rate', value: formatPercent(summary.conversionRate) }
  ]

  const boxWidth = (styles.contentWidth - 20) / 3
  for (let i = 0; i < trafficMetrics.length; i++) {
    const x = styles.margin + i * (boxWidth + 10)
    doc.rect(x, yPos, boxWidth, 55).fill(styles.lightBg)
    doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica').text(trafficMetrics[i].label, x + 10, yPos + 10)
    doc.fontSize(20).fillColor(styles.primaryText).font('Helvetica-Bold').text(trafficMetrics[i].value, x + 10, yPos + 28)
  }
  yPos += 75

  // Conversion funnel
  doc.fontSize(14).fillColor(styles.primaryText).font('Helvetica-Bold').text('Conversion Funnel', styles.margin, yPos)
  yPos += 25

  const funnelSteps = [
    { label: 'Listing Views', value: funnel.views },
    { label: 'Inquiries', value: funnel.inquiries },
    { label: 'Bookings Started', value: funnel.bookingsStarted },
    { label: 'Bookings Completed', value: funnel.bookingsCompleted }
  ]

  for (const step of funnelSteps) {
    const barWidth = funnel.views > 0 ? (step.value / funnel.views) * (styles.contentWidth - 120) : 0
    doc.rect(styles.margin + 110, yPos, barWidth, 22).fill(styles.brandColor)
    doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica').text(step.label, styles.margin, yPos + 6)
    doc.fontSize(10).fillColor(styles.primaryText).font('Helvetica-Bold').text(step.value.toString(), styles.margin + 115 + barWidth + 5, yPos + 6)
    yPos += 30
  }
  yPos += 20

  // Traffic sources
  if (trafficSources.length > 0) {
    doc.fontSize(14).fillColor(styles.primaryText).font('Helvetica-Bold').text('Traffic Sources', styles.margin, yPos)
    yPos += 25

    doc.rect(styles.margin, yPos, styles.contentWidth, 22).fill(styles.lightBg)
    doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica-Bold')
    doc.text('Source', styles.margin + 10, yPos + 7)
    doc.text('Sessions', styles.margin + 180, yPos + 7)
    doc.text('Conversions', styles.margin + 280, yPos + 7)
    doc.text('Conv. Rate', styles.margin + 400, yPos + 7)
    yPos += 22

    for (const source of trafficSources) {
      doc.fontSize(9).fillColor(styles.primaryText).font('Helvetica')
      doc.text(source.source.charAt(0).toUpperCase() + source.source.slice(1), styles.margin + 10, yPos + 5)
      doc.text(source.sessions.toString(), styles.margin + 180, yPos + 5)
      doc.text(source.conversions.toString(), styles.margin + 280, yPos + 5)
      doc.text(formatPercent(source.conversionRate), styles.margin + 400, yPos + 5)
      yPos += 20
    }
  }
}

/**
 * COMPREHENSIVE REPORT - All metrics
 */
async function generateComprehensiveReport(
  doc: PDFKit.PDFDocument,
  tenantId: string,
  startDate: string,
  endDate: string,
  currency: string,
  styles: StyleConfig
): Promise<void> {
  const [summary, kpis, revenue, roomPerformance, reviewAnalytics] = await Promise.all([
    getDashboardSummary(tenantId, startDate, endDate),
    calculateHospitalityKPIs(tenantId, startDate, endDate),
    getRevenueBreakdown(tenantId, startDate, endDate),
    getRoomPerformance(tenantId, startDate, endDate),
    getReviewAnalytics(tenantId, startDate, endDate)
  ])

  // PAGE 2: Executive Summary
  doc.addPage()
  let yPos = styles.margin

  yPos = addSectionHeader(doc, 'Executive Summary', yPos, styles)

  // KPI Grid
  const kpiBoxWidth = (styles.contentWidth - 20) / 3
  const kpiBoxHeight = 55

  const kpiData = [
    { label: 'Total Revenue', value: formatCurrency(summary.totalRevenue, currency) },
    { label: 'Occupancy Rate', value: formatPercent(summary.occupancyRate) },
    { label: 'RevPAR', value: formatCurrency(kpis.revpar, currency) },
    { label: 'Total Bookings', value: summary.totalBookings.toString() },
    { label: 'ADR', value: formatCurrency(kpis.adr, currency) },
    { label: 'Guest Rating', value: summary.averageRating.toFixed(1) }
  ]

  for (let i = 0; i < kpiData.length; i++) {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = styles.margin + col * (kpiBoxWidth + 10)
    const y = yPos + row * (kpiBoxHeight + 10)

    doc.rect(x, y, kpiBoxWidth, kpiBoxHeight).fill(styles.lightBg)
    doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica').text(kpiData[i].label, x + 10, y + 10)
    doc.fontSize(16).fillColor(styles.primaryText).font('Helvetica-Bold').text(kpiData[i].value, x + 10, y + 28)
  }
  yPos += (kpiBoxHeight + 10) * 2 + 30

  // Hospitality KPIs
  doc.fontSize(14).fillColor(styles.brandColor).font('Helvetica-Bold').text('Key Hospitality Metrics', styles.margin, yPos)
  yPos += 25

  const hospitalityMetrics = [
    { label: 'Average Length of Stay', value: `${kpis.lengthOfStay} nights` },
    { label: 'Booking Lead Time', value: `${kpis.bookingLeadTime} days` },
    { label: 'Cancellation Rate', value: formatPercent(kpis.cancellationRate) },
    { label: 'Repeat Guest Rate', value: formatPercent(kpis.repeatGuestRate) }
  ]

  for (const metric of hospitalityMetrics) {
    doc.fontSize(10).fillColor(styles.secondaryText).font('Helvetica')
      .text(metric.label, styles.margin, yPos, { continued: true, width: 200 })
    doc.fillColor(styles.primaryText).font('Helvetica-Bold').text(metric.value, { align: 'right' })
    yPos += 20
  }

  // PAGE 3: Revenue & Room Performance (only if data exists)
  if (revenue.byRoom.length > 0 || roomPerformance.length > 0) {
    doc.addPage()
    yPos = styles.margin

    yPos = addSectionHeader(doc, 'Revenue & Room Performance', yPos, styles)

    // Total revenue
    doc.rect(styles.margin, yPos, styles.contentWidth, 50).fill(styles.lightBg)
    doc.fontSize(12).fillColor(styles.secondaryText).font('Helvetica').text('Total Revenue', styles.margin + 20, yPos + 10)
    doc.fontSize(24).fillColor(styles.brandColor).font('Helvetica-Bold').text(formatCurrency(revenue.total, currency), styles.margin + 20, yPos + 26)
    yPos += 70

    // Top rooms table
    if (roomPerformance.length > 0) {
      doc.fontSize(12).fillColor(styles.primaryText).font('Helvetica-Bold').text('Room Performance', styles.margin, yPos)
      yPos += 20

      doc.rect(styles.margin, yPos, styles.contentWidth, 22).fill(styles.lightBg)
      doc.fontSize(8).fillColor(styles.secondaryText).font('Helvetica-Bold')
      doc.text('Room', styles.margin + 8, yPos + 7)
      doc.text('Bookings', styles.margin + 180, yPos + 7)
      doc.text('Revenue', styles.margin + 250, yPos + 7)
      doc.text('Occupancy', styles.margin + 350, yPos + 7)
      doc.text('Rating', styles.margin + 430, yPos + 7)
      yPos += 22

      for (const room of roomPerformance.slice(0, 8)) {
        doc.fontSize(8).fillColor(styles.primaryText).font('Helvetica')
        doc.text(room.room_name.substring(0, 28), styles.margin + 8, yPos + 5)
        doc.text(room.bookings.toString(), styles.margin + 180, yPos + 5)
        doc.text(formatCurrency(room.revenue, currency), styles.margin + 250, yPos + 5)
        doc.text(formatPercent(room.occupancyRate), styles.margin + 350, yPos + 5)
        doc.text((room as any).averageRating?.toFixed(1) || '-', styles.margin + 430, yPos + 5)
        yPos += 18
      }
    }
  }

  // PAGE 4: Reviews (only if data exists)
  if (reviewAnalytics.totalReviews > 0) {
    doc.addPage()
    yPos = styles.margin

    yPos = addSectionHeader(doc, 'Guest Reviews', yPos, styles)

    // Overall rating
    doc.rect(styles.margin, yPos, 140, 70).fill(styles.lightBg)
    doc.fontSize(10).fillColor(styles.secondaryText).font('Helvetica').text('Overall Rating', styles.margin + 15, yPos + 12)
    doc.fontSize(32).fillColor(styles.brandColor).font('Helvetica-Bold').text(reviewAnalytics.averageRating.toFixed(1), styles.margin + 15, yPos + 28)
    doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica').text(`${reviewAnalytics.totalReviews} reviews`, styles.margin + 15, yPos + 55)

    // Category ratings
    doc.fontSize(12).fillColor(styles.primaryText).font('Helvetica-Bold').text('Category Ratings', styles.margin + 170, yPos)
    let catY = yPos + 22
    const categories = [
      { label: 'Cleanliness', value: reviewAnalytics.categoryRatings.cleanliness },
      { label: 'Service', value: reviewAnalytics.categoryRatings.service },
      { label: 'Location', value: reviewAnalytics.categoryRatings.location },
      { label: 'Value', value: reviewAnalytics.categoryRatings.value }
    ]

    for (const cat of categories) {
      doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica').text(cat.label, styles.margin + 170, catY)
      doc.fontSize(9).fillColor(styles.primaryText).font('Helvetica-Bold').text(cat.value.toFixed(1), styles.margin + 270, catY)
      catY += 14
    }
  }
}

/**
 * Generate CSV export
 */
export async function generateCSVExport(
  tenantId: string,
  dataType: string,
  startDate: string,
  endDate: string
): Promise<string> {
  let data: any[] = []
  let fields: string[] = []

  switch (dataType) {
    case 'bookings':
    case 'revenue': {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, guest_name, guest_email, room_name, check_in, check_out, status, payment_status, total_amount, source, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })

      data = bookings || []
      fields = ['id', 'guest_name', 'guest_email', 'room_name', 'check_in', 'check_out', 'status', 'payment_status', 'total_amount', 'source', 'created_at']
      break
    }

    case 'rooms':
    case 'occupancy': {
      const roomPerformance = await getRoomPerformance(tenantId, startDate, endDate)
      data = roomPerformance
      fields = ['room_id', 'room_name', 'views', 'bookings', 'revenue', 'occupancyRate', 'conversionRate']
      break
    }

    case 'traffic': {
      const { data: sessions } = await supabase
        .from('analytics_sessions')
        .select('id, session_id, started_at, ended_at, page_count, entry_source, device_type, converted')
        .eq('tenant_id', tenantId)
        .gte('started_at', startDate)
        .lte('started_at', endDate)
        .order('started_at', { ascending: false })

      data = sessions || []
      fields = ['id', 'session_id', 'started_at', 'ended_at', 'page_count', 'entry_source', 'device_type', 'converted']
      break
    }

    case 'reviews': {
      const { data: reviews } = await supabase
        .from('reviews')
        .select('id, rating, rating_cleanliness, rating_service, rating_location, rating_value, rating_safety, title, content, status, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })

      data = reviews || []
      fields = ['id', 'rating', 'rating_cleanliness', 'rating_service', 'rating_location', 'rating_value', 'rating_safety', 'title', 'content', 'status', 'created_at']
      break
    }

    case 'comprehensive':
    default: {
      const summary = await getDashboardSummary(tenantId, startDate, endDate)
      const kpis = await calculateHospitalityKPIs(tenantId, startDate, endDate)

      data = [{
        period_start: startDate,
        period_end: endDate,
        total_revenue: summary.totalRevenue,
        total_bookings: summary.totalBookings,
        occupancy_rate: summary.occupancyRate,
        average_rating: summary.averageRating,
        revpar: kpis.revpar,
        adr: kpis.adr,
        avg_length_of_stay: kpis.lengthOfStay,
        avg_booking_lead_time: kpis.bookingLeadTime,
        cancellation_rate: kpis.cancellationRate,
        repeat_guest_rate: kpis.repeatGuestRate,
        total_sessions: summary.totalSessions,
        total_page_views: summary.totalPageViews,
        conversion_rate: summary.conversionRate
      }]
      fields = Object.keys(data[0])
      break
    }
  }

  if (data.length === 0) {
    return 'No data available for the selected period'
  }

  const parser = new Parser({ fields })
  return parser.parse(data)
}
