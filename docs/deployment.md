# Deployment

The product has two parts, deployed separately:

| Part | Hosting | Status |
|---|---|---|
| Website and Optimization Studio (`website/`) | GitHub Pages: static export, all solving in the visitor's browser | deployed by `.github/workflows/pages.yml` on every push to `main` |
| Job service (`service/`) | any container host (Python process, one replica per queue) | implemented and tested; **not deployed** |

GitHub Pages cannot run server code. That is why the Studio's solvers run in a Web Worker, and why larger exact runs
need the separately hosted job service.

## Website (GitHub Pages)

One-time setup by the repository owner:
1. Open **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
2. Push to `main`, or re-run **Deploy website to GitHub Pages**.

The site is served at https://entropysherlock.github.io/westfall-optimization/.

### Optional public configuration

Both values are public URLs, never secrets. Set them as repository **variables** (not secrets) under
*Settings → Secrets and variables → Actions → Variables*, then re-run the Pages workflow.

| Variable | Effect when set | When empty (default) |
|---|---|---|
| `STUDIO_API_URL` | the Studio shows a "Remote solver service" panel that submits jobs to this URL | the panel states that no remote service is configured |
| `CONTACT_ENDPOINT` | the contact form POSTs JSON to this endpoint (for example a Formspree form URL `https://formspree.io/f/<id>`) | the form is disabled, with an explanation, and GitHub issues are offered instead |

To set up the contact form, create a form at a form-delivery provider (Formspree, Basin, Getform or similar) that
accepts JSON POSTs and forwards to the owner's mailbox. Put its endpoint URL in `CONTACT_ENDPOINT`. Then submit a test
inquiry from the live site and confirm it arrives **before** announcing the form. The owner's email address is
configured only at the provider and never appears in this repository.

### Local preview

```bash
cd website && npm ci && npm run build && node scripts/serve-static.mjs out 4321
```

## Job service

See `service/README.md`. In short:

```bash
docker build -f service/Dockerfile -t westfall-service .
docker run -p 8000:8000 \
  -e WESTFALL_ALLOWED_ORIGINS=https://entropysherlock.github.io \
  -e WESTFALL_API_KEY_SHA256=<sha256 of each key, comma separated> \
  westfall-service
```

Deployment requirements:
- an HTTPS reverse proxy;
- `WESTFALL_TRUST_PROXY=1` behind that proxy;
- exactly one service process per instance (the queue is in memory);
- host-level CPU and memory quotas that match `WESTFALL_MAX_CONCURRENT_JOBS` × `WESTFALL_JOB_MEMORY_MB`.

Then set the `STUDIO_API_URL` variable to the service's public URL.

Hosting providers that can run this container include Fly.io, Render, Railway, Google Cloud Run (with min-instances = 1
and max-instances = 1, because the queue is in memory), and any VM with Docker. None is configured in this repository,
because deploying requires the owner's account and billing decision.
