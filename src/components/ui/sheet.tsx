"use client&quot;

import * as React from &quot;react&quot;
import * as SheetPrimitive from &quot;@radix-ui/react-dialog&quot;
import { XIcon } from &quot;lucide-react&quot;

import { cn } from &quot;@/lib/utils&quot;

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot=&quot;sheet&quot; {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot=&quot;sheet-trigger&quot; {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot=&quot;sheet-close&quot; {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot=&quot;sheet-portal&quot; {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot=&quot;sheet-overlay&quot;
      className={cn(
        &quot;data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50&quot;,
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = &quot;right&quot;,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: &quot;top&quot; | &quot;right&quot; | &quot;bottom&quot; | &quot;left&quot;
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot=&quot;sheet-content&quot;
        className={cn(
          &quot;bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500&quot;,
          side === &quot;right&quot; &&
            &quot;data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm&quot;,
          side === &quot;left&quot; &&
            &quot;data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm&quot;,
          side === &quot;top&quot; &&
            &quot;data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b&quot;,
          side === &quot;bottom&quot; &&
            &quot;data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t&quot;,
          className
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className=&quot;ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none&quot;>
          <XIcon className=&quot;size-4&quot; />
          <span className=&quot;sr-only&quot;>Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div
      data-slot=&quot;sheet-header&quot;
      className={cn(&quot;flex flex-col gap-1.5 p-4&quot;, className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div
      data-slot=&quot;sheet-footer&quot;
      className={cn(&quot;mt-auto flex flex-col gap-2 p-4&quot;, className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot=&quot;sheet-title&quot;
      className={cn(&quot;text-foreground font-semibold&quot;, className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot=&quot;sheet-description&quot;
      className={cn(&quot;text-muted-foreground text-sm&quot;, className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
