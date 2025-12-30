interface LoadingSkeletonProps {
  variant?: 'text' | 'card' | 'avatar' | 'button' | 'image'
  width?: string | number
  height?: string | number
  className?: string
  count?: number
}

export default function LoadingSkeleton({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1,
}: LoadingSkeletonProps) {
  const getStyles = () => {
    switch (variant) {
      case 'card':
        return {
          width: width || '100%',
          height: height || '200px',
          borderRadius: '8px',
        }
      case 'avatar':
        return {
          width: width || '40px',
          height: height || '40px',
          borderRadius: '50%',
        }
      case 'button':
        return {
          width: width || '100px',
          height: height || '40px',
          borderRadius: '6px',
        }
      case 'image':
        return {
          width: width || '100%',
          height: height || '150px',
          borderRadius: '8px',
        }
      default:
        return {
          width: width || '100%',
          height: height || '16px',
          borderRadius: '4px',
        }
    }
  }

  const styles = getStyles()

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse ${className}`}
          style={{
            ...styles,
            backgroundColor: 'var(--bg-tertiary)',
            marginBottom: count > 1 && i < count - 1 ? '8px' : 0,
          }}
        />
      ))}
    </>
  )
}

// Pre-built skeleton layouts for common use cases
export function PageCardSkeleton() {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      <div className="flex items-center gap-4">
        <LoadingSkeleton variant="avatar" width={48} height={48} />
        <div className="flex-1">
          <LoadingSkeleton variant="text" width="60%" className="mb-2" />
          <LoadingSkeleton variant="text" width="40%" height={12} />
        </div>
      </div>
    </div>
  )
}

export function MediaGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingSkeleton key={i} variant="image" height={120} />
      ))}
    </div>
  )
}

export function BlogPostSkeleton() {
  return (
    <div className="space-y-4">
      <LoadingSkeleton variant="text" width="80%" height={24} />
      <LoadingSkeleton variant="text" count={3} />
      <LoadingSkeleton variant="image" height={200} />
      <LoadingSkeleton variant="text" count={5} />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <LoadingSkeleton variant="text" width="20%" />
          <LoadingSkeleton variant="text" width="30%" />
          <LoadingSkeleton variant="text" width="25%" />
          <LoadingSkeleton variant="text" width="15%" />
        </div>
      ))}
    </div>
  )
}
