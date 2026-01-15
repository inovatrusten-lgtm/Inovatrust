# InovaTrust Financial Investment Platform

## Overview

A full-stack cryptocurrency investment platform with InovaTrust Loop staking, withdrawal management with admin approval, real-time chat support, and automatic email receipts. Dark theme design inspired by professional financial services (Coinbase, Robinhood, Wise).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, bundled via Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with dark theme (orange primary, green for gains)
- **Forms**: React Hook Form with Zod validation schemas

The frontend follows a dashboard-first approach with sidebar navigation. Key pages include Dashboard, Investments, Transactions, Withdrawal, Staking (InovaTrust Loop), Support Chat, and Admin Panel.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints under `/api` prefix
- **Real-time Communication**: WebSocket server (ws library) for live chat functionality
- **Session Management**: express-session with PostgreSQL session store (connect-pg-simple)
- **Build Process**: Custom esbuild script for production bundling

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Key Entities**: Users, Investments, Transactions, Withdrawals, Conversations, ChatMessages, Stakes
- **Session Storage**: PostgreSQL via connect-pg-simple (auto-creates session table)
- **Migrations**: Drizzle Kit for schema migrations (`db:push` command)

### Authentication & Authorization
- Session-based authentication stored in PostgreSQL (production-ready)
- Admin role flag on user records for privileged access
- Protected routes check session userId on the server side
- Default admin: username "admin", password "admin123" (CHANGE IN PRODUCTION)

### Staking System (InovaTrust Loop)
- **Networks**: BNB Smart Chain (Chain ID 56), Ethereum Mainnet (Chain ID 1) - MAINNET ONLY
- **Tokens**: USDT, USDC (BEP20 and ERC20)
- **Plans**: 1 day (3.8%), 7 days (12%), 14 days (28%), 21 days (45%), 100 days (80%), 365 days (120%)
- **Flow**: Active (countdown timer) → Matured → Withdrawal Pending (admin approval) → Completed
- **Wallet Integration**: EIP-1193 compliant (MetaMask, WalletConnect, etc.)

### Real-time Features
- WebSocket server handles chat room subscriptions
- Live countdown timers for active stakes
- Room-based message broadcasting for multi-user chat support

## External Dependencies

### Database
- PostgreSQL database (connection via `DATABASE_URL` environment variable)
- Drizzle ORM with pg driver for database operations
- connect-pg-simple for persistent session storage

### Email Service
- **Provider**: Mailgun for transactional emails
- **Configuration**: `server/email.ts` contains email sending logic
- **Functionality**: Sends withdrawal receipt emails when admin approves withdrawals

### Blockchain
- **ethers.js**: Wallet connection and token transfers
- Mainnet contracts for USDT/USDC on BEP20 and ERC20 networks

### Invoice Generation
- Invoices are automatically generated when withdrawals are approved
- Invoice number format: `INV-YYYYMMDD-XXXXXX` (date + random alphanumeric)
- Invoice data stored in withdrawals table (invoiceNumber, invoiceGeneratedAt)
- Shareable receipt pages at `/receipt/:invoiceNumber`

## Environment Variables (Required for Production)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Secret key for session encryption | Yes |
| `MAILGUN_API_KEY` | Mailgun API key for email sending | Yes |
| `MAILGUN_DOMAIN` | Mailgun sending domain | Yes |
| `MAILGUN_FROM_EMAIL` | Sender email address (optional, defaults to noreply@inovatrust.net) | No |
| `ADMIN_WALLET_PRIVATE_KEY` | Private key for auto-deriving receiving wallet addresses | Optional |
| `NODE_ENV` | Set to "production" for deployment | Yes |

## Deployment Checklist

1. All environment variables configured
2. Change default admin credentials after first login
3. Enable staking for users via Admin > Manage Users
4. Configure receiving wallet addresses in Admin > Settings (or use private key)
5. Verify Mailgun domain is DNS-verified for email delivery
6. Test withdrawal flow end-to-end

## Recent Changes

- Switched email service from SendGrid to Mailgun
- Added PostgreSQL session storage for production (connect-pg-simple)
- Configured mainnet-only blockchain networks (BSC Chain ID 56, Ethereum Chain ID 1)
- Updated wallet connection to EIP-1193 standard (no deprecation warnings)
