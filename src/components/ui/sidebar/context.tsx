"use client&quot;

import * as React from &quot;react&quot;
import { useIsMobile } from &quot;@/hooks/use-mobile&quot;
import { cn } from &quot;@/lib/utils&quot;
import { TooltipProvider } from &quot;@/components/ui/tooltip&quot;
import {
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_KEYBOARD_SHORTCUT,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
} from &quot;./constants&quot;

export type SidebarContextProps = {
  state: &quot;expanded&quot; | &quot;collapsed&quot;
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error(&quot;useSidebar must be used within a SidebarProvider.&quot;)
  }

  return context
}

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<&quot;div&quot;> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)

  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp ?? _open
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === &quot;function&quot; ? value(open) : value
      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setOpen(openState)
      }

      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    },
    [setOpenProp, open]
  )

  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((v) => !v) : setOpen((v) => !v)
  }, [isMobile, setOpen])

  const state = open ? &quot;expanded&quot; : &quot;collapsed&quot;

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
  )

  // Keyboard shortcut for toggling
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener(&quot;keydown&quot;, handleKeyDown)
    return () => window.removeEventListener(&quot;keydown&quot;, handleKeyDown)
  }, [toggleSidebar])

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot=&quot;sidebar-wrapper&quot;
          style={{ &quot;--sidebar-width&quot;: SIDEBAR_WIDTH, &quot;--sidebar-width-icon&quot;: SIDEBAR_WIDTH_ICON, ...style } as React.CSSProperties}
          className={cn(
            &quot;group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full&quot;,
            className
          )}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
}
