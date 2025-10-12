# Minesweeper App - Replit Migration

## Overview
A Next.js 15 Minesweeper game application with Firebase authentication, real-time database, and modern UI components built with Radix UI and Tailwind CSS.

## Recent Changes
**October 12, 2025** - Migrated from Vercel to Replit
- Configured Next.js to run on port 5000 with proper host binding (0.0.0.0) for Replit compatibility
- Moved Firebase credentials from hardcoded values to secure environment variables
- Added cross-origin request handling for Replit dev domains
- Set up deployment configuration for autoscale production deployment
- Created .env.example for documenting required environment variables

## Project Architecture

### Tech Stack
- **Framework**: Next.js 15.2.4 (App Router)
- **Runtime**: Bun (package manager and runtime)
- **Styling**: Tailwind CSS with custom components
- **UI Components**: Radix UI primitives
- **Authentication**: Firebase Auth with Google Provider
- **Database**: Firebase Firestore
- **Form Handling**: React Hook Form with Zod validation

### Key Directories
- `/app` - Next.js App Router pages and layouts
  - `/admin` - Admin dashboard
- `/components` - Reusable React components
  - `/ui` - Radix UI component library
- `/lib` - Utility functions and Firebase configuration
- `/hooks` - Custom React hooks
- `/public` - Static assets

### Environment Variables (Required)
All Firebase configuration is managed through Replit Secrets:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

## Development

### Running Locally
```bash
bun run dev
```
Server runs on http://0.0.0.0:5000

### Building for Production
```bash
bun run build
bun run start
```

### Deployment
Configured for Replit Autoscale deployment:
- Build command: `bun run build`
- Start command: `bun run start`
- Port: 5000

## Security Considerations
- Firebase credentials are stored as environment variables, not in code
- .env files are excluded from git (except .env.example)
- Client/server separation maintained with NEXT_PUBLIC_ prefix for client-side env vars
- Cross-origin requests properly configured for Replit environment
