import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-10 w-full rounded-md border border-purple-500/20 bg-black/40 px-3 py-2 text-sm text-purple-100 ring-offset-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"

// Stub exports for compatibility (workflows use these)
const SelectTrigger = Select
const SelectValue = ({ children, ...props }: any) => <span {...props}>{children}</span>
const SelectContent = ({ children, ...props }: any) => <>{children}</>
const SelectItem = ({ children, value, ...props }: any) => <option value={value} {...props}>{children}</option>

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
