/**
 * Progress bar component.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  variant?: "default" | "green" | "red"
  height?: "sm" | "md" | "lg"
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, variant = 'default', height = 'md', ...props }, ref) => {
    const percentage = max === 0 ? 0 : Math.min(Math.max((value / max) * 100, 0), 100)
    const fillColor = variant === 'green' ? 'bg-green-600' :
                      variant === 'red' ? 'bg-red-600' :
                      'bg-blue-600'
    const heightClass = height === 'sm' ? 'h-1.5' :
                        height === 'lg' ? 'h-4' :
                        'h-2'

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={cn(
          `relative ${heightClass} w-full overflow-hidden rounded-full bg-slate-200`,
          className
        )}
        {...props}
      >
        <div
          className={`h-full ${fillColor} transition-all duration-300 ease-in-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }
)

Progress.displayName = "Progress"

export { Progress }
