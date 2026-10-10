# WebEarn

WebEarn connects small businesses looking for affordable websites with students who want paid, real-world web development experience.

## Run on Replit

The workspace has managed web and API workflows. Start the app from Replit's Run controls. The application uses the workspace PostgreSQL database and Replit-managed Clerk authentication.

To create or update the development database and load example marketplace data:

```sh
pnpm --filter @workspace/db run push
pnpm --filter @workspace/db run seed
```

## Run locally

Requirements: Node.js 24, pnpm, PostgreSQL, and a Clerk development instance.

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env` and fill in the local PostgreSQL and Clerk development values.
3. Run `pnpm --filter @workspace/db run push` and `pnpm --filter @workspace/db run seed`.
4. In one terminal, run `PORT=5000 pnpm --filter @workspace/api-server run dev`.
5. In another terminal, run `PORT=3000 BASE_PATH=/ pnpm --filter @workspace/webearn run dev`.
6. Open the Vite address printed in the second terminal.

Do not commit `.env`. Development and production Clerk accounts are separate.

## Demo data and accounts

The seed command creates sample business and student profiles, open listings, proposals, active and submitted workspaces, a dispute, mock payments, and reviews. The sample marketplace is visible without signing in. To try actions that require an account, create one through the app's Clerk sign-up screen and select a business or student role during onboarding. Demo profile rows are sample content, not reusable Clerk credentials.

To grant an account administrator access, set its trusted Clerk session claim `metadata.role` to `admin` using the Clerk user-management controls. Admin access cannot be self-selected during onboarding.

## Core workflow

- Businesses create website briefs and review student proposals.
- Students discover projects and submit a price, message, timeline, and portfolio links.
- Accepting a proposal creates a workspace with private messages and milestones and marks the mock payment as held.
- Students share preview/final links. Businesses can request revisions or approve work.
- Approval completes the project and releases its mock payment record; this does not charge or transfer real money.
- Either project participant can open a dispute. Admins can resolve disputes and choose a mock release/refund outcome.
- Both participants can leave a review after completion. An approved preview link is added to the student's profile portfolio.

## Architecture

- React, Vite, TypeScript, Wouter, Tailwind CSS, and generated TanStack Query hooks
- Express API with Clerk session authentication and role checks
- PostgreSQL through Drizzle ORM
- OpenAPI source of truth at `lib/api-spec/openapi.yaml`; regenerate with `pnpm --filter @workspace/api-spec run codegen`
- Development schema changes: `pnpm --filter @workspace/db run push`
- Seed data: `lib/db/seed.sql`, applied with `pnpm --filter @workspace/db run seed`
- Payment behavior is a mock hold/release state only; Stripe or Razorpay can be integrated later.

## Checks

```sh
pnpm run typecheck
pnpm --filter @workspace/webearn run typecheck
pnpm --filter @workspace/api-server run typecheck
```
