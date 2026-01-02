import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getVerificationStatus,
  generateVerificationCode,
  uploadDocument,
  getDocumentUrl,
  VerificationStatusResponse,
  VerificationCode,
  DocumentType,
  UploadDocumentResponse
} from '../services/verificationApi'

export function useVerification() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<VerificationStatusResponse | null>(null)

  // Fetch verification status
  const fetchStatus = useCallback(async () => {
    if (!session?.access_token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await getVerificationStatus(session.access_token)
      setStatus(data)
    } catch (err) {
      console.error('Error fetching verification status:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch verification status')
    } finally {
      setLoading(false)
    }
  }, [session?.access_token])

  // Generate verification code
  const generateCode = useCallback(async (): Promise<VerificationCode | null> => {
    if (!session?.access_token) return null

    try {
      const code = await generateVerificationCode(session.access_token)
      // Update local state with new code
      setStatus(prev => prev ? {
        ...prev,
        activeVerificationCode: code
      } : null)
      return code
    } catch (err) {
      console.error('Error generating verification code:', err)
      throw err
    }
  }, [session?.access_token])

  // Upload document
  const upload = useCallback(async (
    type: DocumentType,
    imageBase64: string,
    verificationCode?: string
  ): Promise<UploadDocumentResponse> => {
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }

    const result = await uploadDocument(session.access_token, type, imageBase64, verificationCode)

    // Refresh status after upload
    await fetchStatus()

    return result
  }, [session?.access_token, fetchStatus])

  // Get document URL for viewing
  const getUrl = useCallback(async (documentId: string): Promise<string> => {
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }

    return getDocumentUrl(session.access_token, documentId)
  }, [session?.access_token])

  // Initial fetch
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Computed values
  const documents = status?.documents || {
    profile_id: null,
    photo_verification: null,
    business_registration: null,
    vat_certificate: null
  }

  const badges = status?.badges || {
    verifiedUser: false,
    verifiedBusiness: false
  }

  // Calculate section status for sidebar
  const getSectionStatus = useCallback((docType: DocumentType): 'empty' | 'pending' | 'complete' | 'rejected' => {
    const doc = documents[docType]
    if (!doc) return 'empty'
    if (doc.status === 'approved') return 'complete'
    if (doc.status === 'rejected') return 'rejected'
    return 'pending'
  }, [documents])

  // Calculate overall progress
  const userProgress = {
    profileId: getSectionStatus('profile_id'),
    photoVerification: getSectionStatus('photo_verification')
  }

  const businessProgress = {
    businessRegistration: getSectionStatus('business_registration'),
    vatCertificate: getSectionStatus('vat_certificate')
  }

  return {
    loading,
    error,
    status,
    documents,
    badges,
    activeVerificationCode: status?.activeVerificationCode || null,
    userVerificationStatus: status?.userVerificationStatus || 'none',
    businessVerificationStatus: status?.businessVerificationStatus || 'none',
    userProgress,
    businessProgress,
    getSectionStatus,
    refresh: fetchStatus,
    generateCode,
    upload,
    getDocumentUrl: getUrl
  }
}
