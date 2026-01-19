# Deployment

## Workflow

**No localhost testing.** Always deploy to Vercel.

```
Code change → Git push → Vercel Preview → Test on preview URL
```

## Vercel Setup

1. Connect GitHub repo to Vercel
2. Auto-deploy on push to `main`
3. Preview deployments for all branches/PRs

## Environment Variables

Set in Vercel dashboard:

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + Local | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + Local | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel only | Admin access (never commit) |
| `STRIPE_SECRET_KEY` | Vercel only | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Vercel only | Stripe webhook signing |

## Local .env.local

```bash
# Copy from Supabase dashboard
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# For local dev only (optional)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Supabase Environments

| Environment | Use |
|-------------|-----|
| Local (Docker) | Migration development |
| Production | Live data |

```bash
# Local Supabase (for migrations only)
pnpm supabase start
pnpm supabase db reset

# Push migrations to prod
pnpm supabase db push
```

## Build Commands

Vercel auto-detects Next.js. Default settings work:

```
Build Command: pnpm build
Output Directory: .next
Install Command: pnpm install
```

## Preview Deployments

Every push creates a preview URL:

```
https://hexos-git-feature-branch-username.vercel.app
```

Test here, not localhost.

## Production Deploy

Merge to `main` → Auto-deploy to production URL.

## Domain Setup

1. Add custom domain in Vercel dashboard
2. Configure DNS records
3. SSL auto-provisioned

## Stripe Webhooks

1. Create webhook in Stripe dashboard
2. Point to: `https://yourdomain.com/api/webhooks/stripe`
3. Select events: `payment_intent.succeeded`, `checkout.session.completed`
4. Copy signing secret to Vercel env vars

## Monitoring

- Vercel Analytics (built-in)
- Supabase dashboard for DB metrics
- Stripe dashboard for payment monitoring

## Rollback

Vercel keeps deployment history. Instant rollback via dashboard.

## CI/CD Pipeline

```yaml
# .github/workflows/ci.yml (optional)
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm lint
```

## Deploy Checklist

Before merging to main:

- [ ] TypeScript compiles (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Preview deployment works
- [ ] Tested on preview URL
- [ ] Migrations pushed to prod Supabase
- [ ] Env vars set in Vercel
