# 20 — CI / CD

Target: GitHub Actions for CI, Vercel for hosting, Supabase CLI for migrations. Branch model: trunk-based with short-lived feature branches.

## Branches

- `main` — production. Deploys to `app.APP_DOMAIN`. Protected — no direct pushes.
- `staging` — staging mirror. Deploys to `staging.APP_DOMAIN`. Auto-merge from `main` is **not** enabled; staging gets its own validation cycle.
- `feat/*`, `fix/*`, `chore/*` — feature branches. PR into `main`. Each gets a Vercel preview deployment.

## GitHub Actions — `.github/workflows/ci.yml`

Runs on every PR + push to `main` / `staging`.

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main, staging]

jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: latest }
      - run: bun install --frozen-lockfile
      - uses: actions/cache@v4
        with:
          path: |
            ~/.bun/install/cache
            node_modules
          key: ${{ runner.os }}-bun-${{ hashFiles('bun.lockb') }}

  typecheck:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run typecheck    # tsc --noEmit

  lint:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run lint         # next lint + eslint
      - run: bun run lint:i18n    # scripts/lint-i18n.ts — Greek casing rules

  unit:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun test             # bun's built-in test runner

  integration:
    needs: install
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with: { version: latest }
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: supabase db start
      - run: supabase db reset --linked=false
      - run: bun run test:integration
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/postgres
          NEXT_PUBLIC_SUPABASE_URL: http://localhost:54321
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_LOCAL_ANON_KEY }}

  e2e:
    needs: [typecheck, lint, unit]
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bunx playwright install --with-deps
      - run: bun run build
      - run: bun run test:e2e
```

`bun run` scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "next lint",
    "lint:i18n": "bun run scripts/lint-i18n.ts",
    "test": "bun test tests/unit",
    "test:integration": "bun test tests/integration",
    "test:e2e": "playwright test",
    "db:migrate": "supabase db push",
    "db:reset": "supabase db reset",
    "db:seed": "bun run scripts/seed.ts"
  }
}
```

## Migrations workflow — `.github/workflows/migrate.yml`

Migrations run **before** Vercel deploys. Otherwise a deploy could land code that references columns that don't exist yet.

```yaml
name: Migrate
on:
  push:
    branches: [main, staging]
    paths: ['supabase/migrations/**']

jobs:
  migrate-staging:
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF_STAGING }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      - run: supabase db push --linked
        env:
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD_STAGING }}

  migrate-prod:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production           # requires manual approval
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF_PROD }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      - run: supabase db push --linked
        env:
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD_PROD }}
```

**Production migrations require manual GitHub Environment approval.** A reviewer must click "Approve and deploy" before the SQL runs.

## Vercel — deploy hooks

Vercel auto-deploys on push to `main` and `staging`. Configure two Vercel projects (one per environment), pointed at the same repo but different branches.

To prevent deploys racing migrations, set the **Deploy Hook** trigger on each project — only fire it from the `Migrate` workflow on success:

```yaml
  trigger-deploy:
    needs: [migrate-prod]
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST "${{ secrets.VERCEL_DEPLOY_HOOK_PROD }}"
```

And disable Vercel's auto-deploy-on-push (Project Settings → Git → Ignored Build Step: `exit 0`).

## Preview deployments

Every PR gets a Vercel preview URL with isolated env (a "preview" env in Vercel mapped to staging Supabase). Useful flags:

- `NEXT_PUBLIC_ENVIRONMENT=preview` so the banner reads "PREVIEW" and emails don't actually send (Resend test mode).
- `NEXT_PUBLIC_SUPABASE_URL` points at staging.
- Auth callbacks need the Vercel preview URL added to Supabase Auth → URL Configuration → Additional Redirect URLs. Set the wildcard `https://*-mobile-unit.vercel.app/auth/callback`.

## Backups — `.github/workflows/backup.yml`

Weekly logical backup to S3 (Pro plan PITR is fine, this is belt-and-suspenders):

```yaml
on:
  schedule:
    - cron: '0 3 * * 0'   # Sun 03:00 UTC
jobs:
  dump:
    runs-on: ubuntu-latest
    steps:
      - uses: supabase/setup-cli@v1
      - run: |
          supabase db dump \
            --project-ref ${{ secrets.SUPABASE_PROJECT_REF_PROD }} \
            -f backup.sql --data-only
      - run: gzip backup.sql
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_BACKUP_ROLE }}
          aws-region: eu-west-1
      - run: aws s3 cp backup.sql.gz s3://mobile-unit-backups/$(date +%Y-%m-%d).sql.gz
```

## Secrets inventory

GitHub repository secrets:

| Secret | Use |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI auth |
| `SUPABASE_PROJECT_REF_STAGING` | staging project ref |
| `SUPABASE_PROJECT_REF_PROD` | prod project ref |
| `SUPABASE_DB_PASSWORD_STAGING` | for db push |
| `SUPABASE_DB_PASSWORD_PROD` | for db push |
| `SUPABASE_LOCAL_ANON_KEY` | CI integration tests |
| `VERCEL_DEPLOY_HOOK_PROD` | gated deploy trigger |
| `VERCEL_DEPLOY_HOOK_STAGING` | gated deploy trigger |
| `AWS_BACKUP_ROLE` | OIDC role for S3 dump |

Vercel environment variables — see `19_SUPABASE_SETUP.md` and `21_THIRD_PARTY_INTEGRATIONS.md`.

## Quality gates

PR is blocked from merging unless all of these pass:

1. `typecheck`
2. `lint` + `lint:i18n`
3. `unit`
4. `integration`
5. At least 1 review approval
6. No unresolved conversations
7. Vercel preview deploys successfully

E2E runs but is **non-blocking** for V1 (slow, flaky early on). Once stable, promote to required.

## Release notes

GitHub release-please action generates a CHANGELOG.md from conventional commits. Tag on every `main` deploy. Not blocking.

## Rollback

For code: redeploy a previous Vercel deployment from the dashboard (one click). For DB: Supabase PITR → restore to point-in-time (~5 min RTO). Document a runbook in `OPERATIONS.md` (PROPOSED, not in this bundle).

## Observability

- **Vercel Analytics** — Web Vitals, traffic. Free with Pro.
- **Sentry** — errors. Wire via `@sentry/nextjs` with traces sampled at 10%.
- **PostHog** (PROPOSED) — product analytics + feature flags. EU-hosted to avoid Schrems II issues.
- **Logflare → BigQuery** — long-term log archive (PROPOSED, V1.1).

Sentry DSN env var: `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`. Source maps uploaded on Vercel build via `@sentry/nextjs` config.
