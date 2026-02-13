import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "bg-control-bg border-control-border focus-visible:border-control-border-focus focus-visible:ring-[3px] focus-visible:ring-control-ring aria-invalid:ring-signal-bad/20 aria-invalid:border-signal-bad h-9 rounded-md border px-2.5 py-1 text-base text-text-primary transition-[color,box-shadow] hover:border-control-border-hover file:h-7 file:text-sm file:font-medium md:text-sm file:text-text-primary placeholder:text-control-placeholder w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-control-disabled-bg disabled:text-control-disabled-text",
        className
      )}
      {...props}
    />
  )
}

export { Input }
