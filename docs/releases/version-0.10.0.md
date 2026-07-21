# Version 0.10.0 Release

- **Release date:** 21-Jul-2026
- **Version:** 0.10.0
- **Issues:** [GitHub Issues](https://github.com/UTSC-CSCC01-Software-Engineering-I/course-project-make-no-mistakes/issues)

## Major Changes

- Replaced hardcoded proposal, comment, and submission data with database-backed REST endpoints.
- Split authentication and application data across separate Supabase projects.
- Added authenticated comments and one-vote-per-user proposal/comment voting.
- Added database-backed filtering by date, ID, popularity, rating, and vote threshold.
- Added per-user GeoJSON map submissions with backend ownership validation.
- Added real-time Socket.IO rooms for comments, votes, and private map updates.
- Added a three-service Docker Compose deployment with client, server, and HTTPS gateway containers.
- Added HTTP-to-HTTPS redirection, static-asset caching, health checks, and Supabase session-pooler support.
- Added backend tests for voting, comments, map ownership, and database connection handling.

## Running This Release

1. Copy `server/.env.example` to `server/.env` and enter the Auth Supabase and data Postgres credentials.
2. Run `docker compose up --build` from the repository root.
3. Open `https://localhost` and accept the local self-signed certificate warning.
4. Stop the release with `docker compose down`.
