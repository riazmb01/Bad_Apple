# Overview

Bad Apple is an educational gaming platform focused on language learning through interactive spelling and grammar games. The application supports multiple game modes including single-player spelling bees, grammar challenges, and real-time multiplayer competitions. Built as a full-stack web application, it features user progress tracking, leaderboards, achievements, and live multiplayer functionality with WebSocket communication.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side is built with React and TypeScript, utilizing a component-based architecture with modern React patterns including hooks and context. The UI is powered by shadcn/ui components built on top of Radix UI primitives, providing accessible and customizable interface elements. Styling is handled through Tailwind CSS with a comprehensive design system including CSS variables for theming and dark mode support.

Key architectural decisions:
- **React with Vite**: Chosen for fast development builds and hot module replacement
- **TypeScript**: Provides type safety and better developer experience
- **Component Library**: shadcn/ui for consistent, accessible UI components
- **State Management**: React hooks and custom hooks for local state, TanStack Query for server state
- **Routing**: Wouter for lightweight client-side routing

## Backend Architecture
The server follows a REST API pattern built with Express.js and TypeScript. The architecture includes WebSocket support for real-time multiplayer features and uses a modular storage abstraction pattern that supports both in-memory storage for development and database persistence for production.

Key architectural decisions:
- **Express.js**: Lightweight and flexible web framework
- **WebSocket Integration**: Real-time communication for multiplayer games
- **Storage Abstraction**: IStorage interface allows switching between in-memory and database storage
- **Middleware Pattern**: Structured request/response logging and error handling

## Data Storage Solutions
The application uses Drizzle ORM with PostgreSQL for production data persistence, with support for an in-memory storage implementation for development and testing. The database schema includes users, game rooms, and game sessions with proper relationships and constraints.

Database design decisions:
- **PostgreSQL**: Robust relational database for production use
- **Drizzle ORM**: Type-safe database operations with schema validation
- **Schema Design**: Normalized structure with proper foreign key relationships
- **Migration Support**: Drizzle Kit for database schema migrations

## Authentication and Authorization
The application uses a unique player identification system based on browser-persisted UUIDs, eliminating the need for traditional account creation:

**Player Identity System:**
- **localStorage UUID (playerId)**: Crypto.randomUUID() generated on first visit, persisted across sessions
- **Display Name**: Auto-generated as "Player-XXXXXX" using first 6 chars of UUID
- **Dual ID Architecture**: 
  - `currentUser.id`: Stable localStorage UUID used for all WebSocket communications
  - `dbUserId`: Database-assigned ID used for API queries (GameStats, achievements, etc.)
- **Session Persistence**: Each browser/device gets a unique, persistent player identity without login

**Implementation Details:**
- Player IDs stored in localStorage survive page refreshes and browser restarts
- WebSocket messages consistently use the stable localStorage UUID to prevent identification mismatches
- Database queries use separate dbUserId to prevent premature API calls before user bootstrap
- Socket actions (createRoom, joinRoom) gated on `isUserReady` flag to prevent race conditions
- Different browsers/devices automatically get different player identities

## Game State Management
Real-time game state is managed through WebSocket connections with a centralized game state system. The architecture supports multiple concurrent game rooms with different game modes and settings.

## Achievement System
The application features a comprehensive achievement system to reward player milestones and encourage engagement:

**Achievement Categories:**
- **Progression**: First word spelled, word count milestones (10, 50, 100, 500 words)
- **Accuracy**: 90%, 95%, and 100% accuracy achievements
- **Streaks**: 5-word, 10-word, and 15-word streak achievements
- **Speed**: 50+ points in single game
- **Levels**: Reaching levels 5, 10, and 20

**Technical Implementation:**
- Database table `user_achievements` with UNIQUE constraint on (user_id, achievement_id) to prevent duplicates
- Achievement definitions stored in shared schema with id, name, description, icon, color, and unlock criteria
- Automatic achievement checking after each game completion via POST to `/api/achievements/check`
- Achievement unlock logic handles duplicate attempts gracefully with try-catch error handling
- Frontend displays achievement count in header and all achievements (locked/unlocked) in GameStats card
- Uses gamesPlayed field to track total games (distinct from gamesWon) for achievement tracking
- Color-coded icons: trophy (yellow), flame (orange), brain (purple) for visual distinction

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL database service via `@neondatabase/serverless`
- **Drizzle ORM**: Database toolkit and query builder with PostgreSQL dialect
- **connect-pg-simple**: PostgreSQL session store for Express sessions

## UI Framework and Styling
- **Radix UI**: Comprehensive set of low-level UI primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Utility for creating type-safe component variants

## Development and Build Tools
- **Vite**: Build tool and development server with TypeScript support
- **React**: Frontend framework with TypeScript
- **TanStack Query**: Server state management and caching
- **Wouter**: Minimalist routing library for React

## Form and Input Handling
- **React Hook Form**: Form library with validation support
- **Zod**: Schema validation library integrated with Drizzle
- **date-fns**: Date manipulation library

## Real-time Communication
- **WebSocket (ws)**: Native WebSocket implementation for real-time multiplayer features
- **HTTP Server**: Node.js HTTP server for WebSocket upgrade handling

## Replit-specific Integrations
- **Replit Vite Plugins**: Development banner, cartographer, and runtime error modal for Replit environment
- **Development Tools**: Hot reload and debugging tools optimized for Replit