"use client&quot;

import * as React from &quot;react&quot;
import * as RadioGroupPrimitive from &quot;@radix-ui/react-radio-group&quot;
import { CircleIcon } from &quot;lucide-react&quot;

import { cn } from &quot;@/lib/utils&quot;

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot=&quot;radio-group&quot;
      className={cn(&quot;grid gap-3&quot;, className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot=&quot;radio-group-item&quot;
      className={cn(
        &quot;border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50&quot;,
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot=&quot;radio-group-indicator&quot;
        className=&quot;relative flex items-center justify-center&quot;
      >
        <CircleIcon className=&quot;fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2&quot; />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
