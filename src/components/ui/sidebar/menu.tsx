"use client&quot;

import * as React from &quot;react&quot;
import { Slot } from &quot;@radix-ui/react-slot&quot;
import { cva, VariantProps } from &quot;class-variance-authority&quot;
import { Tooltip, TooltipContent, TooltipTrigger } from &quot;@/components/ui/tooltip&quot;
import { Skeleton } from &quot;@/components/ui/skeleton&quot;
import { cn } from &quot;@/lib/utils&quot;
import { useSidebar } from &quot;./context&quot;

export function SidebarMenu({ className, ...props }: React.ComponentProps<&quot;ul&quot;>) {
  return (
    <ul data-slot=&quot;sidebar-menu&quot; data-sidebar=&quot;menu&quot; className={cn(&quot;flex w-full min-w-0 flex-col gap-1&quot;, className)} {...props} />
  )
}

export function SidebarMenuItem({ className, ...props }: React.ComponentProps<&quot;li&quot;>) {
  return (
    <li data-slot=&quot;sidebar-menu-item&quot; data-sidebar=&quot;menu-item&quot; className={cn(&quot;group/menu-item relative&quot;, className)} {...props} />
  )
}

const sidebarMenuButtonVariants = cva(
  &quot;peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0&quot;,
  {
    variants: {
      variant: {
        default: &quot;hover:bg-sidebar-accent hover:text-sidebar-accent-foreground&quot;,
        outline:
          &quot;bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]&quot;,
      },
      size: {
        default: &quot;h-8 text-sm&quot;,
        sm: &quot;h-7 text-xs&quot;,
        lg: &quot;h-12 text-sm group-data-[collapsible=icon]:p-0!&quot;,
      },
    },
    defaultVariants: {
      variant: &quot;default&quot;,
      size: &quot;default&quot;,
    },
  }
)

export function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = &quot;default&quot;,
  size = &quot;default&quot;,
  tooltip,
  className,
  ...props
}: React.ComponentProps<&quot;button&quot;> & {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string | React.ComponentProps<typeof TooltipContent>
} & VariantProps<typeof sidebarMenuButtonVariants>) {
  const Comp = asChild ? Slot : &quot;button&quot;
  const { isMobile, state } = useSidebar()

  const button = (
    <Comp
      data-slot=&quot;sidebar-menu-button&quot;
      data-sidebar=&quot;menu-button&quot;
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  )

  if (!tooltip) return button

  if (typeof tooltip === &quot;string&quot;) {
    tooltip = { children: tooltip }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side=&quot;right&quot; align=&quot;center&quot; hidden={state !== &quot;collapsed&quot; || isMobile} {...tooltip} />
    </Tooltip>
  )
}

export function SidebarMenuAction({ className, asChild = false, showOnHover = false, ...props }: React.ComponentProps<&quot;button&quot;> & { asChild?: boolean; showOnHover?: boolean }) {
  const Comp = asChild ? Slot : &quot;button&quot;
  return (
    <Comp
      data-slot=&quot;sidebar-menu-action&quot;
      data-sidebar=&quot;menu-action&quot;
      className={cn(
        &quot;text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0&quot;,
        &quot;after:absolute after:-inset-2 md:after:hidden&quot;,
        &quot;peer-data-[size=sm]/menu-button:top-1&quot;,
        &quot;peer-data-[size=default]/menu-button:top-1.5&quot;,
        &quot;peer-data-[size=lg]/menu-button:top-2.5&quot;,
        &quot;group-data-[collapsible=icon]:hidden&quot;,
        showOnHover &&
          &quot;peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0&quot;,
        className
      )}
      {...props}
    />
  )
}

export function SidebarMenuBadge({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div
      data-slot=&quot;sidebar-menu-badge&quot;
      data-sidebar=&quot;menu-badge&quot;
      className={cn(
        &quot;text-sidebar-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none&quot;,
        &quot;peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground&quot;,
        &quot;peer-data-[size=sm]/menu-button:top-1&quot;,
        &quot;peer-data-[size=default]/menu-button:top-1.5&quot;,
        &quot;peer-data-[size=lg]/menu-button:top-2.5&quot;,
        &quot;group-data-[collapsible=icon]:hidden&quot;,
        className
      )}
      {...props}
    />
  )
}

export function SidebarMenuSkeleton({ className, showIcon = false, ...props }: React.ComponentProps<&quot;div&quot;> & { showIcon?: boolean }) {
  const width = React.useMemo(() => `${Math.floor(Math.random() * 40) + 50}%`, [])
  return (
    <div data-slot=&quot;sidebar-menu-skeleton&quot; data-sidebar=&quot;menu-skeleton&quot; className={cn(&quot;flex h-8 items-center gap-2 rounded-md px-2&quot;, className)} {...props}>
      {showIcon && <Skeleton className=&quot;size-4 rounded-md&quot; data-sidebar=&quot;menu-skeleton-icon&quot; />}
      <Skeleton className=&quot;h-4 max-w-(--skeleton-width) flex-1&quot; data-sidebar=&quot;menu-skeleton-text&quot; style={{ &quot;--skeleton-width&quot;: width } as React.CSSProperties} />
    </div>
  )
}

export function SidebarMenuSub({ className, ...props }: React.ComponentProps<&quot;ul&quot;>) {
  return (
    <ul
      data-slot=&quot;sidebar-menu-sub&quot;
      data-sidebar=&quot;menu-sub&quot;
      className={cn(
        &quot;border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5&quot;,
        &quot;group-data-[collapsible=icon]:hidden&quot;,
        className
      )}
      {...props}
    />
  )
}

export function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<&quot;li&quot;>) {
  return (
    <li data-slot=&quot;sidebar-menu-sub-item&quot; data-sidebar=&quot;menu-sub-item&quot; className={cn(&quot;group/menu-sub-item relative&quot;, className)} {...props} />
  )
}

export function SidebarMenuSubButton({
  asChild = false,
  size = &quot;md&quot;,
  isActive = false,
  className,
  ...props
}: React.ComponentProps<&quot;a&quot;> & { asChild?: boolean; size?: &quot;sm&quot; | &quot;md&quot;; isActive?: boolean }) {
  const Comp = asChild ? Slot : &quot;a&quot;
  return (
    <Comp
      data-slot=&quot;sidebar-menu-sub-button&quot;
      data-sidebar=&quot;menu-sub-button&quot;
      data-size={size}
      data-active={isActive}
      className={cn(
        &quot;text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0&quot;,
        &quot;data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground&quot;,
        size === &quot;sm&quot; && &quot;text-xs&quot;,
        size === &quot;md&quot; && &quot;text-sm&quot;,
        &quot;group-data-[collapsible=icon]:hidden&quot;,
        className
      )}
      {...props}
    />
  )
}

export { sidebarMenuButtonVariants }

