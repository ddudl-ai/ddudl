"use client&quot;

import * as React from &quot;react&quot;
import { Slot } from &quot;@radix-ui/react-slot&quot;
import { cn } from &quot;@/lib/utils&quot;

export function SidebarGroup({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div data-slot=&quot;sidebar-group&quot; data-sidebar=&quot;group&quot; className={cn(&quot;relative flex w-full min-w-0 flex-col p-2&quot;, className)} {...props} />
  )
}

export function SidebarGroupLabel({ className, asChild = false, ...props }: React.ComponentProps<&quot;div&quot;> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : &quot;div&quot;
  return (
    <Comp
      data-slot=&quot;sidebar-group-label&quot;
      data-sidebar=&quot;group-label&quot;
      className={cn(
        &quot;text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0&quot;,
        &quot;group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0&quot;,
        className
      )}
      {...props}
    />
  )
}

export function SidebarGroupAction({ className, asChild = false, ...props }: React.ComponentProps<&quot;button&quot;> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : &quot;button&quot;
  return (
    <Comp
      data-slot=&quot;sidebar-group-action&quot;
      data-sidebar=&quot;group-action&quot;
      className={cn(
        &quot;text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0&quot;,
        &quot;after:absolute after:-inset-2 md:after:hidden&quot;,
        &quot;group-data-[collapsible=icon]:hidden&quot;,
        className
      )}
      {...props}
    />
  )
}

export function SidebarGroupContent({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div data-slot=&quot;sidebar-group-content&quot; data-sidebar=&quot;group-content&quot; className={cn(&quot;w-full text-sm&quot;, className)} {...props} />
  )}

