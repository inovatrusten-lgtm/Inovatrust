# InovaTrust Design Guidelines

## Brand Identity
- **Logo**: Orange filled star icon with "INOVATRUST" text in white uppercase
- **Style**: Dark, modern cryptocurrency/fintech aesthetic matching inovatrust.net

## Color Palette

### Primary Colors (CSS Variables in index.css)
- **Background**: Near-black (hsl 0 0% 4%) - creates immersive dark experience
- **Card Background**: Dark gray (hsl 0 0% 10%) - subtle elevation from background
- **Primary (Orange)**: hsl(24, 95%, 53%) - used for logo star, key values, action buttons, borders
- **Accent (Green)**: hsl(142, 71%, 45%) - used for positive values, gains, success states

### Text Colors
- **Foreground**: Very light gray (hsl 0 0% 95%)
- **Muted**: Medium gray (hsl 0 0% 55%) for secondary text
- **Primary colored text**: Use primary color for important values

### Semantic Colors
- **Success/Positive**: Green (--accent) - gains, increases, successful actions
- **Error/Destructive**: Red (hsl 0 84% 45%) - losses, decreases, errors
- **Warning/Primary**: Orange (--primary) - alerts, important notices

## Typography

**Font Families:**
- Primary: Inter (UI, body text, data)
- Fallback: Open Sans, system fonts

**Scale:**
- Headings: text-3xl, font-bold
- Subheadings: text-xl, font-semibold
- Body: text-base
- Financial Data: text-2xl to text-4xl, font-bold, tabular-nums
- Labels: text-sm, text-muted-foreground

## Component Styling

### Cards
- Dark gray background (bg-card)
- Subtle border (border-card-border)
- Investment cards have orange border (border-primary) for highlight
- Rounded corners (rounded-md)

### Buttons
- Primary: Orange background (bg-primary) with white text
- Secondary: Dark background with visible border
- Ghost: Transparent with hover-elevate effect
- Outline: Visible border with transparent background

### Sidebar
- Very dark background (bg-sidebar: hsl 0 0% 3%)
- Orange star logo with white "INOVATRUST" text
- Menu items with hover-elevate effect
- Active item highlighted with sidebar-accent

### Status Badges
- Active: Green background
- Pending: Yellow/Orange
- Completed: Blue
- Cancelled/Error: Red

### Progress Bars
- Green fill for progress indicators
- Dark background track

## Layout System

**Spacing:** Tailwind default spacing (4, 6, 8 for gaps/padding)

**Grid Structure:**
- Sidebar navigation (w-64 default)
- Main content with responsive grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Cards with consistent p-6 padding

## Key Features

1. **Dark Theme Only**: Matches inovatrust.net dark aesthetic
2. **Orange Star Branding**: Prominent logo with orange filled star
3. **Green for Gains**: All positive values, percentages use green
4. **Orange Highlights**: Investment cards, primary buttons, key values
5. **Real-time Chat**: Integrated chat widget for admin-user communication

## Accessibility
- High contrast text on dark backgrounds
- Focus indicators on all inputs
- ARIA labels for interactive elements
