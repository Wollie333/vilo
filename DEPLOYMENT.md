# Vilo Deployment Guide

This guide covers deploying Vilo to production with support for:
- Main site: `vilo.io`
- Tenant subdomains: `{slug}.vilo.io`
- Custom domains: `book.your-hotel.com`

---

## Architecture Overview

```
                    ┌─────────────────┐
                    │   Cloudflare    │
                    │   (DNS + SSL)   │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  vilo.io        │ │ *.vilo.io       │ │ custom domains  │
│  (Vercel)       │ │ (Vercel)        │ │ (CNAME → Vercel)│
│  Frontend       │ │ Frontend        │ │ Frontend        │
└─────────────────┘ └─────────────────┘ └─────────────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  api.vilo.io    │
                    │  (Fly.io)       │
                    │  Backend API    │
                    └─────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Supabase     │
                    │   (Database)    │
                    └─────────────────┘
```

---

## Step 1: Deploy Backend to Fly.io

### 1.1 Install Fly CLI

```bash
# Windows (PowerShell)
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# macOS/Linux
curl -L https://fly.io/install.sh | sh
```

### 1.2 Login and Launch

```bash
cd backend

# Login to Fly.io
fly auth login

# Launch app (first time only)
fly launch --name vilo-api --region jnb

# Or deploy updates
fly deploy
```

### 1.3 Set Environment Variables

```bash
fly secrets set \
  SUPABASE_URL="https://your-project.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  PAYSTACK_SECRET_KEY="sk_live_xxx" \
  NODE_ENV="production"
```

### 1.4 Verify Deployment

```bash
curl https://vilo-api.fly.dev/api/health
```

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Install Vercel CLI

```bash
npm i -g vercel
```

### 2.2 Deploy

```bash
cd frontend

# Login
vercel login

# Deploy (first time - will prompt for settings)
vercel

# Deploy to production
vercel --prod
```

### 2.3 Set Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables:

```
VITE_API_URL=https://api.vilo.io/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Step 3: Configure Cloudflare DNS

### 3.1 Add Domain to Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Add site: `vilo.io`
3. Update nameservers at your registrar

### 3.2 DNS Records

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| A | `@` | `76.76.21.21` (Vercel) | ✅ |
| CNAME | `www` | `cname.vercel-dns.com` | ✅ |
| CNAME | `*` | `cname.vercel-dns.com` | ✅ |
| CNAME | `api` | `vilo-api.fly.dev` | ✅ |
| CNAME | `domains` | `cname.vercel-dns.com` | ✅ |

### 3.3 SSL/TLS Settings

1. Go to SSL/TLS → Overview
2. Set encryption mode to **Full (strict)**
3. Enable "Always Use HTTPS"

### 3.4 Wildcard SSL (for *.vilo.io)

Cloudflare provides free wildcard SSL when proxying is enabled.

---

## Step 4: Configure Vercel for Wildcard Domains

### 4.1 Add Domains in Vercel

1. Go to Project → Settings → Domains
2. Add: `vilo.io`
3. Add: `*.vilo.io` (wildcard)
4. Add: `domains.vilo.io` (for custom domain CNAME target)

### 4.2 Enable Wildcard

Vercel Pro plan required for wildcard subdomains. Alternatively, use Cloudflare Workers or Fly.io for the frontend too.

---

## Step 5: Custom Domain Setup (for Tenants)

When a tenant adds a custom domain (e.g., `book.hotel.com`):

### 5.1 Tenant DNS Configuration

The tenant adds a CNAME record:
```
book.hotel.com → domains.vilo.io
```

### 5.2 Verification Flow

1. Tenant enters domain in Settings → Domains
2. Backend stores domain with `verification_status: pending`
3. Tenant adds CNAME record
4. Tenant clicks "Verify" in settings
5. Backend checks DNS: `dns.resolveCname('book.hotel.com')`
6. If CNAME points to `domains.vilo.io`, mark as verified

### 5.3 SSL for Custom Domains

**Option A: Cloudflare for SaaS** (Recommended)
- ~$2/hostname/month
- Automatic SSL provisioning
- Best user experience

**Option B: Vercel Custom Domains**
- Add each custom domain in Vercel dashboard
- Manual but free

**Option C: Let's Encrypt + Caddy**
- Self-managed
- Most complex but fully free

---

## Step 6: Environment Variables Summary

### Backend (Fly.io)

```env
NODE_ENV=production
PORT=3002
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
PAYSTACK_SECRET_KEY=sk_live_xxx
```

### Frontend (Vercel)

```env
VITE_API_URL=https://api.vilo.io/api
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

---

## Monitoring & Logs

### Fly.io Logs
```bash
fly logs -a vilo-api
```

### Vercel Logs
View in Vercel Dashboard → Project → Logs

### Supabase Logs
View in Supabase Dashboard → Logs

---

## Cost Estimate

| Service | Plan | Cost/month |
|---------|------|------------|
| Fly.io | Hobby | ~$5-10 |
| Vercel | Pro (for wildcards) | $20 |
| Cloudflare | Free | $0 |
| Supabase | Free/Pro | $0-25 |
| **Total** | | **~$25-55** |

---

## Troubleshooting

### Subdomain not resolving
- Check DNS propagation: `nslookup slug.vilo.io`
- Verify Cloudflare proxy is enabled
- Check Vercel domain settings

### Custom domain SSL error
- Ensure CNAME points to `domains.vilo.io`
- Wait for DNS propagation (up to 48h)
- Verify domain in Vercel/Cloudflare dashboard

### API errors
- Check Fly.io logs: `fly logs -a vilo-api`
- Verify environment variables: `fly secrets list`
- Test health endpoint: `curl https://api.vilo.io/api/health`
