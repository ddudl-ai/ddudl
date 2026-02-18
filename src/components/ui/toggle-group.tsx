"use client&quot;

import * as React from &quot;react&quot;
import * as ToggleGroupPrimitive from &quot;@radix-ui/react-toggle-group&quot;
import { type VariantProps } from &quot;class-variance-authority&quot;

import { cn } from &quot;@/lib/utils&quot;
import { toggleVariants } from &quot;@/components/ui/toggle&quot;

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: &quot;default&quot;,
  variant: &quot;default&quot;,
})

function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot=&quot;toggle-group&quot;
      data-variant={variant}
      data-size={size}
      className={cn(
        &quot;group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs&quot;,
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      data-slot=&quot;toggle-group-item&quot;
      data-variant={context.variant || variant}
      data-size={context.size || size}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        &quot;min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l&quot;,
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
