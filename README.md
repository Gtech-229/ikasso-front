This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Production

The admin web runs on the API's VPS, as the `admin` service of the backend's
`docker-compose.prod.yml`, at **https://ikaso-mali.com**. The VPS's ISPConfig
web server does HTTPS and forwards to the container on `127.0.0.1:3100`.

```text
browser ──HTTPS──> ISPConfig (ikaso-mali.com) ──> 127.0.0.1:3100 ──> admin :3000
                                                            │ /api/v1/* (rewrite)
                                                            └──> api :3000 (compose network)
```

The browser only calls `https://ikaso-mali.com/api/v1/...`; Next.js forwards
those requests to the API, so the API's httpOnly session cookies stay on the
admin's own domain.

### The image

`Dockerfile` builds Next.js's standalone output (`output: "standalone"` in
`next.config.ts`) and runs `node server.js` as the unprivileged `node` user.
`.dockerignore` keeps `node_modules`, `.next`, `blueprint`, `.claude`, `.git`
and every `.env*` file out of it. The admin needs no secret.

| Setting | Where | Value on the VPS |
|---|---|---|
| `API_URL` | build argument **and** runtime environment | `http://api:3000` |
| `PORT` | runtime (set in the image) | `3000` |

`API_URL` is needed at build time because Next.js resolves `rewrites()` while
building: the `/api/v1` proxy target is baked into the image. Changing the
API's address means rebuilding the image, not only restarting it.

Local check of the image (API running on the host's port 3001):

```bash
docker build --build-arg API_URL=http://host.docker.internal:3001 -t ikasso-admin:local .
docker run --rm -p 3100:3000 -e API_URL=http://host.docker.internal:3001 ikasso-admin:local
# then open http://localhost:3100
```

### The backend side (in `../backend`)

Apply these in the backend repository (its own workflow), not from here:

1. **The `admin` service** in `docker-compose.prod.yml`, next to `api`:

   ```yaml
   admin:
     build:
       # The frontend checkout, cloned next to the backend one on the VPS.
       context: ../frontend
       args:
         API_URL: http://api:3000
     image: ikasso-admin
     restart: unless-stopped
     environment:
       API_URL: http://api:3000
     depends_on:
       - api
     # `edge` only: the admin reaches the API, never the database.
     networks: [edge]
     # From the VPS itself only; ISPConfig forwards ikaso-mali.com here.
     ports:
       - '127.0.0.1:${ADMIN_HOST_PORT:-3100}:3000'
     healthcheck:
       test: ['CMD', 'wget', '-qO-', 'http://127.0.0.1:3000/login']
       interval: 30s
       timeout: 5s
       start_period: 20s
       retries: 3
   ```

2. **The password links:** in the API's `.env.production` (and
   `.env.production.example`), `ADMIN_WEB_URL=https://ikaso-mali.com`, then
   recreate the API so it reads the file again:
   `docker compose -f docker-compose.prod.yml up -d api` (a plain
   `docker compose restart api` keeps the old environment). The set and reset
   password emails then link to `https://ikaso-mali.com/password`.
3. **The site, in ISPConfig:** Sites > Websites > `ikaso-mali.com` (its DNS A
   record on the VPS). Domain tab: **SSL** and **Let's Encrypt SSL** ticked.
   Redirect tab: **Rewrite HTTP to HTTPS** ticked. Options tab, **nginx
   Directives** (set by the server's administrator):

   ```nginx
   add_header Strict-Transport-Security "max-age=15552000" always;

   location / {
       proxy_pass http://127.0.0.1:3100;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```

   Leave the HSTS line out if the panel's own HSTS option is already on. If port
   3100 is taken on the VPS (`ss -tln | grep ':3100 '` prints something), pick a
   free one, set `ADMIN_HOST_PORT=<port>` in the `.env` next to
   `docker-compose.prod.yml`, and use it in `proxy_pass`.

### First deploy on the VPS

```bash
# Next to the backend checkout, so `../frontend` resolves from it.
cd /path/to          # the folder that holds backend/
git clone <frontend repository URL> frontend
cd backend
docker compose -f docker-compose.prod.yml up -d --build admin
docker compose -f docker-compose.prod.yml ps admin
curl -sI http://127.0.0.1:3100/login        # 200
curl -sI https://ikaso-mali.com/login       # 200 through ISPConfig
```

Then sign in at https://ikaso-mali.com/login with an admin account, and send
yourself a password link from "Mot de passe oublié ?" to check that it opens
`https://ikaso-mali.com/password`.

### Updates

```bash
cd /path/to/frontend && git pull
cd ../backend && docker compose -f docker-compose.prod.yml up -d --build --no-deps admin
```

Only the `admin` container is rebuilt and restarted; the API and the database
keep running. `--no-deps` matters: without it Compose also builds the `api`
dependency from the current backend checkout and may recreate it, outside the
backend's own backup-first deploy.

**Backend deploys rebuild the admin too.** Once the `admin` service is in
`docker-compose.prod.yml`, every backend deploy (the GitHub workflow runs
`up -d --build --wait` on all services) also rebuilds `admin` from whatever
`../frontend` holds and waits for its health check. Keep the frontend checkout
present on the VPS and on the commit you mean to run (`git pull` it before a
backend deploy); a missing or broken checkout makes the backend deploy fail.
