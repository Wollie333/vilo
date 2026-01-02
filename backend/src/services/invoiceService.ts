import { supabase } from '../lib/supabase.js'
import { generateInvoicePDF } from './pdfGenerator.js'

// Invoice data structure that gets stored as JSONB
export interface InvoiceData {
  invoice_number: string
  invoice_date: string
  payment_date: string

  business: {
    name: string
    logo_url: string | null
    address_line1: string | null
    address_line2: string | null
    city: string | null
    state_province: string | null
    postal_code: string | null
    country: string | null
    vat_number: string | null
    company_registration_number: string | null
    email: string | null
    phone: string | null
  }

  customer: {
    name: string
    email: string | null
    phone: string | null
    // Business details (when customer has business info enabled)
    business_name: string | null
    business_vat_number: string | null
    business_registration_number: string | null
    business_address_line1: string | null
    business_address_line2: string | null
    business_city: string | null
    business_postal_code: string | null
    business_country: string | null
    use_business_details: boolean
  }

  booking: {
    id: string
    reference: string
    room_name: string
    check_in: string
    check_out: string
    nights: number
  }

  line_items: Array<{
    description: string
    quantity: number
    unit_price: number
    total: number
  }>

  subtotal: number
  vat_rate: number
  vat_amount: number
  total_amount: number
  currency: string
}

export interface Invoice {
  id: string
  tenant_id: string
  booking_id: string
  invoice_number: string
  invoice_data: InvoiceData
  pdf_url: string | null
  pdf_path: string | null
  sent_via_email_at: string | null
  sent_via_whatsapp_at: string | null
  email_recipient: string | null
  generated_at: string
  created_at: string
  updated_at: string
}

// Get the next invoice number for a tenant (atomic operation)
export async function getNextInvoiceNumber(tenantId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_next_invoice_number', {
    p_tenant_id: tenantId
  })

  if (error) {
    console.error('Error getting next invoice number:', error)
    throw new Error('Failed to generate invoice number')
  }

  const number = data || 1
  return `INV-${String(number).padStart(6, '0')}`
}

// Calculate number of nights between two dates
function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Parse booking notes JSON to extract add-ons and nightly rates
function parseBookingNotes(notes: string | null): {
  addons: Array<{ id: string; name: string; quantity: number; price: number; total: number }>
  nightly_rates: Array<{ date: string; rate: number }> | null
  booking_reference: string | null
} {
  if (!notes) {
    return { addons: [], nightly_rates: null, booking_reference: null }
  }

  try {
    const parsed = JSON.parse(notes)
    return {
      addons: parsed.addons || [],
      nightly_rates: parsed.nightly_rates || null,
      booking_reference: parsed.booking_reference || null
    }
  } catch {
    return { addons: [], nightly_rates: null, booking_reference: null }
  }
}

