# TODO API

A small REST API for personal todo lists with JWT authentication.

**Stack:** NestJS 12 · TypeScript · Prisma 6 · SQLite · Jest

## Quick start

Requires Node.js 20+ and npm 11.

```bash
npm ci                         # also runs `prisma generate`
cp .env.example .env           # local defaults; works as-is
npx prisma migrate deploy      # creates prisma/dev.db
npm run start:dev              # http://localhost:3000, Swagger UI at /docs
```

## Tests

```bash
npm run test         # unit tests (services, Prisma mocked)
npm run test:e2e     # end-to-end tests against a throwaway SQLite file
```

The e2e suite does not read `.env`. It migrates its own database at `test/test.db` before the run and clears it before each test. It runs in one process (`--runInBand`), so suites never wipe each other's data.

Other checks: `npm run lint`, `npm run format:check`, `npx tsc --noEmit`.

## Endpoints

All `/todos` routes and `/users/me` require `Authorization: Bearer <access_token>`.

| Method | Path | Body | Success |
|---|---|---|---|
| POST | `/users/signup` | `{ id, password }` | 201 `{ id }` |
| POST | `/users/login` | `{ id, password }` | 200 `{ access_token }` |
| GET | `/users/me` | | 200 `{ id }` |
| PUT | `/users/me` | `{ password }` | 200 `{ id }` |
| DELETE | `/users/me` | | 204 |
| POST | `/todos` | `{ title, description?, completed? }` | 201 todo |
| GET | `/todos` | | 200 todo[] (newest first) |
| GET | `/todos/search?keyword=` | | 200 todo[] |
| GET | `/todos/:id` | | 200 todo |
| PUT | `/todos/:id` | any of `{ title, description, completed }` | 200 todo |
| DELETE | `/todos/:id` | | 204 |

Errors use Nest's standard shape `{ statusCode, message, error }`:
- **400:** validation failed, an unknown field was sent, or an id isn't numeric
- **401:** missing, invalid or expired token, or bad credentials
- **404:** not found, or owned by someone else
- **409:** the user id is already taken

Validation rules:
- `id` must be 4-20 characters of letters, numbers or `_`.
- `password` must be at least 8 characters.
- `title` must be 1-200 characters; `description` at most 2000.

## Design decisions

- **A user is only `{ id, password }`.** The `id` is chosen at signup and is the primary key and the JWT subject. It can't be changed, so `PUT /users/me` changes only the password.
- **Another user's todo returns 404, not 403.** Every todo query is filtered by the caller's id, and update and delete use `updateMany`/`deleteMany` with `{ id, userId }`. A todo you don't own is indistinguishable from one that doesn't exist.
- **Deleting an account deletes its todos** (`onDelete: Cascade`). The JWT strategy loads the user on every request, so a deleted user's token stops working at once.
- **`PUT /todos/:id` is a partial update.** Omitted fields keep their values.
- **`/todos/search` is declared before `/todos/:id`**, otherwise Nest would treat "search" as an id. It matches `title` or `description` and ignores ASCII letter case (SQLite `LIKE`). The keyword is trimmed and must not be empty.
- **Passwords never leave `UsersService`.** Every query that returns a user selects only `{ id }`. Passwords are hashed with bcrypt (`bcryptjs`, pure JS, so `npm ci` needs no native build).
- **Login gives the same 401 for a wrong password and an unknown id.** It also runs a bcrypt compare in both cases, so response time doesn't reveal which ids exist.
- **Access token only.** There are no refresh tokens. Changing the password doesn't revoke tokens already issued; they stay valid until they expire (`JWT_EXPIRES_IN`). Changing the password doesn't ask for the current one.
- **Prisma 6, not 7.** Prisma 7 needs a driver adapter, `prisma.config.ts` and an ESM client. That adds setup and Jest-compatibility risk with no benefit for this scope.
- **Prisma errors are mapped once.** `PrismaExceptionFilter` turns P2002 into 409 and P2025 into 404, so services have no try/catch.

## Project structure

```
src/
  main.ts, app.setup.ts     bootstrap; global ValidationPipe + filters (shared with e2e)
  config/                   env validation (fails fast at boot)
  prisma/                   global PrismaService
  common/                   @CurrentUser decorator, Prisma exception filter
  auth/                     hashing, JWT signing, JwtStrategy, JwtAuthGuard
  users/                    /users routes
  todos/                    /todos routes
prisma/                     schema + migrations
test/                       e2e specs and harness
```
