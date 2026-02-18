"use client&quot;

import * as CollapsiblePrimitive from &quot;@radix-ui/react-collapsible&quot;

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot=&quot;collapsible&quot; {...props} />
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot=&quot;collapsible-trigger&quot;
      {...props}
    />
  )
}

function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot=&quot;collapsible-content&quot;
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