// Build complete invoice data from booking and tenant
export async function buildInvoiceData(
  booking: any,
  tenant: any,
  invoiceNumber: string
): Promise<InvoiceData> {
  const nights = calculateNights(booking.check_in, booking.check_out)
  const parsedNotes = parseBookingNotes(booking.notes)

  // Get room details
  const { data: room } = await supabase
    .from('rooms')
    .select('name, base_price_per_night')
    .eq('id', booking.room_id)
    .single()

  // Get customer details if customer_id exists
  let customerBusinessDetails = {
    business_name: null as string | null,
    business_vat_number: null as string | null,
    business_registration_number: null as string | null,
    business_address_line1: null as string | null,
    business_address_line2: null as string | null,
    business_city: null as string | null,
    business_postal_code: null as string | null,
    business_country: null as string | null,
    use_business_details: false
  }

  if (booking.customer_id) {
    const { data: customer } = await supabase
      .from('customers')
      .select('business_name, business_vat_number, business_registration_number, business_address_line1, business_address_line2, business_city, business_postal_code, business_country, use_business_details_on_invoice')
      .eq('id', booking.customer_id)
      .single()

    if (customer && customer.use_business_details_on_invoice) {
      customerBusinessDetails = {
        business_name: customer.business_name,
        business_vat_number: customer.business_vat_number,
        business_registration_number: customer.business_registration_number,
        business_address_line1: customer.business_address_line1,
        business_address_line2: customer.business_address_line2,
        business_city: customer.business_city,
        business_postal_code: customer.business_postal_code,
        business_country: customer.business_country,
        use_business_details: true
      }
    }
  }

  // Build line items
  const lineItems: InvoiceData['line_items'] = []

  // Add nightly rates
  if (parsedNotes.nightly_rates && parsedNotes.nightly_rates.length > 0) {
    // Use custom nightly rates if available
    for (const nightRate of parsedNotes.nightly_rates) {
      lineItems.push({
        description: `Accommodation - ${new Date(nightRate.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        quantity: 1,
        unit_price: nightRate.rate,
        total: nightRate.rate
      })
    }
  } else {
    // Use standard room rate
    const roomRate = room?.base_price_per_night || 0
    lineItems.push({
      description: `${room?.name || booking.room_name || 'Accommodation'} (${nights} night${nights !== 1 ? 's' : ''})`,
      quantity: nights,
      unit_price: roomRate,
      total: roomRate * nights
    })
  }

  // Add add-ons
  for (const addon of parsedNotes.addons) {
    lineItems.push({
      description: addon.name,
      quantity: addon.quantity,
      unit_price: addon.price,
      total: addon.total
    })
  }

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)
  const vatRate = 15
  // Work backwards from total_amount to figure out VAT
  // If total_amount matches subtotal, VAT is additional
  // Otherwise, total_amount is the final amount and we calculate VAT from that
  let vatAmount: number
  let totalAmount: number

  if (Math.abs(booking.total_amount - subtotal) < 0.01) {
    // Subtotal equals stored amount - add VAT on top
    vatAmount = subtotal * (vatRate / 100)
    totalAmount = subtotal + vatAmount
  } else {
    // Use stored total_amount as final amount, calculate VAT portion
    totalAmount = booking.total_amount
    // VAT is included: total = subtotal + (subtotal * 0.15) = subtotal * 1.15
    // So subtotal = total / 1.15, and VAT = total - subtotal
    const calculatedSubtotal = totalAmount / 1.15
    vatAmount = totalAmount - calculatedSubtotal
  }

  const today = new Date().toISOString().split('T')[0]

  return {
    invoice_number: invoiceNumber,
    invoice_date: today,
    payment_date: today,

    business: {
      name: tenant.business_name || tenant.name || 'Business',
      logo_url: tenant.logo_url || null,
      address_line1: tenant.address_line1 || null,
      address_line2: tenant.address_line2 || null,
      city: tenant.city || null,
      state_province: tenant.state_province || null,
      postal_code: tenant.postal_code || null,
      country: tenant.country || 'South Africa',
      vat_number: tenant.vat_number || null,
      company_registration_number: tenant.company_registration_number || null,
      email: tenant.business_email || null,
      phone: tenant.business_phone || null
    },

    customer: {
      name: booking.guest_name,
      email: booking.guest_email || null,
      phone: booking.guest_phone || null,
      ...customerBusinessDetails
    },

    booking: {
      id: booking.id,
      reference: parsedNotes.booking_reference || `VILO-${booking.id.slice(0, 4).toUpperCase()}`,
      room_name: room?.name || booking.room_name || 'Room',
      check_in: booking.check_in,
      check_out: booking.check_out,
      nights
    },

    line_items: lineItems,
    subtotal,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    total_amount: totalAmount,
    currency: booking.currency || 'ZAR'
  }
}

// Generate invoice for a booking
export async function generateInvoice(
  bookingId: string,
  tenantId: string
): Promise<Invoice> {
  // Check if invoice already exists
  const { data: existingInvoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('tenant_id', tenantId)
    .single()

  if (existingInvoice) {
    return existingInvoice as Invoice
  }

  // Get booking details
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    .single()

  if (bookingError || !booking) {
    throw new Error('Booking not found')
  }

  // Get tenant details
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()

  if (tenantError || !tenant) {
    throw new Error('Tenant not found')
  }

  // Generate invoice number
  const invoiceNumber = await getNextInvoiceNumber(tenantId)

  // Build invoice data
  const invoiceData = await buildInvoiceData(booking, tenant, invoiceNumber)

  // Generate PDF
  const pdfBuffer = await generateInvoicePDF(invoiceData)

  // Upload PDF to Supabase Storage
  const year = new Date().getFullYear()
  const pdfPath = `${tenantId}/${year}/${invoiceNumber}.pdf`

  const { error: uploadError } = await supabase.storage
    .from('invoices')
    .upload(pdfPath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    })

  if (uploadError) {
    console.error('Error uploading PDF:', uploadError)
    // Continue without PDF URL - we can regenerate later
  }

  // Get public URL for the PDF
  const { data: urlData } = supabase.storage
    .from('invoices')
    .getPublicUrl(pdfPath)

  const pdfUrl = urlData?.publicUrl || null

  // Create invoice record
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      tenant_id: tenantId,
      booking_id: bookingId,
      invoice_number: invoiceNumber,
      invoice_data: invoiceData,
      pdf_url: pdfUrl,
      pdf_path: pdfPath
    })
    .select()
    .single()

  if (invoiceError) {
    console.error('Error creating invoice:', invoiceError)
    throw new Error('Failed to create invoice')
  }

  // Update booking with invoice reference
  await supabase
    .from('bookings')
    .update({ invoice_id: invoice.id })
    .eq('id', bookingId)

  return invoice as Invoice
}

// Get invoice by booking ID
export async function getInvoiceByBookingId(
  bookingId: string,
  tenantId: string
): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching invoice:', error)
    throw new Error('Failed to fetch invoice')
  }

  return data as Invoice
}

// Get invoice by ID
export async function getInvoiceById(
  invoiceId: string,
  tenantId: string
): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching invoice:', error)
    throw new Error('Failed to fetch invoice')
  }

  return data as Invoice
}

// Regenerate PDF for an invoice (useful if template changes)
export async function regenerateInvoicePDF(
  invoiceId: string,
  tenantId: string
): Promise<Invoice> {
  const invoice = await getInvoiceById(invoiceId, tenantId)
  if (!invoice) {
    throw new Error('Invoice not found')
  }

  // Generate new PDF from stored invoice data
  const pdfBuffer = await generateInvoicePDF(invoice.invoice_data)

  // Upload to storage
  const pdfPath = invoice.pdf_path || `${tenantId}/${new Date().getFullYear()}/${invoice.invoice_number}.pdf`

  await supabase.storage
    .from('invoices')
    .upload(pdfPath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    })

  const { data: urlData } = supabase.storage
    .from('invoices')
    .getPublicUrl(pdfPath)

  // Update invoice record
  const { data: updatedInvoice, error } = await supabase
    .from('invoices')
    .update({
      pdf_url: urlData?.publicUrl,
      pdf_path: pdfPath,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId)
    .select()
    .single()

  if (error) {
    throw new Error('Failed to update invoice')
  }

  return updatedInvoice as Invoice
}

// Update invoice sent status
export async function markInvoiceSentViaEmail(
  invoiceId: string,
  tenantId: string,
  recipient: string
): Promise<void> {
  await supabase
    .from('invoices')
    .update({
      sent_via_email_at: new Date().toISOString(),
      email_recipient: recipient,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
}

export async function markInvoiceSentViaWhatsApp(
  invoiceId: string,
  tenantId: string
): Promise<void> {
  await supabase
    .from('invoices')
    .update({
      sent_via_whatsapp_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
}
