"use client&quot;

import * as React from &quot;react&quot;
import * as DropdownMenuPrimitive from &quot;@radix-ui/react-dropdown-menu&quot;
import { CheckIcon, ChevronRightIcon, CircleIcon } from &quot;lucide-react&quot;

import { cn } from &quot;@/lib/utils&quot;

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot=&quot;dropdown-menu&quot; {...props} />
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot=&quot;dropdown-menu-portal&quot; {...props} />
  )
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot=&quot;dropdown-menu-trigger&quot;
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot=&quot;dropdown-menu-content&quot;
        sideOffset={sideOffset}
        className={cn(
          &quot;bg-white text-gray-900 border border-gray-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md p-1 shadow-lg&quot;,
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot=&quot;dropdown-menu-group&quot; {...props} />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = &quot;default&quot;,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: &quot;default&quot; | &quot;destructive&quot;
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot=&quot;dropdown-menu-item&quot;
      data-inset={inset}
      data-variant={variant}
      className={cn(
        &quot;hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900 data-[variant=destructive]:text-red-600 data-[variant=destructive]:hover:bg-red-50 data-[variant=destructive]:focus:bg-red-50 data-[variant=destructive]:focus:text-red-600 data-[variant=destructive]:*:[svg]:!text-red-600 [&_svg:not([class*=&apos;text-&apos;])]:text-gray-500 relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=&apos;size-&apos;])]:size-4 transition-colors&quot;,
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot=&quot;dropdown-menu-checkbox-item&quot;
      className={cn(
        &quot;hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900 relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=&apos;size-&apos;])]:size-4 transition-colors&quot;,
        className
      )}
      checked={checked}
      {...props}
    >
      <span className=&quot;pointer-events-none absolute left-2 flex size-3.5 items-center justify-center&quot;>
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className=&quot;size-4&quot; />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot=&quot;dropdown-menu-radio-group&quot;
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot=&quot;dropdown-menu-radio-item&quot;
      className={cn(
        &quot;hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900 relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=&apos;size-&apos;])]:size-4 transition-colors&quot;,
        className
      )}
      {...props}
    >
      <span className=&quot;pointer-events-none absolute left-2 flex size-3.5 items-center justify-center&quot;>
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className=&quot;size-2 fill-current&quot; />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot=&quot;dropdown-menu-label&quot;
      data-inset={inset}
      className={cn(
        &quot;px-2 py-1.5 text-sm font-medium data-[inset]:pl-8&quot;,
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot=&quot;dropdown-menu-separator&quot;
      className={cn(&quot;bg-border -mx-1 my-1 h-px&quot;, className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<&quot;span&quot;>) {
  return (
    <span
      data-slot=&quot;dropdown-menu-shortcut&quot;
      className={cn(
        &quot;text-muted-foreground ml-auto text-xs tracking-widest&quot;,
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot=&quot;dropdown-menu-sub&quot; {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot=&quot;dropdown-menu-sub-trigger&quot;
      data-inset={inset}
      className={cn(
        &quot;hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900 data-[state=open]:bg-gray-100 data-[state=open]:text-gray-900 flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[inset]:pl-8 transition-colors&quot;,
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className=&quot;ml-auto size-4&quot; />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot=&quot;dropdown-menu-sub-content&quot;
      className={cn(
        &quot;bg-white text-gray-900 border border-gray-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md p-1 shadow-lg&quot;,
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
