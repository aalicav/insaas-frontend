# Integration Hub — Frontend

Angular 19 + Angular Material MVP for the NestJS backend in `saas`.

## Stack

- Angular 19 (standalone components, lazy routes)
- Angular Material with dark theme aligned to email brand tokens
- JWT Bearer auth (`sessionStorage`)
- Permission-aware navigation and route guards

## Brand tokens

Copied from backend `MAIL_BRAND`:

- Background: `#000000` / `#080808` / `#0f0f0f`
- Text: `#f0f0f0` / `#a1a1aa` / `#71717a`
- Accent: `#d4547e`
- Product name: **Integration Hub**

## Prerequisites

- Node.js 20+ (LTS recommended)
- Backend running at `http://localhost:3000`
- Backend env:
  - `APP_FRONTEND_URL=http://localhost:4200`
  - `CORS_ORIGIN=http://localhost:4200,http://localhost:3000`
  - Bootstrap admin (`BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`) if the DB is empty

## Setup

```bash
cd insaas-frontend
npm install
npm start
```

App: [http://localhost:4200](http://localhost:4200)

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Dev server on `:4200` |
| `npm run build` | Production build |
| `npm test` | Unit tests (Karma/Jasmine) |

## MVP routes

| Route | Description |
|-------|-------------|
| `/login` | Login |
| `/accept-invite?token=` | Accept invitation (email link) |
| `/dashboard` | Metrics cards (permission-aware) |
| `/connections` | Connections list |
| `/connections/new` | Dynamic connect flow (OAuth or credentials form) |
| `/connections/:id` | Detail + sync polling |
| `/connections/oauth-callback` | OAuth return page |
| `/people` | People list + filters |
| `/people/new`, `/people/:id`, `/people/:id/edit` | CRUD |
| `/organizations` | Members, invites, roles |
| `/profile` | Name + password |

## Auth notes

- Token is stored in `sessionStorage` (`ih.accessToken`)
- There is no refresh token; expired JWT → redirect to `/login`
- UI and routes respect `permissions[]` from `GET /auth/me`
- Organization switcher calls `POST /auth/switch-organization`

## OAuth flow

1. Frontend creates connection (`POST /connections`)
2. If `next.kind === 'redirect'`, browser opens provider URL
3. Provider returns to backend `GET /connections/oauth/callback`
4. Backend processes tokens and **redirects** to  
   `{APP_FRONTEND_URL}/connections/oauth-callback?connectionId=…&status=…`  
   (or `?error=…` on failure)
5. Frontend shows status and links back to the connection

Open-redirect protection: redirect origin must match `APP_FRONTEND_URL` and be allowed by `CORS_ORIGIN` (plus localhost:4200).

## API base URL

Configured in `src/environments/environment*.ts` (`apiBaseUrl`). No `/api` prefix.
