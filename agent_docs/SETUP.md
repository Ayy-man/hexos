# hexOS Setup Guide

**Do this BEFORE starting development.**

---

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name: `hexos`
3. Database password: Generate and save securely
4. Region: Pick closest to you

After creation, grab from **Settings → API**:
- Project URL (`https://xxx.supabase.co`)
- `anon` public key
- `service_role` key (keep secret!)

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Login
supabase login

# In your project folder later:
supabase init
supabase link --project-ref <your-project-ref>
```

---

## 2. Create Vercel Account + Team

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Create a team (or use personal for now)
3. You'll connect the repo after creating the project

---

## 3. Create GitHub Repo

```bash
# Create repo on GitHub first (hexona/hexos or your-username/hexos)
# Then after project creation:
git init
git add .
git commit -m "Initial setup"
git remote add origin git@github.com:hexona/hexos.git
git push -u origin main
```

---

## 4. Configure Claude MCPs

Add to Claude Desktop config:

**Mac:** `~/.config/claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["-y", "@anthropics/shadcn-mcp"]
    },
    "21st-dev": {
      "command": "npx", 
      "args": ["-y", "@21st-dev/magic-mcp"]
    }
  }
}
```

**Restart Claude Desktop after adding.**

| MCP | Purpose |
|-----|---------|
| shadcn | Add shadcn components via chat |
| 21st.dev | AI-powered component generation |

---

## 5. Create Next.js Project

```bash
# Create project with shadcn
pnpm dlx shadcn@latest init

# When prompted:
# - Style: New York (or Default)
# - Base color: Stone  
# - CSS variables: Yes
```

Then configure for Vega style manually or use:
```bash
# Add base components
pnpm dlx shadcn@latest add button card input tabs
```

---

## 6. Install Kibo UI Components

Kibo UI = Gantt, Kanban, Calendar, etc. for shadcn.

**Docs:** https://kibo-ui.com

```bash
npx kibo-ui add gantt
npx kibo-ui add kanban
npx kibo-ui add table
npx kibo-ui add calendar
npx kibo-ui add editor
npx kibo-ui add dropzone
npx kibo-ui add list
```

Components install to `src/components/ui/kibo-ui/`

---

## 7. Environment Variables

Create `.env.local` in project root:

```bash
# Supabase (from step 1)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Server only - NEVER expose these
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (add later)
# STRIPE_SECRET_KEY=sk_...
# STRIPE_WEBHOOK_SECRET=whsec_...
```

**Add same vars to Vercel:**
Vercel Dashboard → Project → Settings → Environment Variables

---

## 8. Connect to Vercel

1. Push code to GitHub (step 3)
2. Go to [vercel.com](https://vercel.com) → Add New Project
3. Import your GitHub repo
4. Add environment variables
5. Deploy

Every push to `main` = production deploy.
Every PR = preview deploy.

---

## 9. Verify Setup

Checklist:

- [ ] Supabase project created, credentials saved
- [ ] Vercel account ready
- [ ] GitHub repo created
- [ ] Claude MCPs configured (shadcn + 21st.dev)
- [ ] Next.js project initialized with shadcn
- [ ] Kibo UI components installed
- [ ] `.env.local` with Supabase credentials
- [ ] Vercel connected to GitHub repo
- [ ] First deploy successful

---

## Quick Reference

| Service | Dashboard | Docs |
|---------|-----------|------|
| Supabase | supabase.com/dashboard | supabase.com/docs |
| Vercel | vercel.com/dashboard | vercel.com/docs |
| shadcn/ui | — | ui.shadcn.com |
| Kibo UI | — | kibo-ui.com |

---

## Next Steps

Once setup is complete:

1. Copy `CLAUDE.md` and `agent_docs/` to project root
2. Create first migration (`supabase/migrations/00001_initial_schema.sql`)
3. Push migration to Supabase (`supabase db push`)
4. Start building Phase 1 features

See `agent_docs/features.md` for build order.
