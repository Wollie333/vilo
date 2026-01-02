const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

export type DocumentType = 'profile_id' | 'business_registration' | 'photo_verification' | 'vat_certificate'
export type VerificationStatus = 'none' | 'pending' | 'verified' | 'rejected'
export type DocumentStatus = 'pending' | 'approved' | 'rejected'

export interface VerificationDocument {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  status: DocumentStatus
  rejectionReason?: string
  submittedAt: string
  verificationCode?: string
}

export interface VerificationCode {
  code: string
  expiresAt: string
  isExisting?: boolean
}

export interface VerificationStatusResponse {
  userVerificationStatus: VerificationStatus
  businessVerificationStatus: VerificationStatus
  submittedAt: string | null
  documents: {
    profile_id: VerificationDocument | null
    photo_verification: VerificationDocument | null
    business_registration: VerificationDocument | null
    vat_certificate: VerificationDocument | null
  }
  activeVerificationCode: VerificationCode | null
  badges: {
    verifiedUser: boolean
    verifiedBusiness: boolean
  }
}

export interface UploadDocumentResponse {
  success: boolean
  document: {
    id: string
    documentType: DocumentType
    fileName: string
    status: DocumentStatus
    submittedAt: string
  }
}

// Get verification status and all documents
export async function getVerificationStatus(accessToken: string): Promise<VerificationStatusResponse> {
  const response = await fetch(`${API_URL}/verification/status`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch verification status')
  }

  return response.json()
}

// Generate a new verification code for photo verification
export async function generateVerificationCode(accessToken: string): Promise<VerificationCode> {
  const response = await fetch(`${API_URL}/verification/code`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to generate verification code')
  }

  return response.json()
}

// Upload a verification document
export async function uploadDocument(
  accessToken: string,
  type: DocumentType,
  imageBase64: string,
  verificationCode?: string
): Promise<UploadDocumentResponse> {
  const response = await fetch(`${API_URL}/verification/documents/${type}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      image: imageBase64,
      verificationCode
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to upload document')
  }

  return response.json()
}

// Get signed URL for viewing a document
export async function getDocumentUrl(accessToken: string, documentId: string): Promise<string> {
  const response = await fetch(`${API_URL}/verification/documents/${documentId}/url`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get document URL')
  }

  const data = await response.json()
  return data.url
}
