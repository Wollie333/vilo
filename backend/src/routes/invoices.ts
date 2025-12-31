import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import {
  generateInvoice,
  getInvoiceByBookingId,
  getInvoiceById,
  regenerateInvoicePDF,
  markInvoiceSentViaEmail,
  markInvoiceSentViaWhatsApp
} from '../services/invoiceService.js'
import { generateInvoicePDF } from '../services/pdfGenerator.js'
import { sendInvoiceEmail, getWhatsAppShareUrl } from '../services/emailService.js'

const router = Router()

// Currency formatting helper
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

// Get invoice by booking ID
router.get('/booking/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const invoice = await getInvoiceByBookingId(bookingId, tenantId)

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    res.json(invoice)
  } catch (error: any) {
    console.error('Error fetching invoice:', error)
    res.status(500).json({ error: 'Failed to fetch invoice', details: error.message })
  }
})

// Generate invoice for a booking
router.post('/booking/:bookingId/generate', async (req, res) => {
  try {
    const { bookingId } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    console.log('[Invoice] Generate request:', { bookingId, tenantId })

    if (!tenantId) {
      console.log('[Invoice] Missing tenant ID')
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Verify booking exists and belongs to tenant
    console.log('[Invoice] Fetching booking...')
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, payment_status')
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)
      .single()

    if (bookingError) {
      console.error('[Invoice] Booking fetch error:', bookingError)
      return res.status(404).json({ error: 'Booking not found', details: bookingError.message })
    }

    if (!booking) {
      console.log('[Invoice] Booking not found')
      return res.status(404).json({ error: 'Booking not found' })
    }

    console.log('[Invoice] Booking found, generating invoice...')

    // Generate invoice
    const invoice = await generateInvoice(bookingId, tenantId)

    console.log('[Invoice] Invoice generated successfully:', invoice.invoice_number)
    res.status(201).json(invoice)
  } catch (error: any) {
    console.error('[Invoice] Error generating invoice:', error)
    console.error('[Invoice] Error stack:', error.stack)
    res.status(500).json({ error: 'Failed to generate invoice', details: error.message })
  }
})

// Download invoice PDF
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const invoice = await getInvoiceById(id, tenantId)

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    // Generate PDF from stored invoice data
    const pdfBuffer = await generateInvoicePDF(invoice.invoice_data)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    res.send(pdfBuffer)
  } catch (error: any) {
    console.error('Error downloading invoice:', error)
    res.status(500).json({ error: 'Failed to download invoice', details: error.message })
  }
})

// Send invoice via email
router.post('/:id/send-email', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string
    const { email } = req.body // Optional override email

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const invoice = await getInvoiceById(id, tenantId)

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    // Determine recipient email
    const recipientEmail = email || invoice.invoice_data.customer.email

    if (!recipientEmail) {
      return res.status(400).json({ error: 'No email address available' })
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice.invoice_data)

    // Send email
    const result = await sendInvoiceEmail(
      recipientEmail,
      invoice.invoice_number,
      pdfBuffer,
      invoice.invoice_data.business.name,
      invoice.invoice_data.customer.name,
      formatCurrency(invoice.invoice_data.total_amount, invoice.invoice_data.currency),
      invoice.invoice_data.booking.reference
    )

    if (!result.success) {
      return res.status(500).json({ error: 'Failed to send email', details: result.error })
    }

    // Update invoice sent status
    await markInvoiceSentViaEmail(id, tenantId, recipientEmail)

    res.json({ success: true, message: `Invoice sent to ${recipientEmail}` })
  } catch (error: any) {
    console.error('Error sending invoice email:', error)
    res.status(500).json({ error: 'Failed to send invoice', details: error.message })
  }
})

// Get WhatsApp share link
router.get('/:id/whatsapp-link', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string
    const { phone } = req.query // Optional override phone

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const invoice = await getInvoiceById(id, tenantId)

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    // Determine phone number
    const phoneNumber = (phone as string) || invoice.invoice_data.customer.phone

    if (!phoneNumber) {
      return res.status(400).json({ error: 'No phone number available' })
    }

    // Get PDF URL (use stored URL or generate download endpoint)
    const pdfUrl = invoice.pdf_url || `${process.env.API_URL || ''}/api/invoices/${id}/download`

    // Generate WhatsApp link
    const whatsappUrl = getWhatsAppShareUrl(
      phoneNumber,
      invoice.invoice_number,
      pdfUrl,
      invoice.invoice_data.business.name,
      formatCurrency(invoice.invoice_data.total_amount, invoice.invoice_data.currency)
    )

    // Mark as sent via WhatsApp
    await markInvoiceSentViaWhatsApp(id, tenantId)

    res.json({ url: whatsappUrl })
  } catch (error: any) {
    console.error('Error generating WhatsApp link:', error)
    res.status(500).json({ error: 'Failed to generate WhatsApp link', details: error.message })
  }
})

// Regenerate PDF (useful if template changes)
router.post('/:id/regenerate', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const invoice = await regenerateInvoicePDF(id, tenantId)

    res.json(invoice)
  } catch (error: any) {
    console.error('Error regenerating invoice PDF:', error)
    res.status(500).json({ error: 'Failed to regenerate PDF', details: error.message })
  }
})

// List all invoices for tenant (with pagination)
router.get('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data, error, count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('generated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching invoices:', error)
      return res.status(500).json({ error: 'Failed to fetch invoices' })
    }

    res.json({
      invoices: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error: any) {
    console.error('Error listing invoices:', error)
    res.status(500).json({ error: 'Failed to list invoices', details: error.message })
  }
})

export default router
