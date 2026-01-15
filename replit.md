# InovaTrust Financial Investment Platform

## Overview

A full-stack financial investment platform that enables users to manage investments, process withdrawals, and communicate with administrators through real-time chat. The application follows a professional financial services design aesthetic inspired by Coinbase, Robinhood, and Wise, emphasizing trust, transaction clarity, and data transparency.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, bundled via Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **Forms**: React Hook Form with Zod validation schemas

The frontend follows a dashboard-first approach with a sidebar navigation layout. Key pages include Dashboard, Investments, Transactions, Withdrawal, Support Chat, and Admin Panel. The design system uses Inter font family with tabular-nums for financial figures.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints under `/api` prefix
- **Real-time Communication**: WebSocket server (ws library) for live chat functionality
- **Session Management**: express-session with cookie-based authentication
- **Build Process**: Custom esbuild script for production bundling with selective dependency bundling

The server serves both the API and static frontend assets in production. Development uses Vite's middleware mode with HMR support.

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Key Entities**: Users, Investments, Transactions, Withdrawals, Conversations, ChatMessages
- **Migrations**: Drizzle Kit for schema migrations (`db:push` command)

### Authentication & Authorization
- Session-based authentication stored in cookies
- Admin role flag on user records for privileged access
- Protected routes check session userId on the server side

### Real-time Features
- WebSocket server handles chat room subscriptions
- Clients join conversation rooms to receive live message updates
- Room-based message broadcasting for multi-user chat support

## External Dependencies

### Database
- PostgreSQL database (connection via `DATABASE_URL` environment variable)
- Drizzle ORM with pg driver for database operations
- connect-pg-simple for session storage (optional)

### Core Libraries
- **UI Framework**: Radix UI primitives for accessible components
- **Date Handling**: date-fns for formatting timestamps
- **Validation**: Zod schemas shared between client and server (drizzle-zod integration)
- **HTTP Client**: Native fetch API with custom query client wrapper

### Development Tools
- Vite with React plugin and Replit-specific plugins (cartographer, dev-banner, error overlay)
- TypeScript with path aliases (`@/` for client, `@shared/` for shared code)
- PostCSS with Tailwind and Autoprefixer

### Email Service
- **Provider**: SendGrid for transactional emails
- **Configuration**: `server/email.ts` contains email sending logic
- **Sender Email**: inovatrust.en@gmail.com
- **Functionality**: Sends withdrawal receipt emails when admin approves withdrawals

### Invoice Generation
- Invoices are automatically generated when withdrawals are approved
- Invoice number format: `INV-YYYYMMDD-XXXXXX` (date + random alphanumeric)
- Invoice data stored in withdrawals table (invoiceNumber, invoiceGeneratedAt)
- Users can view receipts from the Withdrawal page

### Environment Requirements
- `DATABASE_URL`: PostgreSQL connection string (required)
- `SESSION_SECRET`: Secret key for session encryption (defaults to fallback in development)
- `SENDGRID_API_KEY`: SendGrid API key for email sending (required for email receipts)
- `NODE_ENV`: Controls production/development behavior