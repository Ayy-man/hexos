import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "h-5 gap-1 rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium transition-all has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3! inline-flex items-center justify-center w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-accent-border focus-visible:ring-control-ring focus-visible:ring-[3px] aria-invalid:ring-signal-bad/20 aria-invalid:border-signal-bad transition-colors overflow-hidden group/badge",
  {
    variants: {
      variant: {
        default: "bg-accent-dim text-accent border border-accent-border [a]:hover:bg-accent-dim/80",
        secondary: "bg-bg-hover text-text-secondary [a]:hover:bg-bg-elevated",
        destructive: "bg-signal-bad-dim text-signal-bad",
        outline: "border-border-rule text-text-secondary [a]:hover:bg-bg-hover [a]:hover:text-text-primary",
        ghost: "hover:bg-bg-hover text-text-tertiary hover:text-text-secondary",
        link: "text-accent underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
