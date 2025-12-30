import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, ArrowRight, Clock } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useCMSPage } from '../../hooks/useCMSPage'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  featured_image_url: string | null
  author_name: string | null
  reading_time_minutes: number
  published_at: string
  tags: string[]
  category?: {
    id: string
    name: string
    slug: string
    color: string
  }
}

interface BlogCategory {
  id: string
  name: string
  slug: string
  color: string
}

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(true)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    if (rect.top > window.innerHeight) setIsInView(false)

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsInView(true)
    }, { threshold })
    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, isInView }
}

export default function Blog() {
  const { tenant } = useAuth()
  const { templateId, colors, hero } = useCMSPage('blog')
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const tenantId = tenant?.id || ''

  const heroSection = useInView()
  const postsSection = useInView()

  useEffect(() => {
    async function loadData() {
      if (!tenantId) return

      try {
        setLoading(true)
        const [postsResponse, categoriesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/public/${tenantId}/blog`),
          fetch(`${API_BASE_URL}/public/${tenantId}/blog-categories`)
        ])

        if (postsResponse.ok) {
          const postsData = await postsResponse.json()
          setPosts(postsData)
        }

        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          setCategories(categoriesData)
        }
      } catch (error) {
        console.error('Failed to load blog data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [tenantId])

  const filteredPosts = selectedCategory
    ? posts.filter(post => post.category?.slug === selectedCategory)
    : posts

  const featuredPost = filteredPosts[0]
  const otherPosts = filteredPosts.slice(1)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Template 2: Magazine Layout
  if (templateId === 2) {
    return (
      <div className="overflow-x-hidden">
        {/* Hero */}
        <section ref={heroSection.ref} className="py-12 md:py-16" style={{ backgroundColor: colors.primary }}>
          <div className="max-w-7xl mx-auto px-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{hero.title || 'Blog'}</h1>
            <p className="text-white/70">{hero.subtitle || 'Stories, tips, and insights'}</p>
          </div>
        </section>

        {/* Featured Post */}
        {featuredPost && (
          <section className="max-w-7xl mx-auto px-6 -mt-8">
            <Link to={`/blog/${featuredPost.slug}`} className="group block">
              <div className="relative h-80 md:h-[450px] rounded-2xl overflow-hidden shadow-xl">
                {featuredPost.featured_image_url ? (
                  <img src={featuredPost.featured_image_url} alt={featuredPost.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full bg-gray-200" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                  {featuredPost.category && (
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white mb-4" style={{ backgroundColor: featuredPost.category.color || colors.accent }}>
                      {featuredPost.category.name}
                    </span>
                  )}
                  <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">{featuredPost.title}</h2>
                  {featuredPost.excerpt && <p className="text-white/80 text-sm md:text-base mb-4 line-clamp-2">{featuredPost.excerpt}</p>}
                  <div className="flex items-center gap-4 text-white/70 text-sm">
                    <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(featuredPost.published_at)}</span>
                    <span className="flex items-center gap-1"><Clock size={14} /> {featuredPost.reading_time_minutes} min read</span>
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Other Posts Grid */}
        <section ref={postsSection.ref} className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-xl mb-4" />
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : otherPosts.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherPosts.map((post, index) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className={`group transition-all duration-500 ${
                      postsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                    style={{ transitionDelay: `${index * 50}ms` }}
                  >
                    <div className="h-48 rounded-xl overflow-hidden mb-4">
                      {post.featured_image_url ? (
                        <img src={post.featured_image_url} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full bg-gray-200" />
                      )}
                    </div>
                    {post.category && (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium mb-2" style={{ backgroundColor: `${post.category.color}20`, color: post.category.color }}>
                        {post.category.name}
                      </span>
                    )}
                    <h3 className="font-semibold text-gray-900 mb-2 group-hover:opacity-80 transition-opacity">{post.title}</h3>
                    <p className="text-sm text-gray-500">{formatDate(post.published_at)}</p>
                  </Link>
                ))}
              </div>
            ) : !featuredPost && (
              <div className="text-center py-16">
                <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Posts Yet</h3>
                <p className="text-gray-600">Check back soon for updates!</p>
              </div>
            )}
          </div>
        </section>
      </div>
    )
  }

  // Template 3: Minimal List
  if (templateId === 3) {
    return (
      <div className="overflow-x-hidden">
        {/* Hero */}
        <section ref={heroSection.ref} className="py-12 md:py-16" style={{ backgroundColor: colors.primary }}>
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{hero.title || 'Blog'}</h1>
            <p className="text-white/70">{hero.subtitle || 'Thoughts and insights'}</p>
          </div>
        </section>

        {/* Posts List */}
        <section ref={postsSection.ref} className="py-16">
          <div className="max-w-3xl mx-auto px-6">
            {loading ? (
              <div className="space-y-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse border-b border-gray-100 pb-8">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredPosts.length > 0 ? (
              <div className="space-y-8">
                {filteredPosts.map((post, index) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className={`block border-b border-gray-100 pb-8 last:border-0 transition-all duration-500 hover:opacity-80 ${
                      postsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                    style={{ transitionDelay: `${index * 50}ms` }}
                  >
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">{post.title}</h2>
                    {post.excerpt && <p className="text-gray-600 text-sm mb-3 line-clamp-2">{post.excerpt}</p>}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{formatDate(post.published_at)}</span>
                      <span>{post.reading_time_minutes} min read</span>
                      {post.category && <span style={{ color: post.category.color }}>{post.category.name}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Posts Yet</h3>
                <p className="text-gray-600">Check back soon!</p>
              </div>
            )}
          </div>
        </section>
      </div>
    )
  }

  // Template 4: Cards Grid
  if (templateId === 4) {
    return (
      <div className="overflow-x-hidden">
        {/* Hero */}
        <section ref={heroSection.ref} className="py-12 md:py-16" style={{ backgroundColor: colors.primary }}>
          <div className="max-w-7xl mx-auto px-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{hero.title || 'Blog'}</h1>
            <p className="text-white/70">{hero.subtitle || 'Latest articles and updates'}</p>
          </div>
        </section>

        {/* Posts Cards */}
        <section ref={postsSection.ref} className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="h-48 bg-gray-200 rounded-t-xl" />
                    <div className="p-5">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPosts.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPosts.map((post, index) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className={`group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-500 ${
                      postsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                    style={{ transitionDelay: `${index * 50}ms` }}
                  >
                    <div className="h-48 overflow-hidden">
                      {post.featured_image_url ? (
                        <img src={post.featured_image_url} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <Calendar size={32} className="text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      {post.category && (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium mb-2" style={{ backgroundColor: `${post.category.color}20`, color: post.category.color }}>
                          {post.category.name}
                        </span>
                      )}
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{post.title}</h3>
                      {post.excerpt && <p className="text-gray-600 text-sm mb-3 line-clamp-2">{post.excerpt}</p>}
                      <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-50">
                        <span>{formatDate(post.published_at)}</span>
                        <span className="flex items-center gap-1" style={{ color: colors.accent }}>
                          Read more <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Posts Yet</h3>
                <p className="text-gray-600">Check back soon for updates!</p>
              </div>
            )}
          </div>
        </section>
      </div>
    )
  }

  // Default: Template 1 - Classic with Sidebar
  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <section ref={heroSection.ref} className="py-12 md:py-16" style={{ backgroundColor: colors.primary }}>
        <div className="max-w-7xl mx-auto px-6">
          <h1 className={`text-3xl md:text-4xl font-bold text-white mb-2 transition-all duration-700 ${heroSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {hero.title || 'Blog'}
          </h1>
          <p className="text-white/70">{hero.subtitle || 'Stories and insights from our team'}</p>
        </div>
      </section>

      {/* Content */}
      <section ref={postsSection.ref} className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Posts */}
            <div className="lg:col-span-2">
              {loading ? (
                <div className="space-y-8">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex gap-6">
                      <div className="w-1/3 h-40 bg-gray-200 rounded-lg" />
                      <div className="flex-1">
                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredPosts.length > 0 ? (
                <div className="space-y-8">
                  {filteredPosts.map((post, index) => (
                    <Link
                      key={post.id}
                      to={`/blog/${post.slug}`}
                      className={`group flex flex-col sm:flex-row gap-6 transition-all duration-500 ${
                        postsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                      }`}
                      style={{ transitionDelay: `${index * 50}ms` }}
                    >
                      <div className="sm:w-1/3 h-40 rounded-lg overflow-hidden flex-shrink-0">
                        {post.featured_image_url ? (
                          <img src={post.featured_image_url} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <Calendar size={32} className="text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        {post.category && (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium mb-2" style={{ backgroundColor: `${post.category.color}20`, color: post.category.color }}>
                            {post.category.name}
                          </span>
                        )}
                        <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:opacity-80 transition-opacity">{post.title}</h2>
                        {post.excerpt && <p className="text-gray-600 text-sm mb-3 line-clamp-2">{post.excerpt}</p>}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(post.published_at)}</span>
                          <span className="flex items-center gap-1"><Clock size={14} /> {post.reading_time_minutes} min</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Posts Yet</h3>
                  <p className="text-gray-600">Check back soon!</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {categories.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        !selectedCategory ? 'bg-white shadow-sm font-medium' : 'hover:bg-white/50'
                      }`}
                    >
                      All Posts
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.slug)}
                        className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedCategory === category.slug ? 'bg-white shadow-sm font-medium' : 'hover:bg-white/50'
                        }`}
                      >
                        <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: category.color }} />
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags from posts */}
              {posts.length > 0 && (
                <div className="mt-6 bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Popular Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {[...new Set(posts.flatMap(p => p.tags || []))].slice(0, 10).map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-white rounded-full text-sm text-gray-600 border border-gray-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
