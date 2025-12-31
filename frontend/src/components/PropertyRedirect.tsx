import { Navigate, useParams, useLocation } from 'react-router-dom'

/**
 * Redirects old /property/:slug URLs to new /accommodation/:slug URLs
 * This maintains backwards compatibility with any existing links
 */
export default function PropertyRedirect() {
  const { slug } = useParams()
  const location = useLocation()

  // Preserve the path suffix (e.g., /book) and query params
  const pathSuffix = location.pathname.includes('/book') ? '/book' : ''
  const newPath = `/accommodation/${slug}${pathSuffix}${location.search}`

  return <Navigate to={newPath} replace />
}
