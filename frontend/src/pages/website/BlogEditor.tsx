import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  Save,
  FileText,
  Image,
  Search,
  Settings,
  Eye,
  X,
  Plus,
  Tag,
  Clock,
  CheckCircle
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  blogPostsApi,
  blogCategoriesApi,
  BlogCategory,
  setWebsiteTenantId,
  setWebsiteAccessToken
} from '../../services/websiteApi'
import SEOFields from '../../components/website/SEOFields'
import BlockEditor from '../../components/website/blocks/BlockEditor'

type Tab = 'content' | 'seo' | 'settings'

export default function BlogEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tenant, session } = useAuth()
  const isEditing = Boolean(id)

  const [activeTab, setActiveTab] = useState<Tab>('content')
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [categories, setCategories] = useState<BlogCategory[]>([])

  // Form state - Content
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [featuredImageUrl, setFeaturedImageUrl] = useState('')
  const [featuredImageAlt, setFeaturedImageAlt] = useState('')

  // Form state - SEO
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [ogImageUrl, setOgImageUrl] = useState('')
  const [canonicalUrl, setCanonicalUrl] = useState('')
  const [noIndex, setNoIndex] = useState(false)

  // Form state - Settings
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')

  // Scheduled publishing
  const [scheduledAt, setScheduledAt] = useState<string>('')
  const [isScheduled, setIsScheduled] = useState(false)

  // Auto-save
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null)

  // Set tenant ID and access token for API
  useEffect(() => {
    if (tenant?.id) {
      setWebsiteTenantId(tenant.id)
    }
    if (session?.access_token) {
      setWebsiteAccessToken(session.access_token)
    }
  }, [tenant?.id, session?.access_token])

  // Load data
  useEffect(() => {
    async function loadData() {
      if (!tenant?.id) return

      try {
        // Load categories
        const categoriesData = await blogCategoriesApi.getAll()
        setCategories(categoriesData)

        // Load post if editing
        if (id) {
          setLoading(true)
          const post = await blogPostsApi.get(id)
          setTitle(post.title)
          setSlug(post.slug)
          setExcerpt(post.excerpt || '')
          setContent(post.content)
          setFeaturedImageUrl(post.featured_image_url || '')
          setFeaturedImageAlt(post.featured_image_alt || '')
          setSeoTitle(post.seo_title || '')
          setSeoDescription(post.seo_description || '')
          setOgImageUrl(post.og_image_url || '')
          setCanonicalUrl(post.canonical_url || '')
          setNoIndex(post.no_index || false)
          setCategoryId(post.category_id)
          setTags(post.tags || [])
          setAuthorName(post.author_name || '')
          setStatus(post.status === 'published' ? 'published' : 'draft')
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        setMessage({ type: 'error', text: 'Failed to load data' })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [tenant?.id, id])

  // Auto-generate slug from title
  useEffect(() => {
    if (!isEditing && title && !slug) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      setSlug(generatedSlug)
    }
  }, [title, isEditing, slug])

  // Add tag
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  // Handle tag input keypress
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
  }

  // Auto-save callback
  const handleAutoSave = useCallback(async (newContent: string) => {
    if (!isEditing || !id) return // Only auto-save for existing posts

    try {
      setAutoSaveStatus('saving')
      await blogPostsApi.update(id, {
        title: title.trim(),
        slug: slug.trim(),
        content: newContent,
        excerpt: excerpt.trim() || null,
        featured_image_url: featuredImageUrl || null,
        featured_image_alt: featuredImageAlt || null,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        og_image_url: ogImageUrl || null,
        canonical_url: canonicalUrl || null,
        no_index: noIndex,
        category_id: categoryId,
        tags,
        author_name: authorName || null,
        status: 'draft', // Always save as draft during auto-save
      })
      setAutoSaveStatus('saved')
      setLastAutoSave(new Date())
    } catch (error) {
      console.error('Auto-save failed:', error)
      setAutoSaveStatus('unsaved')
    }
  }, [id, isEditing, title, slug, excerpt, featuredImageUrl, featuredImageAlt, seoTitle, seoDescription, ogImageUrl, canonicalUrl, noIndex, categoryId, tags, authorName])

  // Save post
  const handleSave = async (publishStatus?: 'draft' | 'published') => {
    const finalStatus = publishStatus || status

    if (!title.trim()) {
      setMessage({ type: 'error', text: 'Title is required' })
      return
    }

    if (!content.trim()) {
      setMessage({ type: 'error', text: 'Content is required' })
      return
    }

    try {
      setSaving(true)
      setMessage(null)

      const postData = {
        title: title.trim(),
        slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        excerpt: excerpt.trim() || null,
        content: content.trim(),
        featured_image_url: featuredImageUrl || null,
        featured_image_alt: featuredImageAlt || null,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        og_image_url: ogImageUrl || null,
        canonical_url: canonicalUrl || null,
        no_index: noIndex,
        category_id: categoryId,
        tags,
        author_name: authorName || null,
        status: finalStatus,
      }

      if (isEditing && id) {
        await blogPostsApi.update(id, postData)
        setMessage({ type: 'success', text: 'Post updated successfully' })
      } else {
        const newPost = await blogPostsApi.create(postData)
        setMessage({ type: 'success', text: 'Post created successfully' })
        // Redirect to edit page
        navigate(`/dashboard/website/blog/${newPost.id}/edit`, { replace: true })
      }

      setStatus(finalStatus)
    } catch (error: any) {
      console.error('Failed to save post:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to save post' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/website/blog')}
            style={{ color: 'var(--text-secondary)' }}
            className="p-2 rounded-lg hover:opacity-80 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <FileText size={24} style={{ color: 'var(--text-primary)' }} />
            <h1 style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold">
              {isEditing ? 'Edit Post' : 'New Post'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status === 'published' && (
            <a
              href={`/blog/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:opacity-80 transition-colors"
            >
              <Eye size={16} />
              View Post
            </a>
          )}
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:opacity-80 disabled:opacity-50 transition-colors"
          >
            {saving && status === 'draft' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Draft
          </button>
          <button
            onClick={() => handleSave('published')}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving && status === 'published' ? <Loader2 size={16} className="animate-spin" /> : null}
            {status === 'published' ? 'Update' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
        {[
          { id: 'content', name: 'Content', icon: FileText },
          { id: 'seo', name: 'SEO', icon: Search },
          { id: 'settings', name: 'Settings', icon: Settings },
        ].map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderColor: isActive ? 'var(--text-primary)' : 'transparent',
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive ? '' : 'hover:opacity-80'
              }`}
            >
              <Icon size={16} />
              {tab.name}
            </button>
          )
        })}
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          className="rounded-lg border p-6 space-y-6"
        >
          {/* Title */}
          <div>
            <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium block mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title..."
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
              className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg"
            />
          </div>

          {/* Slug */}
          <div>
            <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium block mb-1">
              URL Slug
            </label>
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--text-muted)' }} className="text-sm">/blog/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="post-url-slug"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
                className="flex-1 px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium block mb-1">
              Excerpt
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief summary of the post (shown in listings)..."
              rows={2}
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
              className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
                Content *
              </label>
              {/* Auto-save status */}
              {isEditing && (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {autoSaveStatus === 'saving' && (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  )}
                  {autoSaveStatus === 'saved' && lastAutoSave && (
                    <>
                      <CheckCircle size={12} className="text-green-500" />
                      <span>Auto-saved at {lastAutoSave.toLocaleTimeString()}</span>
                    </>
                  )}
                  {autoSaveStatus === 'unsaved' && (
                    <span className="text-amber-500">Unsaved changes</span>
                  )}
                </div>
              )}
            </div>
            <BlockEditor
              content={content}
              onChange={setContent}
              placeholder="Start writing your post..."
              onAutoSave={isEditing ? handleAutoSave : undefined}
              autoSaveInterval={30000} // 30 seconds
            />
          </div>

          {/* Featured Image */}
          <div>
            <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium flex items-center gap-2 mb-1">
              <Image size={14} />
              Featured Image
            </label>
            <input
              type="text"
              value={featuredImageUrl}
              onChange={(e) => setFeaturedImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
              className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            {featuredImageUrl && (
              <>
                <input
                  type="text"
                  value={featuredImageAlt}
                  onChange={(e) => setFeaturedImageAlt(e.target.value)}
                  placeholder="Image alt text"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                  className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors mt-2"
                />
                <div className="mt-2 rounded-lg overflow-hidden border max-w-md" style={{ borderColor: 'var(--border-color)' }}>
                  <img
                    src={featuredImageUrl}
                    alt={featuredImageAlt || 'Preview'}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* SEO Tab */}
      {activeTab === 'seo' && (
        <div
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          className="rounded-lg border p-6"
        >
          <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-2">
            SEO Settings
          </h2>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-6">
            Optimize this post for search engines. These settings control how your post appears in search results and when shared on social media.
          </p>

          <SEOFields
            title={seoTitle}
            setTitle={setSeoTitle}
            description={seoDescription}
            setDescription={setSeoDescription}
            ogImage={ogImageUrl || featuredImageUrl}
            setOgImage={setOgImageUrl}
            canonicalUrl={canonicalUrl}
            setCanonicalUrl={setCanonicalUrl}
            noIndex={noIndex}
            setNoIndex={setNoIndex}
            showPreview={true}
            siteName={tenant?.business_name || 'Your Website'}
          />

          {/* Keywords from Tags */}
          {tags.length > 0 && (
            <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                <strong>Keywords from tags:</strong> {tags.join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          className="rounded-lg border p-6 space-y-6"
        >
          {/* Category */}
          <div>
            <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium block mb-1">
              Category
            </label>
            <select
              value={categoryId || ''}
              onChange={(e) => setCategoryId(e.target.value || null)}
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
              className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium flex items-center gap-2 mb-1">
              <Tag size={14} />
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:opacity-70"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyPress}
                placeholder="Add a tag..."
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
                className="flex-1 px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={addTag}
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                className="px-3 py-2 rounded-lg hover:opacity-80 transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-1">
              Press Enter or comma to add a tag
            </p>
          </div>

          {/* Author */}
          <div>
            <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium block mb-1">
              Author Name
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Enter author name..."
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
              className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Status */}
          <div>
            <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium block mb-1">
              Status
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={status === 'draft'}
                  onChange={() => setStatus('draft')}
                  className="w-4 h-4"
                />
                <span style={{ color: 'var(--text-primary)' }} className="text-sm">Draft</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={status === 'published'}
                  onChange={() => setStatus('published')}
                  className="w-4 h-4"
                />
                <span style={{ color: 'var(--text-primary)' }} className="text-sm">Published</span>
              </label>
            </div>
          </div>

          {/* Scheduled Publishing */}
          <div>
            <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium flex items-center gap-2 mb-2">
              <Clock size={14} />
              Schedule Publishing
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => {
                    setIsScheduled(e.target.checked)
                    if (!e.target.checked) {
                      setScheduledAt('')
                    }
                  }}
                  className="w-4 h-4 rounded"
                />
                <span style={{ color: 'var(--text-primary)' }} className="text-sm">Schedule for later</span>
              </label>
              {isScheduled && (
                <div>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                    className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-1">
                    Post will be automatically published at this date and time
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
