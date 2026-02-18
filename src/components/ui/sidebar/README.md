This folder contains the refactored sidebar UI module, extracted from the original single-file implementation to improve readability and maintainability without changing behavior.

Structure
- constants.ts: Shared constants for sizing, cookies, and shortcuts.
- context.tsx: React context, provider, and `useSidebar` hook.
- primitives.tsx: Core building blocks (Sidebar container, Trigger, Rail, Inset, Input, Header/Footer/Separator/Content).
- group.tsx: Group components (Group, Label, Action, Content).
- menu.tsx: Menu components and variants (Menu, Item, Button, Action, Badge, Skeleton, Sub, SubItem, SubButton).
- index.ts: Barrel exporting all public components to preserve the original API surface.

Public API
Import from `@/components/ui/sidebar` as before; the original file now re-exports from this folder so no consumer changes are required.

