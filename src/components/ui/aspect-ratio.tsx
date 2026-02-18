"use client&quot;

import * as AspectRatioPrimitive from &quot;@radix-ui/react-aspect-ratio&quot;

function AspectRatio({
  ...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot=&quot;aspect-ratio&quot; {...props} />
}

export { AspectRatio }
