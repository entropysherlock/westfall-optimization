# Deployment (GitHub Pages)

The site is a static export (`website/out`) built by `.github/workflows/pages.yml` with `NEXT_PUBLIC_BASE_PATH=/westfall-optimization`. It serves HTML, JS and JSON only — no Python runs on GitHub Pages.

## One-time setup (repository owner)
1. GitHub → repository **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Re-run the latest **Deploy website to GitHub Pages** workflow (Actions tab), or push to `main`.
4. The site appears at https://entropysherlock.github.io/westfall-optimization/ .

No secrets, tokens or custom domains are required. A custom domain would need DNS changes by the owner.

## Local preview of the production build
```bash
cd website && NEXT_PUBLIC_BASE_PATH= npm run build && npx serve out
```
