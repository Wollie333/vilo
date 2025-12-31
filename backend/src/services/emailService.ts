import { Resend } from 'resend'

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY
let resend: Resend | null = null

if (resendApiKey) {
  resend = new Resend(resendApiKey)
} else {
  console.warn('⚠️  RESEND_API_KEY not set. Email sending will be disabled.')
}

// Email template for invoice
function getInvoiceEmailHtml(
  invoiceNumber: string,
  customerName: string,
  businessName: string,
  totalAmount: string,
  bookingReference: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #1a1a1a; margin: 0 0 10px 0; font-size: 24px;">Invoice ${invoiceNumber}</h1>
    <p style="color: #666; margin: 0;">From ${businessName}</p>
  </div>

  <div style="padding: 20px 0;">
    <p>Dear ${customerName},</p>

    <p>Please find attached your invoice for booking reference <strong>${bookingReference}</strong>.</p>

    <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #166534;">
        <strong>Amount Paid:</strong> ${totalAmount}
      </p>
    </div>

    <p>Thank you for choosing ${businessName}. We look forward to hosting you!</p>

    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      If you have any questions about this invoice, please don't hesitate to contact us.
    </p>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #666; font-size: 12px;">
    <p style="margin: 0;">This is an automated email from ${businessName}.</p>
  </div>
</body>
</html>
`
}

// Send invoice email with PDF attachment
export async function sendInvoiceEmail(
  to: string,
  invoiceNumber: string,
  pdfBuffer: Buffer,
  businessName: string,
  customerName: string,
  totalAmount: string,
  bookingReference: string,
  fromEmail?: string
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error('Resend not initialized - RESEND_API_KEY not set')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    // Use custom from email or Resend's test domain
    // For production, verify your domain at https://resend.com/domains
    const from = fromEmail || `${businessName} <onboarding@resend.dev>`

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: `Invoice ${invoiceNumber} - ${businessName}`,
      html: getInvoiceEmailHtml(
        invoiceNumber,
        customerName,
        businessName,
        totalAmount,
        bookingReference
      ),
      attachments: [
        {
          filename: `${invoiceNumber}.pdf`,
          content: pdfBuffer.toString('base64')
        }
      ]
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    console.log('Invoice email sent successfully:', data?.id)
    return { success: true }
  } catch (error: any) {
    console.error('Error sending invoice email:', error)
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

// Generate WhatsApp share URL
export function getWhatsAppShareUrl(
  phoneNumber: string,
  invoiceNumber: string,
  pdfUrl: string,
  businessName: string,
  totalAmount: string
): string {
  // Clean phone number: remove spaces, dashes, parentheses
  let cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '')

  // Handle South African numbers
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '27' + cleanPhone.slice(1)
  }

  // Remove + if present (wa.me doesn't need it)
  cleanPhone = cleanPhone.replace(/^\+/, '')

  // Compose message
  const message = [
    `Hello! Here is your invoice from ${businessName}.`,
    '',
    `Invoice Number: ${invoiceNumber}`,
    `Amount: ${totalAmount}`,
    '',
    `Download your invoice: ${pdfUrl}`,
    '',
    'Thank you for your booking!'
  ].join('\n')

  const encodedMessage = encodeURIComponent(message)

  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`
}
