import { Router, Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// Middleware to get tenant ID from token
const getTenantFromToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.substring(7)

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Get tenant ID from user metadata or users table
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!userData?.tenant_id) {
      return res.status(403).json({ error: 'No tenant associated with user' })
    }

    req.tenantId = userData.tenant_id
    next()
  } catch (err) {
    return res.status(500).json({ error: 'Authentication failed' })
  }
}

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
    ]
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'))
    }
  },
})

// Get all media files
router.get('/', getTenantFromToken, async (req: Request, res: Response) => {
  try {
    const { folder } = req.query

    let query = supabase
      .from('media_library')
      .select('*')
      .eq('tenant_id', req.tenantId!)
      .order('created_at', { ascending: false })

    if (folder && folder !== 'all') {
      query = query.eq('folder', folder)
    }

    const { data, error } = await query

    if (error) throw error
    res.json(data)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Upload media file
router.post('/upload', getTenantFromToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { folder = 'general', altText = '' } = req.body
    const file = req.file
    const fileExt = file.originalname.split('.').pop()
    const fileName = `${uuidv4()}.${fileExt}`
    const filePath = `${req.tenantId}/${folder}/${fileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath)

    // Get image dimensions if it's an image
    let width: number | null = null
    let height: number | null = null

    // TODO: Add image dimension detection with sharp or similar

    // Save to database
    const { data, error } = await supabase
      .from('media_library')
      .insert({
        tenant_id: req.tenantId,
        filename: fileName,
        original_filename: file.originalname,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.mimetype,
        width,
        height,
        alt_text: altText,
        folder,
      })
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Update media file (alt text, folder)
router.put('/:id', getTenantFromToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { alt_text, folder } = req.body

    const updateData: any = {}
    if (alt_text !== undefined) updateData.alt_text = alt_text
    if (folder !== undefined) updateData.folder = folder

    const { data, error } = await supabase
      .from('media_library')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', req.tenantId!)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Delete media file
router.delete('/:id', getTenantFromToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Get file info first
    const { data: file, error: fetchError } = await supabase
      .from('media_library')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', req.tenantId!)
      .single()

    if (fetchError || !file) {
      return res.status(404).json({ error: 'File not found' })
    }

    // Delete from storage
    const filePath = `${req.tenantId}/${file.folder}/${file.filename}`
    await supabase.storage.from('media').remove([filePath])

    // Delete from database
    const { error } = await supabase
      .from('media_library')
      .delete()
      .eq('id', id)
      .eq('tenant_id', req.tenantId!)

    if (error) throw error
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get folders
router.get('/folders', getTenantFromToken, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('media_library')
      .select('folder')
      .eq('tenant_id', req.tenantId!)

    if (error) throw error

    // Get unique folders with counts
    const folderCounts: Record<string, number> = {}
    data.forEach((item) => {
      const folder = item.folder || 'general'
      folderCounts[folder] = (folderCounts[folder] || 0) + 1
    })

    const folders = Object.entries(folderCounts).map(([name, count]) => ({
      name,
      count,
    }))

    res.json(folders)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      tenantId?: string
    }
  }
}

export default router
