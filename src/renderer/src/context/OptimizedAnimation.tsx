import { usePerformanceMode } from '../hooks/usePerformanceMode'

export function OptimizedAnimation({ children }: { children: React.ReactNode }) {
  const mode = usePerformanceMode()

  return (
    <div className={`performance-mode-${mode}`}>
      {children}
      <style>{`
        .performance-mode-background * {
          animation-duration: 0.01s !important;
          transition-duration: 0.01s !important;
        }
        
        .performance-mode-hidden {
          display: none !important;
        }
        
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01s !important;
            transition-duration: 0.01s !important;
          }
        }
      `}</style>
    </div>
  )
}
