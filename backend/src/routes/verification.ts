import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'
import crypto from 'crypto'

const router = Router()

// Document types
const DOCUMENT_TYPES = ['profile_id', 'business_registration', 'photo_verification', 'vat_certificate'] as const
type DocumentType = typeof DOCUMENT_TYPES[number]

// Helper to get tenant from auth token
async function getTenantFromToken(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', tenant: null }
  }

  const token = authHeader.split(' ')[1]
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return { error: 'Invalid token', tenant: null }
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, verification_user_status, verification_business_status, verification_submitted_at')
    .eq('owner_user_id', user.id)
    .single()

  if (tenantError || !tenant) {
    return { error: 'Tenant not found', tenant: null }
  }

  return { error: null, tenant, user }
}

// Generate unique verification code
function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excluded confusing chars like 0, O, 1, I
  let code = 'VILO-'
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// GET /api/verification/status - Get verification status and all documents
router.get('/status', async (req: Request, res: Response) => {
  const result = await getTenantFromToken(req.headers.authorization)
  if (result.error) {
    return res.status(401).json({ error: result.error })
  }

  try {
    // Get all documents for this tenant
    const { data: documents, error: docError } = await supabase
      .from('verification_documents')
      .select('id, document_type, file_name, file_size, mime_type, status, rejection_reason, submitted_at, verification_code')
      .eq('tenant_id', result.tenant!.id)
      .order('document_type')

    if (docError) {
      console.error('Error fetching documents:', docError)
      return res.status(500).json({ error: 'Failed to fetch verification documents' })
    }

    // Get active verification code
    const { data: activeCode } = await supabase
      .from('verification_codes')
      .select('code, expires_at')
      .eq('tenant_id', result.tenant!.id)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Organize documents by type
    const docsByType: Record<string, any> = {}
    for (const doc of documents || []) {
      docsByType[doc.document_type] = {
        id: doc.id,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        mimeType: doc.mime_type,
        status: doc.status,
        rejectionReason: doc.rejection_reason,
        submittedAt: doc.submitted_at,
        verificationCode: doc.verification_code
      }
    }

    // Calculate badge eligibility
    const profileIdApproved = docsByType.profile_id?.status === 'approved'
    const photoVerificationApproved = docsByType.photo_verification?.status === 'approved'
    const businessRegistrationApproved = docsByType.business_registration?.status === 'approved'
    const vatCertificateApproved = docsByType.vat_certificate?.status === 'approved'

    res.json({
      userVerificationStatus: result.tenant!.verification_user_status || 'none',
      businessVerificationStatus: result.tenant!.verification_business_status || 'none',
      submittedAt: result.tenant!.verification_submitted_at,
      documents: {
        profile_id: docsByType.profile_id || null,
        photo_verification: docsByType.photo_verification || null,
        business_registration: docsByType.business_registration || null,
        vat_certificate: docsByType.vat_certificate || null
      },
      activeVerificationCode: activeCode ? {
        code: activeCode.code,
        expiresAt: activeCode.expires_at
      } : null,
      badges: {
        verifiedUser: profileIdApproved && photoVerificationApproved,
        verifiedBusiness: businessRegistrationApproved && vatCertificateApproved
      }
    })
  } catch (error) {
    console.error('Error in GET /verification/status:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/verification/code - Generate a new verification code
router.post('/code', async (req: Request, res: Response) => {
  const result = await getTenantFromToken(req.headers.authorization)
  if (result.error) {
    return res.status(401).json({ error: result.error })
  }

  try {
    // Check if there's already an active code
    const { data: existingCode } = await supabase
      .from('verification_codes')
      .select('code, expires_at')
      .eq('tenant_id', result.tenant!.id)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingCode) {
      return res.json({
        code: existingCode.code,
        expiresAt: existingCode.expires_at,
        isExisting: true
      })
    }

    // Generate new code
    const code = generateVerificationCode()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

    const { error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        tenant_id: result.tenant!.id,
        code,
        expires_at: expiresAt.toISOString()
      })

    if (insertError) {
      console.error('Error creating verification code:', insertError)
      return res.status(500).json({ error: 'Failed to generate verification code' })
    }

    res.json({
      code,
      expiresAt: expiresAt.toISOString(),
      isExisting: false
    })
  } catch (error) {
    console.error('Error in POST /verification/code:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/verification/documents/:type - Upload a verification document
router.post('/documents/:type', async (req: Request, res: Response) => {
  const { type } = req.params
  const { image, verificationCode } = req.body

  // Validate document type
  if (!DOCUMENT_TYPES.includes(type as DocumentType)) {
    return res.status(400).json({ error: 'Invalid document type' })
  }

  if (!image) {
    return res.status(400).json({ error: 'Image data is required' })
  }

  // Photo verification requires a verification code
  if (type === 'photo_verification' && !verificationCode) {
    return res.status(400).json({ error: 'Verification code is required for photo verification' })
  }

  const result = await getTenantFromToken(req.headers.authorization)
  if (result.error) {
    return res.status(401).json({ error: result.error })
  }

  try {
    // Check if document already exists (can only submit once unless rejected)
    const { data: existingDoc } = await supabase
      .from('verification_documents')
      .select('id, status')
      .eq('tenant_id', result.tenant!.id)
      .eq('document_type', type)
      .single()

    if (existingDoc && existingDoc.status !== 'rejected') {
      return res.status(400).json({
        error: 'Document already submitted. You cannot modify a pending or approved document.'
      })
    }

    // For photo verification, validate the code
    if (type === 'photo_verification') {
      const { data: codeRecord, error: codeError } = await supabase
        .from('verification_codes')
        .select('id, code, expires_at')
        .eq('tenant_id', result.tenant!.id)
        .eq('code', verificationCode)
        .is('used_at', null)
        .single()

      if (codeError || !codeRecord) {
        return res.status(400).json({ error: 'Invalid or expired verification code' })
      }

      if (new Date(codeRecord.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Verification code has expired. Please generate a new one.' })
      }

      // Mark code as used
      await supabase
        .from('verification_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', codeRecord.id)
    }

    // Parse base64 image
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid image format. Expected base64 data URL.' })
    }

    const mimeType = matches[1]
    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, 'base64')

    // Validate file size (max 10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds 10MB limit' })
    }

    // Validate mime type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, PDF' })
    }

    // Determine file extension
    const extMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'application/pdf': 'pdf'
    }
    const ext = extMap[mimeType] || 'jpg'
    const fileName = `${type}_${Date.now()}.${ext}`
    const filePath = `${result.tenant!.id}/${fileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('verification-documents')
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading document:', uploadError)
      return res.status(500).json({ error: 'Failed to upload document' })
    }

    // Get the file URL (signed URL for private bucket)
    const { data: urlData } = await supabase.storage
      .from('verification-documents')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365) // 1 year expiry for storage reference

    const fileUrl = urlData?.signedUrl || ''

    // Delete existing document if resubmitting after rejection
    if (existingDoc) {
      await supabase
        .from('verification_documents')
        .delete()
        .eq('id', existingDoc.id)
    }

    // Insert document record
    const { data: document, error: insertError } = await supabase
      .from('verification_documents')
      .insert({
        tenant_id: result.tenant!.id,
        document_type: type,
        file_url: fileUrl,
        file_path: filePath,
        file_name: fileName,
        file_size: buffer.length,
        mime_type: mimeType,
        verification_code: type === 'photo_verification' ? verificationCode : null,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error saving document record:', insertError)
      return res.status(500).json({ error: 'Failed to save document record' })
    }

    // Update tenant verification status
    await updateTenantVerificationStatus(result.tenant!.id)

    res.json({
      success: true,
      document: {
        id: document.id,
        documentType: document.document_type,
        fileName: document.file_name,
        status: document.status,
        submittedAt: document.submitted_at
      }
    })
  } catch (error) {
    console.error('Error in POST /verification/documents/:type:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/verification/documents/:id/url - Get signed URL for viewing a document
router.get('/documents/:id/url', async (req: Request, res: Response) => {
  const { id } = req.params

  const result = await getTenantFromToken(req.headers.authorization)
  if (result.error) {
    return res.status(401).json({ error: result.error })
  }

  try {
    // Get document and verify ownership
    const { data: document, error: docError } = await supabase
      .from('verification_documents')
      .select('file_path, tenant_id')
      .eq('id', id)
      .single()

    if (docError || !document) {
      return res.status(404).json({ error: 'Document not found' })
    }

    if (document.tenant_id !== result.tenant!.id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Generate signed URL (valid for 1 hour)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('verification-documents')
      .createSignedUrl(document.file_path, 60 * 60)

    if (urlError || !urlData) {
      console.error('Error creating signed URL:', urlError)
      return res.status(500).json({ error: 'Failed to generate document URL' })
    }

    res.json({ url: urlData.signedUrl })
  } catch (error) {
    console.error('Error in GET /verification/documents/:id/url:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Helper function to update tenant verification status based on documents
async function updateTenantVerificationStatus(tenantId: string) {
  // Get all documents for this tenant
  const { data: documents } = await supabase
    .from('verification_documents')
    .select('document_type, status')
    .eq('tenant_id', tenantId)

  if (!documents) return

  const docStatus: Record<string, string> = {}
  for (const doc of documents) {
    docStatus[doc.document_type] = doc.status
  }

  // Calculate user verification status
  let userStatus = 'none'
  const hasProfileId = docStatus.profile_id
  const hasPhotoVerification = docStatus.photo_verification

  if (hasProfileId === 'approved' && hasPhotoVerification === 'approved') {
    userStatus = 'verified'
  } else if (hasProfileId === 'rejected' || hasPhotoVerification === 'rejected') {
    userStatus = 'rejected'
  } else if (hasProfileId || hasPhotoVerification) {
    userStatus = 'pending'
  }

  // Calculate business verification status
  let businessStatus = 'none'
  const hasBusinessReg = docStatus.business_registration
  const hasVatCert = docStatus.vat_certificate

  if (hasBusinessReg === 'approved' && hasVatCert === 'approved') {
    businessStatus = 'verified'
  } else if (hasBusinessReg === 'rejected' || hasVatCert === 'rejected') {
    businessStatus = 'rejected'
  } else if (hasBusinessReg || hasVatCert) {
    businessStatus = 'pending'
  }

  // Update tenant
  await supabase
    .from('tenants')
    .update({
      verification_user_status: userStatus,
      verification_business_status: businessStatus,
      verification_submitted_at: documents.length > 0 ? new Date().toISOString() : null
    })
    .eq('id', tenantId)
}

export default router
