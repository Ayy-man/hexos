import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "focus-visible:border-accent-border focus-visible:ring-control-ring aria-invalid:ring-signal-bad/20 aria-invalid:border-signal-bad rounded-md border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none",
  {
    variants: {
      variant: {
        default: "bg-accent-dim text-accent border border-accent-border hover:bg-accent-dim/80",
        outline: "border-border-rule bg-transparent hover:bg-bg-hover text-text-secondary hover:text-text-primary aria-expanded:bg-bg-hover aria-expanded:text-text-primary",
        secondary: "bg-bg-hover text-text-secondary hover:bg-bg-elevated hover:text-text-primary aria-expanded:bg-bg-elevated aria-expanded:text-text-primary",
        ghost: "hover:bg-bg-hover text-text-secondary hover:text-text-primary aria-expanded:bg-bg-hover aria-expanded:text-text-primary",
        destructive: "bg-signal-bad-dim text-signal-bad border border-signal-bad/25 hover:bg-signal-bad-dim/80 focus-visible:ring-signal-bad/20",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
        lg: "h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9 md:size-9 max-md:!size-11 [&_svg]:size-5",
        "icon-xs": "size-6 rounded-[min(var(--radius-md),8px)] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3 max-md:!size-9 max-md:[&_svg]:size-4",
        "icon-sm": "size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md max-md:!size-11 max-md:[&_svg]:size-5",
        "icon-lg": "size-10 max-md:!size-11 max-md:[&_svg]:size-5",
        "icon-touch": "size-11 md:size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
