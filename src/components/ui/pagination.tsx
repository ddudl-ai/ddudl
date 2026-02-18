import * as React from &quot;react&quot;
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from &quot;lucide-react&quot;

import { cn } from &quot;@/lib/utils&quot;
import { Button, buttonVariants } from &quot;@/components/ui/button&quot;

function Pagination({ className, ...props }: React.ComponentProps<&quot;nav&quot;>) {
  return (
    <nav
      role=&quot;navigation&quot;
      aria-label=&quot;pagination&quot;
      data-slot=&quot;pagination&quot;
      className={cn(&quot;mx-auto flex w-full justify-center&quot;, className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<&quot;ul&quot;>) {
  return (
    <ul
      data-slot=&quot;pagination-content&quot;
      className={cn(&quot;flex flex-row items-center gap-1&quot;, className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<&quot;li&quot;>) {
  return <li data-slot=&quot;pagination-item&quot; {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, &quot;size&quot;> &
  React.ComponentProps<&quot;a&quot;>

function PaginationLink({
  className,
  isActive,
  size = &quot;icon&quot;,
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? &quot;page&quot; : undefined}
      data-slot=&quot;pagination-link&quot;
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? &quot;outline&quot; : &quot;ghost&quot;,
          size,
        }),
        className
      )}
      {...props}
    />
  )
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label=&quot;Go to previous page&quot;
      size=&quot;default&quot;
      className={cn(&quot;gap-1 px-2.5 sm:pl-2.5&quot;, className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className=&quot;hidden sm:block&quot;>Previous</span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label=&quot;Go to next page&quot;
      size=&quot;default&quot;
      className={cn(&quot;gap-1 px-2.5 sm:pr-2.5&quot;, className)}
      {...props}
    >
      <span className=&quot;hidden sm:block&quot;>Next</span>
      <ChevronRightIcon />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<&quot;span&quot;>) {
  return (
    <span
      aria-hidden
      data-slot=&quot;pagination-ellipsis&quot;
      className={cn(&quot;flex size-9 items-center justify-center&quot;, className)}
      {...props}
    >
      <MoreHorizontalIcon className=&quot;size-4&quot; />
      <span className=&quot;sr-only&quot;>More pages</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
