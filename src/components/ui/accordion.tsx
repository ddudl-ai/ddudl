"use client&quot;

import * as React from &quot;react&quot;
import * as AccordionPrimitive from &quot;@radix-ui/react-accordion&quot;
import { ChevronDownIcon } from &quot;lucide-react&quot;

import { cn } from &quot;@/lib/utils&quot;

function Accordion({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot=&quot;accordion&quot; {...props} />
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot=&quot;accordion-item&quot;
      className={cn(&quot;border-b last:border-b-0&quot;, className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className=&quot;flex&quot;>
      <AccordionPrimitive.Trigger
        data-slot=&quot;accordion-trigger&quot;
        className={cn(
          &quot;focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180&quot;,
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className=&quot;text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200&quot; />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot=&quot;accordion-content&quot;
      className=&quot;data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm&quot;
      {...props}
    >
      <div className={cn(&quot;pt-0 pb-4&quot;, className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
