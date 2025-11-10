# Bad Apple 🐝

An educational gaming platform focused on language learning through interactive spelling and grammar games. Built with React, Express, and real-time multiplayer functionality.

## Features

### Game Modes
- **Spelling Bee** - Test your spelling skills with words from a comprehensive dictionary
  - Single-player practice mode
  - Multiple difficulty levels (easy, intermediate, advanced, expert)
  - Hint system (first letter, definition, example sentence)
  - Speech synthesis for word pronunciation

- **Grammar Game** - Master grammar concepts through interactive challenges
  - Parts of speech identification
  - Sentence structure analysis
  - Multiple choice questions with explanations

### Multiplayer Classroom Competition
- **Real-time multiplayer** using WebSocket connections
- **Multiple competition types:**
  - **Timed Challenge** - Race against the clock with time bonuses for correct answers
  - **Elimination Mode** - One mistake and you're out
  - **Standard Mode** - Traditional classroom spelling bee format
- **Live leaderboards** with real-time score updates
- **Room-based system** with customizable settings

### Progress Tracking
- **Achievement System** - Unlock achievements for milestones
  - Progression achievements (word count milestones)
  - Accuracy achievements (90%, 95%, 100%)
  - Streak achievements (consecutive correct answers)
  - Speed achievements
  - Level achievements
- **Statistics Dashboard** - Track your performance over time
  - Total games played and won
  - Accuracy percentage
  - Best streak
  - Current level and progress

### User Experience
- **No login required** - Unique player ID generated automatically
- **Dark mode support** - Comfortable viewing in any lighting
- **Responsive design** - Works on desktop and mobile devices
- **Real-time feedback** - Instant visual feedback for correct/incorrect answers

## Tech Stack

### Frontend
- **React** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** components (built on Radix UI)
- **TanStack Query** for server state management
- **Wouter** for routing
- **WebSocket** for real-time multiplayer

### Backend
- **Express.js** with TypeScript
- **WebSocket (ws)** for real-time communication
- **PostgreSQL** with Drizzle ORM for user data and progress
- **MongoDB Atlas** for word and grammar question databases
- **Zod** for schema validation

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account (for word/grammar databases)
- PostgreSQL database (or use Replit's built-in database)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd bad-apple
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `MONGODB_URI` - Your MongoDB Atlas connection string
     - Go to MongoDB Atlas → Database → Connect → Connect your application
     - Copy the connection string and replace `<password>` with your database password
   - `DATABASE_URL` - PostgreSQL connection string
     - If using Replit, this is automatically provided
     - Otherwise: `postgresql://user:password@host:port/database`
   - `SESSION_SECRET` - Random string for session encryption (minimum 32 characters)
     - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

4. **Set up MongoDB Collections**

   Your MongoDB Atlas database should have the following structure:
   - Database: `wordDB`
     - Collection: `ex1DB` (spelling words)
   - Database: `test`
     - Collection: `grammarGame` (grammar questions)

   **Word Document Format:**
   ```json
   {
     "word": "example",
     "definition": "A thing characteristic of its kind or illustrating a general rule",
     "difficulty": "intermediate",
     "exampleSentence": "This is an example of proper usage"
   }
   ```

   **Grammar Question Format:**
   ```json
   {
     "question": "What part of speech is 'quickly'?",
     "options": ["Noun", "Verb", "Adverb", "Adjective"],
     "correctAnswer": "Adverb",
     "explanation": "Words ending in -ly that modify verbs are typically adverbs",
     "difficulty": "intermediate"
   }
   ```

5. **Initialize the database**
   ```bash
   npm run db:push
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5000`

## Development

### Project Structure
```
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities and helpers
├── server/              # Backend Express application
│   ├── db.ts           # PostgreSQL database connection
│   ├── mongodb.ts      # MongoDB connection
│   ├── routes.ts       # API routes and WebSocket handlers
│   └── storage.ts      # Storage abstraction layer
├── shared/             # Shared code between client and server
│   └── schema.ts       # Database schemas and types
└── migrations/         # Database migrations
```

### Available Scripts
- `npm run dev` - Start development server (frontend + backend)
- `npm run build` - Build for production
- `npm run db:push` - Push database schema changes
- `npm run db:studio` - Open Drizzle Studio (database GUI)

### Testing
The application includes end-to-end testing capabilities using Playwright. Tests cover:
- Single-player game flows
- Multiplayer room creation and joining
- Real-time competition mechanics
- Achievement unlocking
- Progress tracking

## Deployment

This project is optimized for deployment on **Replit**, but can be deployed anywhere that supports Node.js applications.

### Deploying on Replit
1. Import the repository to Replit
2. Replit will automatically detect and install dependencies
3. Set environment variables in the Secrets tab
4. Click "Run" to start the application

### Deploying Elsewhere
1. Build the project: `npm run build`
2. Set environment variables on your hosting platform
3. Start the server: `node server/index.js`
4. Ensure WebSocket connections are supported by your hosting provider

## Database Schema

### Word Collections (MongoDB)
Words are sourced from MongoDB Atlas with 19,339+ words across difficulty levels.

### User Data (PostgreSQL)
- **users** - User profiles and progress
- **game_sessions** - Multiplayer game session data
- **game_rooms** - Active multiplayer rooms
- **user_achievements** - Achievement unlock tracking

## Architecture Highlights

### Player Identity System
- **UUID-based identification** - Each browser gets a unique, persistent player ID
- **No registration required** - Auto-generated display names (e.g., "Player-A1B2C3")
- **Dual ID architecture** - Separate localStorage UUID for WebSocket and database ID for persistence

### Real-time Multiplayer
- **Server-authoritative game state** - All validation happens server-side
- **WebSocket communication** - Instant updates for all players
- **Room management** - Support for multiple concurrent games
- **Reconnection handling** - Players can rejoin if disconnected

### Achievement System
- **Automatic tracking** - Progress checked after every game
- **Duplicate prevention** - Database constraints prevent unlocking achievements twice
- **Multiple categories** - Progression, accuracy, streaks, speed, and levels

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for educational purposes.

## Acknowledgments

- Word database sourced from MongoDB Atlas
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

---

Built with ❤️ for education and language learning
