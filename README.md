# Inkwell

Inkwell is a full-stack publishing platform for reading, writing, and sharing thoughtful stories. It combines a responsive editorial interface with account-based bookmarks, appreciation, author following, draft autosave, and a serverless API.

![React](https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Frontend-000000?logo=vercel&logoColor=white)

## Features

- Responsive blue-and-white editorial interface
- Secure signup and sign-in with PBKDF2 password hashing
- Seven-day JWT authentication
- Story publishing with titles, summaries, topics, and reading-time estimates
- Automatic local draft saving and restoration
- Account-synced drafts with an author story dashboard
- Search and topic filtering
- Account-synced bookmarks and a saved-story library
- Account-synced appreciation counts
- Author follow and unfollow support
- Native sharing with clipboard fallback
- Readable story URLs, dynamic article metadata, RSS, and sitemap support
- Loading, empty, expired-session, error, and 404 states
- Protected application routes
- Light, accessible controls designed for desktop and mobile

## Architecture

```mermaid
flowchart LR
    Browser[React frontend] -->|HTTPS + JWT| Worker[Cloudflare Worker API]
    Worker -->|Prisma Accelerate| Database[(Neon PostgreSQL)]
    Vercel[Vercel] --> Browser
    Cloudflare[Cloudflare Workers] --> Worker
```

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Routing | React Router |
| API client | Axios |
| Backend | Hono on Cloudflare Workers |
| Database | Neon PostgreSQL |
| ORM | Prisma with Prisma Accelerate |
| Validation | Zod |
| Frontend hosting | Vercel |
| API hosting | Cloudflare Workers |

## Repository structure

```text
blog/
├── frontend/        React and Vite application
├── backend/         Hono Worker, Prisma schema, and migrations
├── common/          Shared Zod schemas and TypeScript types
└── README.md
```

## Prerequisites

- Node.js 18 or newer
- npm
- A Neon PostgreSQL database
- A Prisma Accelerate connection for the Cloudflare runtime
- A Cloudflare account for API deployment
- A Vercel account for frontend deployment

## Local setup

Clone the repository and install dependencies:

```bash
git clone <your-repository-url>
cd blog

cd frontend
npm install

cd ../backend
npm install
```

### Database migrations

Create `backend/.env` with a direct Neon connection string:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
```

Apply all committed migrations:

```bash
cd backend
npx prisma migrate deploy
```

Never commit `.env`, `.dev.vars`, database credentials, or JWT secrets. These files are already excluded by the backend `.gitignore`.

### Local Worker variables

For local Worker development, create `backend/.dev.vars`:

```env
DATABASE_URL="prisma://YOUR_PRISMA_ACCELERATE_URL"
JWT_SECRET="YOUR_RANDOM_SECRET"
```

Generate a development JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Start the backend:

```bash
cd backend
npm run dev
```

Copy `frontend/.env.example` to `frontend/.env.local` to point the browser at a local Worker. The deployed
Worker remains the fallback when `VITE_BACKEND_URL` is not set.

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## Environment variables

| Variable | Used by | Description |
| --- | --- | --- |
| `DATABASE_URL` | Prisma CLI | Direct Neon URL when applying migrations |
| `DATABASE_URL` | Cloudflare Worker | Prisma Accelerate `prisma://` runtime URL |
| `JWT_SECRET` | Cloudflare Worker | Secret used to sign and verify authentication tokens |
| `FRONTEND_URL` | Cloudflare Worker | Deployed frontend origin used by the API CORS policy |

Production variables should be configured as encrypted Cloudflare Worker secrets or dashboard-managed runtime variables. The repository sets `keep_vars = true`, so Wrangler deployments preserve variables managed in the Cloudflare dashboard.

## Available scripts

### Frontend

```bash
npm run dev       # Start Vite development server
npm run build     # Type-check and create a production build
npm run lint      # Run ESLint with zero warnings allowed
npm run format    # Format frontend, backend, and shared TypeScript sources
npm run format:check # Verify formatting without changing files
npm run preview   # Preview the production build locally
```

### Backend

```bash
npm run dev       # Start the Worker locally with Wrangler
npm run test      # Run backend unit and route tests
npm run typecheck # Type-check the Worker without emitting files
npm run deploy    # Generate the engine-free Prisma client and deploy
```

## API routes

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | Worker health check |
| `POST` | `/api/v1/user/signup` | Create an account |
| `POST` | `/api/v1/user/signin` | Authenticate an account |
| `GET` | `/api/v1/blog/bulk` | List published stories with pagination, search, topic, and saved filters |
| `GET` | `/api/v1/blog/:id` | Read one published story |
| `POST` | `/api/v1/blog` | Publish a story |
| `PUT` | `/api/v1/blog` | Update an owned story |
| `POST` | `/api/v1/blog/drafts` | Create or update an account-synced draft |
| `GET` | `/api/v1/blog/drafts/:id` | Load an owned draft |
| `GET` | `/api/v1/blog/mine` | List the current author's drafts and stories |
| `POST` | `/api/v1/blog/:id/publish` | Publish an owned draft |
| `DELETE` | `/api/v1/blog/:id` | Delete an owned draft or story |
| `POST` | `/api/v1/blog/:id/bookmark` | Save or unsave a story |
| `POST` | `/api/v1/blog/:id/clap` | Add or remove appreciation |
| `POST` | `/api/v1/blog/author/:id/follow` | Follow or unfollow an author |

Published story list and detail routes are public. Supplying an optional `Authorization: Bearer <token>` header
adds the current reader's bookmark, appreciation, and follow state. Publishing and interaction routes require a
valid token.

The list route accepts `page`, `limit` (maximum 24), `search`, `topic`, and `saved=true` query parameters.
The saved filter requires authentication.

The Worker also serves `/sitemap.xml`, `/rss.xml`, and crawler-friendly `/share/:slug` pages. New public
stories use `/story/:slug`; existing `/blog/:id` links remain supported.

## Deploy the backend to Cloudflare Workers

Authenticate with Cloudflare:

```bash
cd backend
npx wrangler login
```

If the Worker does not already have its runtime variables, add them through the Cloudflare dashboard or Wrangler:

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put JWT_SECRET
```

Deploy:

```bash
npm run deploy
```

Inspect live logs:

```bash
npx wrangler tail backend --format pretty
```

## Deploy the frontend to Vercel

Import the Git repository into Vercel and configure:

| Setting | Value |
| --- | --- |
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

The included `frontend/vercel.json` rewrites client-side routes to `index.html`, allowing direct navigation to routes such as `/signin`, `/blogs`, and `/blog/:id`.

You can also deploy through the CLI:

```bash
cd frontend
npx vercel
npx vercel --prod
```

## Production checks

Before deploying a release:

```bash
cd frontend
npm run lint
npm run build

cd ../backend
npx prisma generate --no-engine
npx tsc --noEmit
```

Then confirm:

- Database migrations have been applied
- Cloudflare runtime variables are present
- `/health` returns `{ "status": "ok" }`
- Signup, sign-in, publishing, bookmarking, and following work against production
- The Vercel frontend points to the correct Worker URL

## Security

- Passwords are derived with PBKDF2-SHA-256 and unique random salts.
- Existing legacy passwords are upgraded after successful authentication.
- JWTs expire after seven days.
- Sensitive values are never committed to the repository.
- API errors avoid exposing database credentials, tokens, or submitted passwords.

## Contributing

1. Create a feature branch.
2. Make focused changes.
3. Run the frontend lint and production build.
4. Run the backend TypeScript check.
5. Open a pull request describing the behavior and verification performed.
