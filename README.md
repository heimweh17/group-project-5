# ScamShield Hub

ScamShield Hub is a full-stack, case-based cybersecurity learning platform for practising phishing and scam detection. Learners inspect realistic email, SMS, and website scenarios, make a classification decision, receive immediate feedback, and track progress over time.

Built as a group software engineering project, the application demonstrates an end-to-end web system: a React single-page application, an Express REST API, MongoDB persistence, authenticated user flows, transactional email verification, social learning features, and a moderation dashboard.

**Live application:** [scamshieldhub.vercel.app](https://scamshieldhub.vercel.app)<br>
**API health check:** [group-project-5-iji1.onrender.com/api/health](https://group-project-5-iji1.onrender.com/api/health)

> The API runs on Render's free tier and may take a short time to wake up after inactivity.

## Problem and Approach

Scam-awareness material is often passive: people read advice but do not practise applying it to concrete examples. ScamShield Hub turns that advice into short, repeatable decisions. It combines immediate feedback with progress data and optional social features so users can learn, compare results, and revisit completed cases for review.

## Product Highlights

- Verified account creation through a six-digit email code
- Interactive phishing practice cases across email, SMS, and website formats
- Immediate feedback and explanations after each answer
- Learning metrics including score, level, accuracy, badges, and completed cases
- Comments, public profiles, friend connections, direct messages, and group leaderboards
- Role-protected tools for case management and moderation

## Current Feature Set

### User Features

- Register with email verification via a 6-digit Resend code
- Log in and persist a JWT-authenticated session
- Browse the case feed
- Filter and search cases by type and difficulty
- Answer cases with `scam`, `safe`, or `unsure`
- Review completed cases later from the feed and profile
- Comment on cases
- View personal and public profiles
- See progress analytics such as score, accuracy, badges, recent activity, and answered cases
- Use global, friends, and custom group leaderboards
- Send friend requests and private messages to accepted friends

### Admin Features

- View platform overview statistics
- Create new cases
- Edit existing cases
- Publish or unpublish cases
- Delete cases
- Review and delete comments
- View user summaries and activity details
- Delete user accounts

## Tech Stack

### Frontend

- React
- React Router
- Vite
- Plain CSS

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- JWT authentication
- bcrypt password hashing
- Resend for email verification

### Deployment

- Vercel for the frontend
- Render for the API
- MongoDB Atlas for persistent data

## Architecture

```text
React + Vite SPA (Vercel)
          |
          | HTTPS / JSON REST API
          v
Express API (Render)
  | JWT authentication and authorization
  | case scoring, profiles, moderation, messaging
  |
  +--> MongoDB Atlas: users, cases, votes, comments, messages, groups
  +--> Resend: six-digit verification email delivery
```

The frontend uses React Router for client-side navigation, an authentication context for session state, and a shared API client. The backend separates route handlers, Mongoose models, middleware, utility functions, and the email service. This keeps the application small enough for a group project while maintaining clear boundaries between UI, business logic, and persistence.

## Key Workflows

### Account verification

1. A user submits a username, email address, and password.
2. The API creates a temporary `PendingSignup` record and sends a six-digit code through Resend.
3. The user enters the code.
4. Only then is the permanent user account created and eligible to sign in.

Temporary signups expire automatically, so unfinished registrations do not permanently reserve a username or email address.

### Case learning

1. The learner browses, filters, searches, or sorts the case feed.
2. They open a case and choose `scam`, `safe`, or `unsure`.
3. The API stores one answer per user per case, updates learning metrics, and returns feedback.
4. Completed cases remain accessible in the feed and through user profiles.

The current scoring policy awards 10 points for a correct `scam` or `safe` answer, 2 points for an incorrect answer, and 1 point for `unsure`.

## Project Structure

```text
group-project-5/
├─ src/                      # Frontend application
│  ├─ components/
│  ├─ context/
│  ├─ lib/
│  └─ pages/
├─ public/                   # Static frontend assets
├─ backend/
│  ├─ src/
│  │  ├─ config/
│  │  ├─ middleware/
│  │  ├─ models/
│  │  ├─ routes/
│  │  ├─ services/
│  │  └─ utils/
│  └─ scripts/
│     ├─ makeAdmin.js
│     └─ seedCases.js
├─ index.html
├─ package.json
└─ vercel.json
```

## Local Development Setup

### Prerequisites

- Node.js 20+ (LTS recommended)
- A MongoDB Atlas database or compatible MongoDB deployment
- A Resend API key and verified sending domain for email verification

### 1. Install dependencies

From the project root:

```bash
npm install
npm --prefix backend install
```

### 2. Configure environment variables

Create the frontend `.env` in the project root:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

Create `backend/.env`:

```env
PORT=4000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLIENT_ORIGIN=http://localhost:5173
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=your_verified_sender_address
```

Do not commit real credentials. Rotate any credential that is ever shared accidentally.

### 3. Start the backend

```bash
npm --prefix backend start
```

For development watch mode:

```bash
npm run dev:backend
```

### 4. Start the frontend

```bash
npm run dev
```

Then open:

```text
http://localhost:5173
```

### 5. Check backend health

```text
http://localhost:4000/api/health
```

## Quality Checks

Run these before opening a pull request or deploying frontend changes:

```bash
npm run lint
npm run build
```

The application has also been validated through manual end-to-end flows covering registration and verification, login, case answering, profile updates, leaderboards, friend/message workflows, and administrator moderation.

## Deployment

### Deployment Model

The production deployment uses:

- Frontend on Vercel
- Backend on Render
- MongoDB Atlas for the database
- Resend for email delivery

### Frontend Deployment

The frontend is a Vite application and can be deployed to Vercel as a static site.

Important frontend environment variable:

```env
VITE_API_BASE_URL=https://your-backend-domain/api
```

The included `vercel.json` handles SPA route rewrites so refreshes on routes like `/cases` or `/profile` do not break.

### Backend Deployment

Deploy the `backend` folder as a Node.js web service.

Required backend environment variables:

```env
PORT=10000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLIENT_ORIGIN=https://your-frontend-domain
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=your_verified_sender_address
```

Important note:

- `CLIENT_ORIGIN` must exactly match the frontend domain
- Do not include a trailing slash in `CLIENT_ORIGIN`

## Demo and Admin Setup

### Create a normal user

Use the app registration flow:

1. Enter username, email, and password
2. Receive a 6-digit verification code by email
3. Enter the code to finish account creation
4. Log in

### Promote an admin

From the project root:

```bash
npm --prefix backend run make-admin -- user@example.com
```

Then log out and log back in so the frontend reloads the updated role.

## API Overview

The backend exposes these main route groups:

- `/api/auth`
- `/api/cases`
- `/api/users`
- `/api/leaderboard`
- `/api/messages`
- `/api/admin`
- `/api/health`

## Seed Script Safety

The original seed process was destructive because it deleted the full case collection and recreated case records with new IDs. That caused manually added cases to be lost and older vote-to-case links to break.

To protect live data:

- Root-level `npm run seed` is intentionally disabled
- `backend/scripts/seedCases.js` now refuses to run unless this variable is explicitly set:

```env
ALLOW_DESTRUCTIVE_SEED=true
```

Even with that flag, the seed script should only be used when the team explicitly agrees to reset the case database.

## Recommended Team Workflow

- Do normal frontend work from the project root
- Do backend work inside `backend/`
- Avoid running destructive scripts unless the team agrees first
- Test locally before pushing
- Use the deployed frontend and backend URLs only after verifying CORS and environment variables

## Known Operational Notes

- The free backend host may cold start after inactivity
- The frontend depends on the backend being reachable at the configured API base URL
- Email verification depends on a valid Resend API key and verified sender domain
- If case documents are deleted and recreated, older vote history may lose case links and appear as `Unknown case`

## Scripts

### Root scripts

```bash
npm run dev           # Start frontend dev server
npm run dev:backend   # Start backend in watch mode
npm run build         # Build frontend
npm run lint          # Lint frontend code
npm run preview       # Preview built frontend
```

### Backend scripts

```bash
npm --prefix backend start
npm --prefix backend run dev
npm --prefix backend run make-admin -- user@example.com
```

## Contributors

Group 5 project team.
