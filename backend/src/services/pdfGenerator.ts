import PDFDocument from 'pdfkit'
import type { InvoiceData } from './invoiceService.js'

// Currency formatting
function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    ZAR: 'R',
    USD: '$',
    EUR: '€',
    GBP: '£',
    NGN: '₦'
  }
  const symbol = symbols[currency] || currency + ' '
  return `${symbol}${amount.toFixed(2)}`
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

// Generate clean, printer-friendly A4 invoice PDF
export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const buffers: Buffer[] = []

      // A4 size: 595.28 x 841.89 points
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice ${invoiceData.invoice_number}`,
          Author: invoiceData.business.name,
          Subject: 'Invoice',
          Keywords: 'invoice, booking, accommodation'
        }
      })

      doc.on('data', (chunk) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', reject)

      const pageWidth = 595.28
      const margin = 50
      const contentWidth = pageWidth - margin * 2

      // Brand colors - Vilo emerald theme (printer-friendly)
      const brandColor = '#047857'      // Brand green - matches --accent
      const primaryText = '#111827'      // Gray-900 - main text
      const secondaryText = '#6B7280'    // Gray-500 - secondary text
      const lightBg = '#F9FAFB'          // Gray-50 - subtle background
      const borderColor = '#E5E7EB'      // Gray-200 - borders

      let yPos = margin

      // ============================================
      // HEADER - Business info left, Invoice title right
      // ============================================

      // Business name
      doc.fontSize(14)
        .fillColor(primaryText)
        .font('Helvetica-Bold')
        .text(invoiceData.business.name, margin, yPos)

      // Business address (stacked neatly)
      let businessY = yPos + 20
      doc.fontSize(9)
        .fillColor(secondaryText)
        .font('Helvetica')

      if (invoiceData.business.address_line1) {
        doc.text(invoiceData.business.address_line1, margin, businessY)
        businessY += 12
      }
      if (invoiceData.business.city || invoiceData.business.postal_code) {
        const cityLine = [invoiceData.business.city, invoiceData.business.postal_code]
          .filter(Boolean).join(', ')
        doc.text(cityLine, margin, businessY)
        businessY += 12
      }
      if (invoiceData.business.email) {
        doc.text(invoiceData.business.email, margin, businessY)
        businessY += 12
      }
      if (invoiceData.business.phone) {
        doc.text(invoiceData.business.phone, margin, businessY)
        businessY += 12
      }
      if (invoiceData.business.vat_number) {
        doc.text(`VAT: ${invoiceData.business.vat_number}`, margin, businessY)
        businessY += 12
      }
      if (invoiceData.business.company_registration_number) {
        doc.text(`Reg: ${invoiceData.business.company_registration_number}`, margin, businessY)
      }

      // INVOICE title on right
      doc.fontSize(28)
        .fillColor(brandColor)
        .font('Helvetica-Bold')
        .text('INVOICE', margin, yPos, { width: contentWidth, align: 'right' })

      // Invoice details on right (below title)
      const rightCol = pageWidth - margin - 150
      let detailY = yPos + 38

      doc.fontSize(9).font('Helvetica').fillColor(secondaryText)
      doc.text('Invoice Number', rightCol, detailY)
      doc.font('Helvetica-Bold').fillColor(primaryText)
        .text(invoiceData.invoice_number, rightCol + 80, detailY)

      detailY += 16
      doc.font('Helvetica').fillColor(secondaryText)
        .text('Invoice Date', rightCol, detailY)
      doc.fillColor(primaryText)
        .text(formatDate(invoiceData.invoice_date), rightCol + 80, detailY)

      detailY += 16
      doc.font('Helvetica').fillColor(secondaryText)
        .text('Payment Date', rightCol, detailY)
      doc.fillColor(primaryText)
        .text(formatDate(invoiceData.payment_date), rightCol + 80, detailY)

      yPos += 110

      // Divider line
      doc.strokeColor(borderColor)
        .lineWidth(1)
        .moveTo(margin, yPos)
        .lineTo(pageWidth - margin, yPos)
        .stroke()

      yPos += 25

      // ============================================
      // BILL TO & BOOKING DETAILS - Two columns
      // ============================================

      const colWidth = (contentWidth - 30) / 2

      // BILL TO section
      doc.fontSize(10)
        .fillColor(brandColor)
        .font('Helvetica-Bold')
        .text('BILL TO', margin, yPos)

      let billY = yPos + 18

      // Check if customer has business details enabled
      if (invoiceData.customer.use_business_details && invoiceData.customer.business_name) {
        // Show business details
        doc.fontSize(11)
          .fillColor(primaryText)
          .font('Helvetica-Bold')
          .text(invoiceData.customer.business_name, margin, billY)

        billY += 18
        doc.fontSize(9)
          .fillColor(secondaryText)
          .font('Helvetica')

        // Business address
        if (invoiceData.customer.business_address_line1) {
          doc.text(invoiceData.customer.business_address_line1, margin, billY)
          billY += 12
        }
        if (invoiceData.customer.business_address_line2) {
          doc.text(invoiceData.customer.business_address_line2, margin, billY)
          billY += 12
        }
        if (invoiceData.customer.business_city || invoiceData.customer.business_postal_code) {
          const cityLine = [invoiceData.customer.business_city, invoiceData.customer.business_postal_code]
            .filter(Boolean).join(', ')
          doc.text(cityLine, margin, billY)
          billY += 12
        }
        if (invoiceData.customer.business_country) {
          doc.text(invoiceData.customer.business_country, margin, billY)
          billY += 12
        }
        // VAT and Registration numbers
        if (invoiceData.customer.business_vat_number) {
          doc.text(`VAT: ${invoiceData.customer.business_vat_number}`, margin, billY)
          billY += 12
        }
        if (invoiceData.customer.business_registration_number) {
          doc.text(`Reg: ${invoiceData.customer.business_registration_number}`, margin, billY)
          billY += 12
        }
        // Also show contact person
        doc.text(`Contact: ${invoiceData.customer.name}`, margin, billY)
      } else {
        // Show personal details (original behavior)
        doc.fontSize(11)
          .fillColor(primaryText)
          .font('Helvetica-Bold')
          .text(invoiceData.customer.name, margin, billY)

        billY += 18
        doc.fontSize(9)
          .fillColor(secondaryText)
          .font('Helvetica')

        if (invoiceData.customer.email) {
          doc.text(invoiceData.customer.email, margin, billY)
          billY += 14
        }
        if (invoiceData.customer.phone) {
          doc.text(invoiceData.customer.phone, margin, billY)
        }
      }

      // BOOKING DETAILS section (right column)
      const bookingCol = margin + colWidth + 30

      doc.fontSize(10)
        .fillColor(brandColor)
        .font('Helvetica-Bold')
        .text('BOOKING DETAILS', bookingCol, yPos)

      let bookingY = yPos + 18
      doc.fontSize(9).font('Helvetica')

      // Reference
      doc.fillColor(secondaryText).text('Reference:', bookingCol, bookingY)
      doc.fillColor(primaryText).font('Helvetica-Bold')
        .text(invoiceData.booking.reference, bookingCol + 70, bookingY)

      bookingY += 14
      doc.font('Helvetica').fillColor(secondaryText)
        .text('Room:', bookingCol, bookingY)
      doc.fillColor(primaryText)
        .text(invoiceData.booking.room_name, bookingCol + 70, bookingY)

      bookingY += 14
      doc.fillColor(secondaryText)
        .text('Check-in:', bookingCol, bookingY)
      doc.fillColor(primaryText)
        .text(formatDate(invoiceData.booking.check_in), bookingCol + 70, bookingY)

      bookingY += 14
      doc.fillColor(secondaryText)
        .text('Check-out:', bookingCol, bookingY)
      doc.fillColor(primaryText)
        .text(formatDate(invoiceData.booking.check_out), bookingCol + 70, bookingY)

      bookingY += 14
      doc.fillColor(secondaryText)
        .text('Duration:', bookingCol, bookingY)
      doc.fillColor(primaryText)
        .text(`${invoiceData.booking.nights} night${invoiceData.booking.nights !== 1 ? 's' : ''}`, bookingCol + 70, bookingY)

      yPos += 100

      // ============================================
      // LINE ITEMS TABLE
      // ============================================

      // Table header background
      doc.rect(margin, yPos, contentWidth, 28)
        .fill(lightBg)

      // Table header border
      doc.strokeColor(borderColor)
        .lineWidth(0.5)
        .rect(margin, yPos, contentWidth, 28)
        .stroke()

      // Column positions
      const colDesc = margin + 12
      const colQty = margin + 300
      const colPrice = margin + 360
      const colTotal = margin + 430

      // Header text
      doc.fontSize(8)
        .fillColor(secondaryText)
        .font('Helvetica-Bold')
        .text('DESCRIPTION', colDesc, yPos + 10)
        .text('QTY', colQty, yPos + 10, { width: 50, align: 'center' })
        .text('UNIT PRICE', colPrice, yPos + 10, { width: 60, align: 'right' })
        .text('AMOUNT', colTotal, yPos + 10, { width: 55, align: 'right' })

      yPos += 28

      // Table rows
      doc.font('Helvetica')

      for (let i = 0; i < invoiceData.line_items.length; i++) {
        const item = invoiceData.line_items[i]
        const rowHeight = 28
        const rowY = yPos

        // Alternate row background
        if (i % 2 === 0) {
          doc.rect(margin, rowY, contentWidth, rowHeight).fill('#FFFFFF')
        } else {
          doc.rect(margin, rowY, contentWidth, rowHeight).fill(lightBg)
        }

        // Row border
        doc.strokeColor(borderColor)
          .lineWidth(0.5)
          .moveTo(margin, rowY + rowHeight)
          .lineTo(margin + contentWidth, rowY + rowHeight)
          .stroke()

        // Row content
        const textY = rowY + 9

        doc.fontSize(9)
          .fillColor(primaryText)
          .text(item.description, colDesc, textY, { width: 280 })

        doc.text(item.quantity.toString(), colQty, textY, { width: 50, align: 'center' })

        doc.text(formatCurrency(item.unit_price, invoiceData.currency), colPrice, textY, { width: 60, align: 'right' })

        doc.font('Helvetica-Bold')
          .text(formatCurrency(item.total, invoiceData.currency), colTotal, textY, { width: 55, align: 'right' })

        doc.font('Helvetica')
        yPos += rowHeight
      }

      yPos += 20

      // ============================================
      // TOTALS SECTION
      // ============================================

      const totalsLabelX = margin + 320
      const totalsValueX = margin + 430
      const totalsWidth = 55

      // Subtotal
      doc.fontSize(9)
        .fillColor(secondaryText)
        .font('Helvetica')
        .text('Subtotal', totalsLabelX, yPos, { width: 100, align: 'right' })
      doc.fillColor(primaryText)
        .text(formatCurrency(invoiceData.subtotal, invoiceData.currency), totalsValueX, yPos, { width: totalsWidth, align: 'right' })

      yPos += 18

      // VAT
      doc.fillColor(secondaryText)
        .text(`VAT (${invoiceData.vat_rate}%)`, totalsLabelX, yPos, { width: 100, align: 'right' })
      doc.fillColor(primaryText)
        .text(formatCurrency(invoiceData.vat_amount, invoiceData.currency), totalsValueX, yPos, { width: totalsWidth, align: 'right' })

      yPos += 25

      // Grand total box
      const totalBoxX = totalsLabelX - 10
      const totalBoxWidth = contentWidth - (totalsLabelX - margin) + 10

      doc.rect(totalBoxX, yPos, totalBoxWidth, 32)
        .fill(brandColor)

      doc.fontSize(11)
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .text('TOTAL DUE', totalsLabelX, yPos + 10, { width: 100, align: 'right' })
        .text(formatCurrency(invoiceData.total_amount, invoiceData.currency), totalsValueX, yPos + 10, { width: totalsWidth, align: 'right' })

      yPos += 50

      // ============================================
      // PAYMENT STATUS
      // ============================================

      // Paid badge
      doc.roundedRect(margin, yPos, 70, 24, 4)
        .fill(brandColor)

      doc.fontSize(10)
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .text('PAID', margin, yPos + 7, { width: 70, align: 'center' })

      doc.fontSize(9)
        .fillColor(secondaryText)
        .font('Helvetica')
        .text(`Payment received on ${formatDate(invoiceData.payment_date)}  |  powered by `, margin + 85, yPos + 7, { continued: true })
      doc.fillColor(brandColor)
        .font('Helvetica-Bold')
        .text('Vilo', { continued: false })

      // Finalize PDF
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
