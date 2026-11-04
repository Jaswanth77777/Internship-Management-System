# InternHub — Internship Management System

InternHub is a role-based internship management application. The existing dark-themed HTML prototype is preserved at the repository root. The full-stack application lives in `client/` and `server/`.

## What is included

- React + Vite client with the existing email/password login screen and session flow preserved.
- Express API with password hashing, JWT authentication, role checks, input validation, Helmet headers, CORS allowlisting and login/registration rate limiting.
- PostgreSQL data models managed with Prisma.
- Student: browse open internships, apply, track application decisions, submit weekly logbooks, request NOCs and view in-app notifications.
- Faculty: view allocated students, allocate students, approve/reject allocated students' NOC requests and review their weekly logbooks.
- Company: post internship opportunities, review applicants and update application statuses.
- Admin: view platform counts, activate/deactivate users, verify companies and approve/close internship postings.
- In-app notifications for application updates, NOC decisions, logbook reviews and company verification.
- Responsive layouts for desktop and mobile.

## Technology

- Frontend: React, Vite, Tailwind-compatible CSS styling and Lucide icons
- Backend: Node.js, Express
- Database: PostgreSQL + Prisma
- Authentication: bcrypt password hashing + JWT
- Hosting templates: Vercel (client) and Render (API + PostgreSQL)

## Run locally

Requirements: Node.js 20+ and PostgreSQL 14+.

1. Copy `server/.env.example` to `server/.env`.
2. Set `DATABASE_URL` to your PostgreSQL database and set a unique `JWT_SECRET`.
3. Install dependencies from the repository root: `npm install`.
4. Generate Prisma Client: `npm run db:generate`.
5. Create/update the database schema: `npm run db:push`.
6. Start the API and frontend: `npm run dev`.
7. Open `http://localhost:5173`. API health check: `http://localhost:4000/api/health`.

For a hosted API, set `VITE_API_URL` in the Vercel project to the API base URL ending in `/api`. Set the API's `CLIENT_ORIGIN` to the deployed frontend origin (comma-separated origins are supported).

## Accounts and login

The login screen and sign-in flow have intentionally not been redesigned. The database starts empty; the old HTML prototype's demo credentials are not automatically valid in PostgreSQL.

- Student, Faculty and Company accounts can be created with `POST /api/auth/register` using JSON fields `name`, `email`, `password` (minimum 8 characters) and `role` (`STUDENT`, `FACULTY` or `COMPANY`).
- Admin accounts are not publicly self-registerable. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (minimum 12 characters) and optional `ADMIN_NAME` in `server/.env`, then run `npm run seed:admin`.
- The seed command creates or updates that admin account. Keep the admin password private.

Faculty allocation is required before a faculty account can see a student's NOC requests or logbook entries. Faculty can select registered students in the My Students section.

## Deploy

### Vercel frontend

1. Import this GitHub repository into Vercel.
2. Set the project root to the repository root (the included `vercel.json` builds `client/` and publishes `client/dist`).
3. Add `VITE_API_URL=https://YOUR-API-HOST/api`.
4. Deploy.

### Render API and database

1. In Render, create a new Blueprint from this repository and select `render.yaml`.
2. Render provisions the PostgreSQL database and API service. The blueprint asks for `CLIENT_ORIGIN`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`; use your real Vercel frontend origin and a unique admin password.
3. After the first deploy, run `npm run seed:admin -w server` in the API service shell to create the admin login.
4. Confirm the API health endpoint returns `{"status":"ok","service":"InternHub API"}`.
5. If the frontend is already deployed, ensure `VITE_API_URL` points to the Render API URL plus `/api`, and `CLIENT_ORIGIN` matches the Vercel origin.

The Render blueprint runs Prisma schema synchronization during build. For a production system with valuable data, use reviewed Prisma migrations and database backups before future schema changes.

## API workflow routes

- Authentication: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Student: `GET /api/internships`, `POST /api/applications`, `GET /api/applications/mine`, `GET/POST /api/logbook`, `GET/POST /api/nocs`, `GET /api/nocs/mine`
- Company: `GET /api/company/internships`, `GET /api/company/applications`, `PATCH /api/company/applications/:id/status`, `POST /api/internships`
- Faculty: `GET /api/faculty/students`, `GET /api/faculty/available-students`, `POST /api/faculty/allocations`, `GET/PATCH /api/faculty/nocs`, `GET/PATCH /api/faculty/logbook`
- Admin: `GET /api/admin/overview`, `GET/PATCH /api/admin/users`, `GET/PATCH /api/admin/companies`, `GET/PATCH /api/admin/internships`
- Notifications: `GET /api/notifications`, `PATCH /api/notifications/:id/read`

## Important limitations before production

- Notifications are currently in-app only; email/SMS delivery is not configured.
- Resume/document upload and private file storage are not implemented; the application currently accepts an optional resume URL.
- Automated integration tests, formal Prisma migration history, backups/restore drills, monitoring and a full security review remain necessary before handling real student data.
- GitHub Pages serves the existing static HTML prototype. The new React/API full-stack app should be deployed with the included Vercel + Render setup.
- Do not commit `.env` files, credentials or real student information.
