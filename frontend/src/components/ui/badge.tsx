import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:ring-offset-1",
  {
    variants: {
      variant: {
        default: "bg-zinc-900 text-white",
        secondary: "bg-zinc-100 text-zinc-800",
        destructive: "bg-red-100 text-red-800",
        success: "bg-pine-100 text-pine-700",
        warning: "bg-amber-100 text-amber-800",
        outline: "border border-zinc-200 text-zinc-700",
        ghost: "text-zinc-600 hover:bg-zinc-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
