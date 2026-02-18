"use client&quot;

import * as React from &quot;react&quot;
import { Command as CommandPrimitive } from &quot;cmdk&quot;
import { SearchIcon } from &quot;lucide-react&quot;

import { cn } from &quot;@/lib/utils&quot;
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from &quot;@/components/ui/dialog&quot;

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot=&quot;command&quot;
      className={cn(
        &quot;bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md&quot;,
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = &quot;Command Palette&quot;,
  description = &quot;Search for a command to run...&quot;,
  children,
  className,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className=&quot;sr-only&quot;>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(&quot;overflow-hidden p-0&quot;, className)}
        showCloseButton={showCloseButton}
      >
        <Command className=&quot;[&_[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5&quot;>
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot=&quot;command-input-wrapper&quot;
      className=&quot;flex h-9 items-center gap-2 border-b px-3&quot;
    >
      <SearchIcon className=&quot;size-4 shrink-0 opacity-50&quot; />
      <CommandPrimitive.Input
        data-slot=&quot;command-input&quot;
        className={cn(
          &quot;placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50&quot;,
          className
        )}
        {...props}
      />
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot=&quot;command-list&quot;
      className={cn(
        &quot;max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto&quot;,
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot=&quot;command-empty&quot;
      className=&quot;py-6 text-center text-sm&quot;
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot=&quot;command-group&quot;
      className={cn(
        &quot;text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium&quot;,
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot=&quot;command-separator&quot;
      className={cn(&quot;bg-border -mx-1 h-px&quot;, className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot=&quot;command-item&quot;
      className={cn(
        &quot;data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*=&apos;text-&apos;])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=&apos;size-&apos;])]:size-4&quot;,
        className
      )}
      {...props}
    />
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<&quot;span&quot;>) {
  return (
    <span
      data-slot=&quot;command-shortcut&quot;
      className={cn(
        &quot;text-muted-foreground ml-auto text-xs tracking-widest&quot;,
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
