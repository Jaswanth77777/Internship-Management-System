# InternHub — Internship Management System

InternHub is being developed as a responsive web application with a React client, Express API and PostgreSQL database. The existing 3D HTML prototype remains in the repository unchanged.

## Project structure

- `client/` — React + Vite responsive portal UI
- `server/` — Express REST API, JWT authentication and Prisma data layer
- `server/prisma/schema.prisma` — internship, application, logbook and role data models

## Requirements

- Node.js 20+
- PostgreSQL 14+

## Run locally

1. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL` and a strong `JWT_SECRET`.
2. Install dependencies from the repository root: `npm install`.
3. Generate Prisma client: `npm run db:generate`.
4. Create database tables: `npm run db:migrate`.
5. Start client and API: `npm run dev`.
6. Open `http://localhost:5173`; API health: `http://localhost:4000/api/health`.

Set `VITE_API_URL` in `client/.env` if the API is hosted elsewhere.

## Current implementation

This branch is the first full-stack foundation, not a finished production deployment. It includes registration/login endpoints, JWT authentication, role checks, internship browsing/posting, student applications, a weekly logbook API, an admin overview endpoint and an initial responsive portal. The original 3D HTML prototype and its existing login/logbook implementation are retained unchanged.

The old prototype's demo password is not a production credential and is not automatically seeded into PostgreSQL. Create accounts through `POST /api/auth/register` before signing in.

## Remaining work

Faculty/company/admin workflow screens and endpoints, full student profile and document workflows, interviews/offers/NOC/attendance/tasks/evaluations/certificates, file upload/storage, email notifications, audit coverage, rate limiting, automated tests, accessibility review, mobile PWA polish, deployment configuration and security review are still required before production use.

Never commit real secrets or student personal data.
