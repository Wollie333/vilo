import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Search,
  Loader2,
  FileText,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Clock,
  LayoutGrid,
  List
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  blogPostsApi,
  blogCategoriesApi,
  BlogPost,
  BlogCategory,
  setWebsiteTenantId,
  setWebsiteAccessToken
} from '../../services/websiteApi'

export default function BlogManager() {
  const navigate = useNavigate()
  const { tenant, session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; postId: string | null }>({
    isOpen: false,
    postId: null
  })

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
        setLoading(true)
        const [postsData, categoriesData] = await Promise.all([
          blogPostsApi.getAll({
            status: statusFilter !== 'all' ? statusFilter : undefined,
            category_id: categoryFilter !== 'all' ? categoryFilter : undefined,
            search: searchQuery || undefined
          }),
          blogCategoriesApi.getAll()
        ])

        setPosts(postsData)
        setCategories(categoriesData)
      } catch (error) {
        console.error('Failed to load blog data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [tenant?.id, statusFilter, categoryFilter, searchQuery])

  // Delete post
  const handleDelete = async (postId: string) => {
    try {
      setDeletingId(postId)
      await blogPostsApi.delete(postId)
      setPosts(posts.filter(p => p.id !== postId))
      setConfirmDelete({ isOpen: false, postId: null })
    } catch (error) {
      console.error('Failed to delete post:', error)
    } finally {
      setDeletingId(null)
    }
  }

  // Format date
  const formatDate = (date: string | null) => {
    if (!date) return 'Not published'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/website')}
            style={{ color: 'var(--text-secondary)' }}
            className="p-2 rounded-lg hover:opacity-80 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <FileText size={24} style={{ color: 'var(--text-primary)' }} />
            <div>
              <h1 style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold">
                Blog Posts
              </h1>
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                Create and manage your blog content
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/dashboard/website/blog/new')}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={18} />
          New Post
        </button>
      </div>

      {/* Filters */}
      <div
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        className="rounded-lg border p-4 mb-6"
      >
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search
              size={18}
              style={{ color: 'var(--text-muted)' }}
              className="absolute left-3 top-1/2 -translate-y-1/2"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
              className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            className="px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            className="px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* View Mode */}
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                backgroundColor: viewMode === 'grid' ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
              className="px-3 py-2 transition-colors"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                backgroundColor: viewMode === 'list' ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
              className="px-3 py-2 transition-colors"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Posts Grid/List */}
      {posts.length === 0 ? (
        <div
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          className="rounded-lg border p-12 text-center"
        >
          <FileText size={48} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-4" />
          <h3 style={{ color: 'var(--text-primary)' }} className="text-lg font-medium mb-2">
            No blog posts yet
          </h3>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-4">
            Create your first blog post to get started
          </p>
          <button
            onClick={() => navigate('/dashboard/website/blog/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={18} />
            Create Post
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div
              key={post.id}
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              className="rounded-lg border overflow-hidden group"
            >
              {/* Image */}
              <div
                style={{ backgroundColor: 'var(--bg-secondary)' }}
                className="aspect-video relative"
              >
                {post.featured_image_url ? (
                  <img
                    src={post.featured_image_url}
                    alt={post.featured_image_alt || post.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <FileText size={32} style={{ color: 'var(--text-muted)' }} />
                  </div>
                )}
                {/* Status Badge */}
                <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(post.status)}`}>
                  {post.status}
                </span>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 style={{ color: 'var(--text-primary)' }} className="font-medium line-clamp-2 mb-2">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p style={{ color: 'var(--text-muted)' }} className="text-sm line-clamp-2 mb-3">
                    {post.excerpt}
                  </p>
                )}

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(post.published_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {post.reading_time_minutes} min read
                  </span>
                </div>

                {/* Category & Tags */}
                {(post.category || post.tags?.length > 0) && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {post.category && (
                      <span
                        className="px-2 py-0.5 rounded text-xs"
                        style={{ backgroundColor: post.category.color + '20', color: post.category.color }}
                      >
                        {post.category.name}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <button
                    onClick={() => navigate(`/dashboard/website/blog/${post.id}/edit`)}
                    style={{ color: 'var(--text-secondary)' }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded hover:opacity-80 transition-colors"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ isOpen: true, postId: post.id })}
                    className="flex items-center gap-1 px-3 py-1.5 rounded text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                  {post.status === 'published' && (
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--text-secondary)' }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded hover:opacity-80 transition-colors ml-auto"
                    >
                      <Eye size={14} />
                      View
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          className="rounded-lg border divide-y"
        >
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center gap-4 p-4 hover:bg-opacity-50 transition-colors"
              style={{ borderColor: 'var(--border-color)' }}
            >
              {/* Image */}
              <div
                style={{ backgroundColor: 'var(--bg-secondary)' }}
                className="w-20 h-20 rounded-lg flex-shrink-0 overflow-hidden"
              >
                {post.featured_image_url ? (
                  <img
                    src={post.featured_image_url}
                    alt={post.featured_image_alt || post.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <FileText size={24} style={{ color: 'var(--text-muted)' }} />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 style={{ color: 'var(--text-primary)' }} className="font-medium truncate">
                    {post.title}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${getStatusColor(post.status)}`}>
                    {post.status}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm truncate mb-2">
                  {post.excerpt || 'No excerpt'}
                </p>
                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(post.published_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {post.reading_time_minutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye size={12} />
                    {post.view_count} views
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/dashboard/website/blog/${post.id}/edit`)}
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  className="p-2 rounded-lg hover:opacity-80 transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => setConfirmDelete({ isOpen: true, postId: post.id })}
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            style={{ backgroundColor: 'var(--bg-card)' }}
            className="rounded-lg p-6 max-w-md w-full mx-4"
          >
            <h3 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-2">
              Delete Post
            </h3>
            <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-6">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete({ isOpen: false, postId: null })}
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                className="px-4 py-2 border rounded-lg hover:opacity-80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete.postId && handleDelete(confirmDelete.postId)}
                disabled={deletingId !== null}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deletingId === confirmDelete.postId ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
