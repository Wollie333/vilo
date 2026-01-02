import PDFDocument from 'pdfkit'
import platformAnalytics from './platformAnalyticsService.js'
import growthAnalytics from './growthAnalyticsService.js'

// ============================================
// ADMIN ANALYTICS REPORT GENERATOR
// PDF report for SaaS platform analytics
// ============================================

function formatCurrency(amount: number, currency: string = 'ZAR'): string {
  const symbols: Record<string, string> = {
    ZAR: 'R',
    USD: '$',
    EUR: '€',
    GBP: '£'
  }
  const symbol = symbols[currency] || currency + ' '
  return `${symbol}${amount.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
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

interface GenerateReportOptions {
  sections: string[]
  startDate: Date
  endDate: Date
  currency?: string
}

/**
 * Generate Admin Analytics PDF Report
 */
export async function generateAdminAnalyticsReport(options: GenerateReportOptions): Promise<Buffer> {
  const { sections, startDate, endDate, currency = 'ZAR' } = options

  return new Promise(async (resolve, reject) => {
    try {
      const buffers: Buffer[] = []

      // Fetch all analytics data in parallel
      const [revenueMetrics, customerMetrics, growthMetrics] = await Promise.all([
        platformAnalytics.getRevenueMetrics({ startDate, endDate }),
        platformAnalytics.getCustomerMetrics({ startDate, endDate }),
        growthAnalytics.getComprehensiveGrowthMetrics({ startDate, endDate })
      ])

      // A4 size PDF
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
        info: {
          Title: 'Platform Analytics Report',
          Author: 'Vilo',
          Subject: 'SaaS Analytics Dashboard Export',
          Keywords: 'analytics, saas, metrics, revenue, growth'
        }
      })

      doc.on('data', (chunk) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', reject)

      const pageWidth = 595.28
      const margin = 50
      const contentWidth = pageWidth - margin * 2

      const styles: StyleConfig = {
        margin,
        contentWidth,
        pageWidth,
        brandColor: '#047857',
        primaryText: '#111827',
        secondaryText: '#6B7280',
        lightBg: '#F9FAFB',
        borderColor: '#E5E7EB'
      }

      // =====================
      // COVER PAGE
      // =====================
      let yPos = margin

      doc.fontSize(28)
        .fillColor(styles.brandColor)
        .font('Helvetica-Bold')
        .text('Vilo', margin, yPos + 100, { align: 'center', width: contentWidth })

      doc.fontSize(20)
        .fillColor(styles.primaryText)
        .font('Helvetica')
        .text('Platform Analytics Report', margin, yPos + 140, { align: 'center', width: contentWidth })

      doc.fontSize(14)
        .fillColor(styles.secondaryText)
        .text(`${formatDate(startDate)} - ${formatDate(endDate)}`, margin, yPos + 170, { align: 'center', width: contentWidth })

      // Section list
      yPos = 300
      doc.fontSize(12).fillColor(styles.secondaryText).font('Helvetica')
        .text('Sections included:', margin, yPos, { align: 'center', width: contentWidth })
      yPos += 20

      const sectionLabels: Record<string, string> = {
        saasMetrics: 'SaaS Metrics',
        growthAcquisition: 'Growth & Acquisition',
        platformStats: 'Platform Stats',
        customerData: 'Customer Data',
        teamMetrics: 'Team Metrics',
        engagement: 'Engagement'
      }

      sections.forEach(section => {
        doc.fontSize(11).fillColor(styles.primaryText)
          .text(`• ${sectionLabels[section] || section}`, margin, yPos, { align: 'center', width: contentWidth })
        yPos += 18
      })

      // Generated timestamp at bottom
      doc.fontSize(10).fillColor(styles.secondaryText)
        .text(`Generated on ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, 700, { align: 'center', width: contentWidth })

      // =====================
      // SAAS METRICS PAGE
      // =====================
      if (sections.includes('saasMetrics')) {
        doc.addPage()
        yPos = margin

        yPos = addSectionHeader(doc, 'SaaS Metrics', yPos, styles)

        // Key metrics grid
        const saasKpis = [
          { label: 'MRR', value: formatCurrency(revenueMetrics?.mrr || 0, currency), growth: revenueMetrics?.mrrGrowth },
          { label: 'ARR', value: formatCurrency(revenueMetrics?.arr || 0, currency) },
          { label: 'ARPU', value: formatCurrency(revenueMetrics?.arpu || 0, currency) },
          { label: 'NRR', value: `${revenueMetrics?.nrr || 100}%` }
        ]

        const boxWidth = (contentWidth - 30) / 4
        for (let i = 0; i < saasKpis.length; i++) {
          const x = margin + i * (boxWidth + 10)
          doc.rect(x, yPos, boxWidth, 60).fill(styles.lightBg)
          doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica').text(saasKpis[i].label, x + 10, yPos + 10)
          doc.fontSize(16).fillColor(styles.primaryText).font('Helvetica-Bold').text(saasKpis[i].value, x + 10, yPos + 28)
          if (saasKpis[i].growth !== undefined) {
            const growthColor = (saasKpis[i].growth || 0) >= 0 ? '#10B981' : '#EF4444'
            doc.fontSize(9).fillColor(growthColor).text(formatPercent(saasKpis[i].growth || 0), x + 10, yPos + 46)
          }
        }
        yPos += 80

        // MRR Movement
        doc.fontSize(14).fillColor(styles.primaryText).font('Helvetica-Bold').text('MRR Movement', margin, yPos)
        yPos += 25

        const mrrMovement = [
          { label: 'New MRR', value: revenueMetrics?.newMrr || 0, color: '#10B981' },
          { label: 'Expansion', value: revenueMetrics?.expansionMrr || 0, color: '#3B82F6' },
          { label: 'Contraction', value: -(revenueMetrics?.contractionMrr || 0), color: '#F59E0B' },
          { label: 'Churned', value: -(revenueMetrics?.churnedMrr || 0), color: '#EF4444' }
        ]

        for (const item of mrrMovement) {
          const prefix = item.value >= 0 ? '+' : ''
          doc.fontSize(10).fillColor(styles.secondaryText).font('Helvetica')
            .text(item.label, margin, yPos, { continued: true, width: 150 })
          doc.fillColor(item.color).font('Helvetica-Bold')
            .text(`${prefix}${formatCurrency(Math.abs(item.value), currency)}`, { align: 'right' })
          yPos += 22
        }
        yPos += 20

        // Revenue by Plan
        if (revenueMetrics?.revenueByPlan && revenueMetrics.revenueByPlan.length > 0) {
          doc.fontSize(14).fillColor(styles.primaryText).font('Helvetica-Bold').text('Revenue by Plan', margin, yPos)
          yPos += 25

          for (const plan of revenueMetrics.revenueByPlan.slice(0, 5)) {
            doc.fontSize(10).fillColor(styles.secondaryText).font('Helvetica')
              .text(`${plan.plan} (${plan.count} subscribers)`, margin, yPos, { continued: true, width: 250 })
            doc.fillColor(styles.primaryText).font('Helvetica-Bold')
              .text(`${formatCurrency(plan.revenue, currency)} (${plan.percentage}%)`, { align: 'right' })
            yPos += 22
          }
        }
      }

      // =====================
      // GROWTH & ACQUISITION PAGE
      // =====================
      if (sections.includes('growthAcquisition')) {
        doc.addPage()
        yPos = margin

        yPos = addSectionHeader(doc, 'Growth & Acquisition', yPos, styles)

        // Key growth metrics
        const growthKpis = [
          { label: 'New Signups', value: (growthMetrics?.tenantGrowth?.newSignups || 0).toString(), growth: growthMetrics?.tenantGrowth?.signupGrowth },
          { label: 'Activation Rate', value: `${growthMetrics?.activationFunnel?.activationRate || 0}%` },
          { label: 'Total Tenants', value: (growthMetrics?.tenantGrowth?.totalTenants || 0).toString() },
          { label: 'Churn Rate', value: `${growthMetrics?.churn?.churnRate || 0}%` }
        ]

        const boxWidth = (contentWidth - 30) / 4
        for (let i = 0; i < growthKpis.length; i++) {
          const x = margin + i * (boxWidth + 10)
          doc.rect(x, yPos, boxWidth, 60).fill(styles.lightBg)
          doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica').text(growthKpis[i].label, x + 10, yPos + 10)
          doc.fontSize(16).fillColor(styles.primaryText).font('Helvetica-Bold').text(growthKpis[i].value, x + 10, yPos + 28)
          if (growthKpis[i].growth !== undefined) {
            const growthColor = (growthKpis[i].growth || 0) >= 0 ? '#10B981' : '#EF4444'
            doc.fontSize(9).fillColor(growthColor).text(formatPercent(growthKpis[i].growth || 0), x + 10, yPos + 46)
          }
        }
        yPos += 80

        // Activation Funnel
        if (growthMetrics?.activationFunnel?.stages && growthMetrics.activationFunnel.stages.length > 0) {
          doc.fontSize(14).fillColor(styles.primaryText).font('Helvetica-Bold').text('Activation Funnel', margin, yPos)
          yPos += 25

          for (const stage of growthMetrics.activationFunnel.stages) {
            const barWidth = (stage.percentage / 100) * (contentWidth - 150)
            doc.rect(margin + 100, yPos, barWidth, 18).fill(styles.brandColor)
            doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica').text(stage.stage, margin, yPos + 4)
            doc.fontSize(9).fillColor(styles.primaryText).font('Helvetica-Bold')
              .text(`${stage.count} (${stage.percentage}%)`, margin + 110 + barWidth, yPos + 4)
            yPos += 28
          }
          yPos += 10
        }

        // Churn Analysis
        doc.fontSize(14).fillColor(styles.primaryText).font('Helvetica-Bold').text('Churn Analysis', margin, yPos)
        yPos += 25

        const churnMetrics = [
          { label: 'Churned Tenants', value: (growthMetrics?.churn?.churnedTenants || 0).toString() },
          { label: 'At Risk', value: (growthMetrics?.churn?.atRiskTenants || 0).toString() },
          { label: 'Avg Tenure Before Churn', value: `${growthMetrics?.churn?.avgTenureBeforeChurn || 0} months` }
        ]

        for (const item of churnMetrics) {
          doc.fontSize(10).fillColor(styles.secondaryText).font('Helvetica')
            .text(item.label, margin, yPos, { continued: true, width: 200 })
          doc.fillColor(styles.primaryText).font('Helvetica-Bold').text(item.value, { align: 'right' })
          yPos += 22
        }
        yPos += 20

        // Customer LTV
        doc.fontSize(14).fillColor(styles.primaryText).font('Helvetica-Bold').text('Customer Lifetime Value', margin, yPos)
        yPos += 25

        doc.rect(margin, yPos, contentWidth / 2, 50).fill(styles.lightBg)
        doc.fontSize(10).fillColor(styles.secondaryText).font('Helvetica').text('Average LTV', margin + 15, yPos + 10)
        doc.fontSize(20).fillColor(styles.brandColor).font('Helvetica-Bold')
          .text(formatCurrency(customerMetrics?.ltv || 0, currency), margin + 15, yPos + 25)
      }

      // =====================
      // PLATFORM STATS PAGE
      // =====================
      if (sections.includes('platformStats')) {
        doc.addPage()
        yPos = margin

        yPos = addSectionHeader(doc, 'Platform Stats', yPos, styles)

        const platformKpis = [
          { label: 'Total Rooms', value: (growthMetrics?.inventory?.totalRooms || 0).toString() },
          { label: 'Total Bookings', value: (growthMetrics?.gmv?.totalBookings || 0).toString(), growth: growthMetrics?.gmv?.bookingGrowth },
          { label: 'Platform GMV', value: formatCurrency(growthMetrics?.gmv?.totalGMV || 0, currency), growth: growthMetrics?.gmv?.gmvGrowth },
          { label: 'Avg Booking Value', value: formatCurrency(growthMetrics?.gmv?.avgBookingValue || 0, currency) }
        ]

        const boxWidth = (contentWidth - 30) / 4
        for (let i = 0; i < platformKpis.length; i++) {
          const x = margin + i * (boxWidth + 10)
          doc.rect(x, yPos, boxWidth, 60).fill(styles.lightBg)
          doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica').text(platformKpis[i].label, x + 10, yPos + 10)
          doc.fontSize(14).fillColor(styles.primaryText).font('Helvetica-Bold').text(platformKpis[i].value, x + 10, yPos + 28)
          if (platformKpis[i].growth !== undefined) {
            const growthColor = (platformKpis[i].growth || 0) >= 0 ? '#10B981' : '#EF4444'
            doc.fontSize(9).fillColor(growthColor).text(formatPercent(platformKpis[i].growth || 0), x + 10, yPos + 46)
          }
        }
        yPos += 80

        // Inventory Health
        doc.fontSize(14).fillColor(styles.primaryText).font('Helvetica-Bold').text('Inventory Health', margin, yPos)
        yPos += 25

        const inventoryMetrics = [
          { label: 'Active Rooms', value: `${growthMetrics?.inventory?.activeRooms || 0} (${growthMetrics?.inventory?.activeRoomRate || 0}% active)` },
          { label: 'Avg Rooms/Tenant', value: (growthMetrics?.inventory?.avgRoomsPerTenant || 0).toFixed(1) },
          { label: 'New Rooms (Period)', value: `+${growthMetrics?.inventory?.newRooms || 0}` },
          { label: 'Room Growth', value: formatPercent(growthMetrics?.inventory?.roomGrowth || 0) }
        ]

        for (const item of inventoryMetrics) {
          doc.fontSize(10).fillColor(styles.secondaryText).font('Helvetica')
            .text(item.label, margin, yPos, { continued: true, width: 200 })
          doc.fillColor(styles.primaryText).font('Helvetica-Bold').text(item.value, { align: 'right' })
          yPos += 22
        }
      }

      // =====================
      // CUSTOMER DATA PAGE
      // =====================
      if (sections.includes('customerData')) {
        doc.addPage()
        yPos = margin

        yPos = addSectionHeader(doc, 'Customer Data', yPos, styles)

        const customerKpis = [
          { label: 'Total Customers', value: (growthMetrics?.customers?.totalCustomers || 0).toString(), growth: growthMetrics?.customers?.customerGrowth },
          { label: 'New Customers', value: `+${growthMetrics?.customers?.newCustomers || 0}` },
          { label: 'Repeat Rate', value: `${growthMetrics?.customers?.repeatRate || 0}%` },
          { label: 'Conversion Rate', value: `${growthMetrics?.customers?.conversionRate || 0}%` }
        ]

        const boxWidth = (contentWidth - 30) / 4
        for (let i = 0; i < customerKpis.length; i++) {
          const x = margin + i * (boxWidth + 10)
          doc.rect(x, yPos, boxWidth, 60).fill(styles.lightBg)
          doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica').text(customerKpis[i].label, x + 10, yPos + 10)
          doc.fontSize(16).fillColor(styles.primaryText).font('Helvetica-Bold').text(customerKpis[i].value, x + 10, yPos + 28)
          if (customerKpis[i].growth !== undefined) {
            const growthColor = (customerKpis[i].growth || 0) >= 0 ? '#10B981' : '#EF4444'
            doc.fontSize(9).fillColor(growthColor).text(formatPercent(customerKpis[i].growth || 0), x + 10, yPos + 46)
          }
        }
        yPos += 80

        doc.fontSize(12).fillColor(styles.secondaryText).font('Helvetica')
          .text(`Customers with bookings: ${growthMetrics?.customers?.customersWithBookings || 0}`, margin, yPos)
        yPos += 20
        doc.text(`Repeat customers: ${growthMetrics?.customers?.repeatCustomers || 0}`, margin, yPos)
      }

      // =====================
      // TEAM METRICS PAGE
      // =====================
      if (sections.includes('teamMetrics')) {
        doc.addPage()
        yPos = margin

        yPos = addSectionHeader(doc, 'Team Metrics', yPos, styles)

        const teamKpis = [
          { label: 'Total Members', value: (growthMetrics?.team?.totalMembers || 0).toString() },
          { label: 'New Members', value: `+${growthMetrics?.team?.newMembers || 0}`, growth: growthMetrics?.team?.memberGrowth },
          { label: 'Avg Team Size', value: (growthMetrics?.team?.avgTeamSize || 0).toFixed(1) },
          { label: 'Multi-Member Teams', value: (growthMetrics?.team?.teamsWithMultipleMembers || 0).toString() }
        ]

        const boxWidth = (contentWidth - 30) / 4
        for (let i = 0; i < teamKpis.length; i++) {
          const x = margin + i * (boxWidth + 10)
          doc.rect(x, yPos, boxWidth, 60).fill(styles.lightBg)
          doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica').text(teamKpis[i].label, x + 10, yPos + 10)
          doc.fontSize(16).fillColor(styles.primaryText).font('Helvetica-Bold').text(teamKpis[i].value, x + 10, yPos + 28)
          if (teamKpis[i].growth !== undefined) {
            const growthColor = (teamKpis[i].growth || 0) >= 0 ? '#10B981' : '#EF4444'
            doc.fontSize(9).fillColor(growthColor).text(formatPercent(teamKpis[i].growth || 0), x + 10, yPos + 46)
          }
        }
        yPos += 80

        // Role Distribution
        if (growthMetrics?.team?.membersByRole && growthMetrics.team.membersByRole.length > 0) {
          doc.fontSize(14).fillColor(styles.primaryText).font('Helvetica-Bold').text('Role Distribution', margin, yPos)
          yPos += 25

          for (const role of growthMetrics.team.membersByRole) {
            doc.fontSize(10).fillColor(styles.secondaryText).font('Helvetica')
              .text(role.role, margin, yPos, { continued: true, width: 150 })
            doc.fillColor(styles.primaryText).font('Helvetica-Bold')
              .text(`${role.count} (${role.percentage}%)`, { align: 'right' })
            yPos += 22
          }
        }
      }

      // =====================
      // ENGAGEMENT PAGE
      // =====================
      if (sections.includes('engagement')) {
        doc.addPage()
        yPos = margin

        yPos = addSectionHeader(doc, 'Engagement', yPos, styles)

        const engagementKpis = [
          { label: 'Active (30d)', value: `${growthMetrics?.engagement?.activeTenants30d || 0} (${growthMetrics?.engagement?.activeRate30d || 0}%)` },
          { label: 'Active (7d)', value: `${growthMetrics?.engagement?.activeTenants7d || 0} (${growthMetrics?.engagement?.activeRate7d || 0}%)` },
          { label: 'Avg Logins/Tenant', value: (growthMetrics?.engagement?.avgLoginsPerTenant || 0).toFixed(1) },
          { label: 'Avg Session', value: formatDuration(growthMetrics?.engagement?.avgSessionDuration || 0) }
        ]

        const boxWidth = (contentWidth - 30) / 4
        for (let i = 0; i < engagementKpis.length; i++) {
          const x = margin + i * (boxWidth + 10)
          doc.rect(x, yPos, boxWidth, 60).fill(styles.lightBg)
          doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica').text(engagementKpis[i].label, x + 10, yPos + 10)
          doc.fontSize(14).fillColor(styles.primaryText).font('Helvetica-Bold').text(engagementKpis[i].value, x + 10, yPos + 28)
        }
        yPos += 80

        // Feature Adoption
        if (growthMetrics?.engagement?.featureAdoption && growthMetrics.engagement.featureAdoption.length > 0) {
          doc.fontSize(14).fillColor(styles.primaryText).font('Helvetica-Bold').text('Feature Adoption', margin, yPos)
          yPos += 25

          for (const feature of growthMetrics.engagement.featureAdoption.slice(0, 6)) {
            const barWidth = (feature.adoptionRate / 100) * (contentWidth - 180)
            doc.rect(margin + 100, yPos, barWidth, 16).fill(styles.brandColor)
            doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica').text(feature.feature, margin, yPos + 3)
            doc.fontSize(9).fillColor(styles.primaryText).font('Helvetica-Bold')
              .text(`${feature.adoptionRate}%`, margin + 110 + barWidth, yPos + 3)
            yPos += 24
          }
        }
      }

      // Add footer to all pages
      const pages = doc.bufferedPageRange()
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i)
        doc.fontSize(9).fillColor(styles.secondaryText).font('Helvetica')
          .text(`Page ${i + 1} of ${pages.count}`, margin, 800, { align: 'center', width: contentWidth })
        doc.text('Powered by Vilo | Platform Analytics Report', margin, 815, { align: 'center', width: contentWidth })
      }

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

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

export default { generateAdminAnalyticsReport }
