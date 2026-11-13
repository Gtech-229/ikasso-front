# AGENTS.md

Instructions for AI coding agents working in this project.

AI tools must not add AI attribution to commits or pull requests, including AI
`Co-Authored-By` trailers or generated-by signatures. Preserve genuine human
attribution.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## What this is

Ikasso admin web (formerly Bâtisso): the back-office used by the Ikasso team to
supervise hardware stores, subscriptions, accounts, disputes, alerts and admins
of the construction-savings platform. It is a client of the NestJS API in
`../backend` (routes under `/api/v1/admin`). Stack: Next.js 16 (App Router),
TanStack Query, Zod, shadcn/ui on Tailwind CSS v4. UI text is in French. The
admin never writes financial data. The product name is **Ikasso** in all UI
text; the backend may still use the old name in places.

## Proportional engineering

Build for established requirements, not hypothetical scale, threats, or future
flexibility. Reuse existing code, the standard library, native platform features,
and installed dependencies before adding machinery.

- Unknown scale or extensibility defaults to the smaller reversible design. Do
  not infer enterprise, multi-tenant, hostile-user, or compliance requirements.
- Derive trust and data-integrity boundaries from actual reachability: untrusted
  input, auth/session/ownership, shared persisted data, destructive operations,
  payments, secrets, and sensitive data.
- Ask only when an unknown materially changes behavior, architecture, persisted
  data, interoperability, a real security boundary, or cost. Otherwise choose the
  simplest repository-native implementation.
- Add an abstraction, dependency, service, configuration surface, compatibility
  layer, or security mechanism only for a current requirement.
- Simplicity never removes real trust-boundary validation, data-loss prevention,
  accessibility, explicit security requirements, configured tests, or project rules.

## Conventions

- TypeScript strict mode; `@/*` path alias maps to the repo root.
- App Router lives in `app/` (no `src/` directory). Server Components by default;
  add `'use client'` only for interactivity, hooks, or browser APIs.
- Next config enables `cacheComponents` and `partialPrefetching`; check the
  bundled docs before using caching or data-fetching APIs.
- Styling: Tailwind CSS v4, CSS-first config (`@theme` in `app/globals.css`),
  compiled via `@tailwindcss/turbopack`. No `tailwind.config.js`.
- Linting: ESLint 9 flat config with `eslint-config-next` (core-web-vitals + TypeScript).
- Package manager: npm (`package-lock.json`).

## Commands

- Dev server: `npm run dev` (http://localhost:3000)
- Build: `npm run build`
- Production server: `npm run start`
- Lint: `npm run lint`

No test command is configured, so there is no test gate yet. Verify logic with
the dev server, the build, and lint until a test runner is added.

No browser test command is configured.
