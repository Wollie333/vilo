import { useEffect, useRef, useState } from 'react'

interface UseScrollAnimationOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollAnimationOptions = {}
): [React.RefObject<T>, boolean] {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options
  const ref = useRef<T>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (triggerOnce) {
            observer.unobserve(element)
          }
        } else if (!triggerOnce) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [threshold, rootMargin, triggerOnce])

  return [ref, isVisible]
}

// Simplified hook that just returns className for animation
export function useAnimateOnScroll(
  baseClass: string = '',
  animationClass: string = 'animate-fade-in-up',
  options: UseScrollAnimationOptions = {}
): [React.RefObject<HTMLDivElement>, string] {
  const [ref, isVisible] = useScrollAnimation<HTMLDivElement>(options)
  const className = `${baseClass} ${isVisible ? animationClass : 'opacity-0 translate-y-4'} transition-all duration-700`
  return [ref, className]
}
