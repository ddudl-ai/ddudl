import * as React from &quot;react&quot;
import { Slot } from &quot;@radix-ui/react-slot&quot;
import { ChevronRight, MoreHorizontal } from &quot;lucide-react&quot;

import { cn } from &quot;@/lib/utils&quot;

function Breadcrumb({ ...props }: React.ComponentProps<&quot;nav&quot;>) {
  return <nav aria-label=&quot;breadcrumb&quot; data-slot=&quot;breadcrumb&quot; {...props} />
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<&quot;ol&quot;>) {
  return (
    <ol
      data-slot=&quot;breadcrumb-list&quot;
      className={cn(
        &quot;text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5&quot;,
        className
      )}
      {...props}
    />
  )
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<&quot;li&quot;>) {
  return (
    <li
      data-slot=&quot;breadcrumb-item&quot;
      className={cn(&quot;inline-flex items-center gap-1.5&quot;, className)}
      {...props}
    />
  )
}

function BreadcrumbLink({
  asChild,
  className,
  ...props
}: React.ComponentProps<&quot;a&quot;> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot : &quot;a&quot;

  return (
    <Comp
      data-slot=&quot;breadcrumb-link&quot;
      className={cn(&quot;hover:text-foreground transition-colors&quot;, className)}
      {...props}
    />
  )
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<&quot;span&quot;>) {
  return (
    <span
      data-slot=&quot;breadcrumb-page&quot;
      role=&quot;link&quot;
      aria-disabled=&quot;true&quot;
      aria-current=&quot;page&quot;
      className={cn(&quot;text-foreground font-normal&quot;, className)}
      {...props}
    />
  )
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<&quot;li&quot;>) {
  return (
    <li
      data-slot=&quot;breadcrumb-separator&quot;
      role=&quot;presentation&quot;
      aria-hidden=&quot;true&quot;
      className={cn(&quot;[&>svg]:size-3.5&quot;, className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  )
}

function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<&quot;span&quot;>) {
  return (
    <span
      data-slot=&quot;breadcrumb-ellipsis&quot;
      role=&quot;presentation&quot;
      aria-hidden=&quot;true&quot;
      className={cn(&quot;flex size-9 items-center justify-center&quot;, className)}
      {...props}
    >
      <MoreHorizontal className=&quot;size-4&quot; />
      <span className=&quot;sr-only&quot;>More</span>
    </span>
  )
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}
