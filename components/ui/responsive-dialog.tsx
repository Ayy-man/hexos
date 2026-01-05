"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface ResponsiveDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function ResponsiveDialog({ children, ...props }: ResponsiveDialogProps) {
  const isMobile = useIsMobile()
  const Component = isMobile ? Sheet : Dialog
  return <Component {...props}>{children}</Component>
}

function ResponsiveDialogTrigger({
  children,
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const isMobile = useIsMobile()
  const Component = isMobile ? SheetTrigger : DialogTrigger
  return <Component {...props}>{children}</Component>
}

function ResponsiveDialogClose({
  children,
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  const isMobile = useIsMobile()
  const Component = isMobile ? SheetClose : DialogClose
  return <Component {...props}>{children}</Component>
}

function ResponsiveDialogContent({
  children,
  className,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-xl pb-safe"
        {...props}
      >
        {children}
      </SheetContent>
    )
  }

  return (
    <DialogContent className={className} {...props}>
      {children}
    </DialogContent>
  )
}

function ResponsiveDialogHeader({
  children,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  const isMobile = useIsMobile()
  const Component = isMobile ? SheetHeader : DialogHeader
  return <Component {...props}>{children}</Component>
}

function ResponsiveDialogFooter({
  children,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  const isMobile = useIsMobile()
  const Component = isMobile ? SheetFooter : DialogFooter
  return <Component {...props}>{children}</Component>
}

function ResponsiveDialogTitle({
  children,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const isMobile = useIsMobile()
  const Component = isMobile ? SheetTitle : DialogTitle
  return <Component {...props}>{children}</Component>
}

function ResponsiveDialogDescription({
  children,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const isMobile = useIsMobile()
  const Component = isMobile ? SheetDescription : DialogDescription
  return <Component {...props}>{children}</Component>
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
}
