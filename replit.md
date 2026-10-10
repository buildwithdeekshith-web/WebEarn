# WebEarn

WebEarn connects small businesses that need affordable websites with students who build paid portfolios through real client projects.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/webearn` — responsive marketplace UI and Clerk sign-in flow
- `artifacts/api-server` — Express API, Clerk middleware, and project workflows
- `lib/db/src/schema/webearn.ts` — PostgreSQL tables
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/seed.sql` — reusable demo data
- `README.md` — setup and workflow documentation

## Architecture decisions

- Clerk owns sign-in and sessions; WebEarn stores the account role and marketplace profile.
- Payment records are mock escrow states only; the MVP does not accept or transfer money.
- Public demo listings are browseable before sign-in; posting, proposals, messages, and approvals require authenticated participants.
- WebEarn API types and validators are generated from the OpenAPI contract.

## Product

Businesses can post website briefs and select student proposals. Students can discover work, collaborate in a workspace, submit previews, earn reviews, and add approved work to their portfolios. Admin endpoints cover users, projects, disputes, and mock payment records.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After editing `lib/api-spec/openapi.yaml`, run codegen before relying on API hooks or validators.
- Seeded profiles are demo content, not Clerk accounts; users create real accounts through Clerk sign-up.
- For local development, set both `PORT` and `BASE_PATH` before running the web artifact.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
