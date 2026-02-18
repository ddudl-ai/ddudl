"use client&quot;

import * as React from &quot;react&quot;
import { PanelLeftIcon } from &quot;lucide-react&quot;
import { cn } from &quot;@/lib/utils&quot;
import { Button } from &quot;@/components/ui/button&quot;
import { Input } from &quot;@/components/ui/input&quot;
import { Separator } from &quot;@/components/ui/separator&quot;
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from &quot;@/components/ui/sheet&quot;
import { useSidebar } from &quot;./context&quot;
import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON, SIDEBAR_WIDTH_MOBILE } from &quot;./constants&quot;

export function Sidebar({
  side = &quot;left&quot;,
  variant = &quot;sidebar&quot;,
  collapsible = &quot;offcanvas&quot;,
  className,
  children,
  ...props
}: React.ComponentProps<&quot;div&quot;> & {
  side?: &quot;left&quot; | &quot;right&quot;
  variant?: &quot;sidebar&quot; | &quot;floating&quot; | &quot;inset&quot;
  collapsible?: &quot;offcanvas&quot; | &quot;icon&quot; | &quot;none&quot;
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

  if (collapsible === &quot;none&quot;) {
    return (
      <div
        data-slot=&quot;sidebar&quot;
        className={cn(
          &quot;bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col&quot;,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar=&quot;sidebar&quot;
          data-slot=&quot;sidebar&quot;
          data-mobile=&quot;true&quot;
          className=&quot;bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden&quot;
          style={{ &quot;--sidebar-width&quot;: SIDEBAR_WIDTH_MOBILE } as React.CSSProperties}
          side={side}
        >
          <SheetHeader className=&quot;sr-only&quot;>
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className=&quot;flex h-full w-full flex-col&quot;>{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      className=&quot;group peer text-sidebar-foreground hidden md:block&quot;
      data-state={state}
      data-collapsible={state === &quot;collapsed&quot; ? collapsible : &quot;"}
      data-variant={variant}
      data-side={side}
      data-slot=&quot;sidebar&quot;
    >
      <div
        data-slot=&quot;sidebar-gap&quot;
        className={cn(
          &quot;relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear&quot;,
          &quot;group-data-[collapsible=offcanvas]:w-0&quot;,
          &quot;group-data-[side=right]:rotate-180&quot;,
          variant === &quot;floating&quot; || variant === &quot;inset&quot;
            ? &quot;group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]&quot;
            : &quot;group-data-[collapsible=icon]:w-(--sidebar-width-icon)&quot;
        )}
      />
      <div
        data-slot=&quot;sidebar-container&quot;
        className={cn(
          &quot;fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex&quot;,
          side === &quot;left&quot;
            ? &quot;left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]&quot;
            : &quot;right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]&quot;,
          variant === &quot;floating&quot; || variant === &quot;inset&quot;
            ? &quot;p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]&quot;
            : &quot;group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l&quot;,
          className
        )}
        {...props}
      >
        <div
          data-sidebar=&quot;sidebar&quot;
          data-slot=&quot;sidebar-inner&quot;
          className=&quot;bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm&quot;
          style={{
            &quot;--sidebar-width&quot;: SIDEBAR_WIDTH,
            &quot;--sidebar-width-icon&quot;: SIDEBAR_WIDTH_ICON,
          } as React.CSSProperties}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()
  return (
    <Button
      data-sidebar=&quot;trigger&quot;
      data-slot=&quot;sidebar-trigger&quot;
      variant=&quot;ghost&quot;
      size=&quot;icon&quot;
      className={cn(&quot;size-7&quot;, className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className=&quot;sr-only&quot;>Toggle Sidebar</span>
    </Button>
  )
}

export function SidebarRail({ className, ...props }: React.ComponentProps<&quot;button&quot;>) {
  const { toggleSidebar } = useSidebar()
  return (
    <button
      data-sidebar=&quot;rail&quot;
      data-slot=&quot;sidebar-rail&quot;
      aria-label=&quot;Toggle Sidebar&quot;
      tabIndex={-1}
      onClick={toggleSidebar}
      title=&quot;Toggle Sidebar&quot;
      className={cn(
        &quot;hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex&quot;,
        &quot;in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize&quot;,
        &quot;[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize&quot;,
        &quot;hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full&quot;,
        &quot;[[data-side=left][data-collapsible=offcanvas]_&]:-right-2&quot;,
        &quot;[[data-side=right][data-collapsible=offcanvas]_&]:-left-2&quot;,
        className
      )}
      {...props}
    />
  )
}

export function SidebarInset({ className, ...props }: React.ComponentProps<&quot;main&quot;>) {
  return (
    <main
      data-slot=&quot;sidebar-inset&quot;
      className={cn(
        &quot;bg-background relative flex w-full flex-1 flex-col&quot;,
        &quot;md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2&quot;,
        className
      )}
      {...props}
    />
  )
}

export function SidebarInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot=&quot;sidebar-input&quot;
      data-sidebar=&quot;input&quot;
      className={cn(&quot;bg-background h-8 w-full shadow-none&quot;, className)}
      {...props}
    />
  )
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div data-slot=&quot;sidebar-header&quot; data-sidebar=&quot;header&quot; className={cn(&quot;flex flex-col gap-2 p-2&quot;, className)} {...props} />
  )
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div data-slot=&quot;sidebar-footer&quot; data-sidebar=&quot;footer&quot; className={cn(&quot;flex flex-col gap-2 p-2&quot;, className)} {...props} />
  )
}

export function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator data-slot=&quot;sidebar-separator&quot; data-sidebar=&quot;separator&quot; className={cn(&quot;bg-sidebar-border mx-2 w-auto&quot;, className)} {...props} />
  )
}

export function SidebarContent({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div
      data-slot=&quot;sidebar-content&quot;
      data-sidebar=&quot;content&quot;
      className={cn(&quot;flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden&quot;, className)}
      {...props}
    />
  )
}
