# Decisions Log

## Why Express
- Full control
- Webhooks
- Admin tooling

## Why Supabase
- Fast setup
- Auth + DB in one
- Multi-tenant friendly

## One Feature at a Time
- Prevent half-built systems
- Faster MVP validation

## Brand Style & Colors (IMPORTANT)
- **All code must comply with the established brand theme**
- Color palette:
  - Black
  - White
  - Brand Green (`#047857`)
- All buttons must use these brand colors where applicable
- This rule applies to ALL code - both existing and future
- Do not introduce new colors without explicit approval
- Maintain visual consistency across the entire application
- **Use the centralized theme file**: `frontend/src/theme/colors.ts`
  - Import color utilities from this file instead of hardcoding colors
  - Example: `import { statusColors, getStatusColor } from '../theme/colors'`
  - This allows quick color changes across the entire app

## Component-Based Development (IMPORTANT)
- **Create reusable components** that fit the brand/theme design
- Components should be self-contained with clear TypeScript interfaces
- Use TypeScript interfaces for all component props (export as `ComponentNameProps`)
- Place shared components in `frontend/src/components/`
- Follow controlled component pattern (value + onChange)
- Support common variants via props (size, mode, variant)
- Components must comply with brand colors (black, white, #047857)

### Component Structure
```
frontend/src/components/
  ComponentName/
    index.ts          # Barrel export
    types.ts          # TypeScript interfaces
    ComponentName.tsx # Main component
```

### Component Guidelines
1. **Props Interface**: Always define and export a props interface
2. **Default Values**: Use sensible defaults for optional props
3. **Controlled Pattern**: Use `value` + `onChange` for form components
4. **Accessibility**: Include proper ARIA labels and keyboard support
5. **Responsive**: Design mobile-first, support all screen sizes
6. **Themeable**: Use CSS variables and brand colors

### Existing Reusable Components
- `Button` - Primary, secondary, outline variants
- `Card` - Dashboard metric cards
- `Toast` - Notifications with type variants
- `ConfirmModal` - Confirmation dialogs
- `StarRating` - Interactive rating component
- `GuestSelector` - Adults/children selection for bookings
