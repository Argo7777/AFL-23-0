# Global leaderboard worker

Free-tier Cloudflare Worker + KV that powers the global ladder.

## One-time setup (~3 minutes)

```bash
cd worker
npx wrangler login                          # opens browser, authorise
npx wrangler kv namespace create BOARD      # copy the id it prints
# paste the id into wrangler.toml, then:
npx wrangler deploy                         # prints your worker URL
```

Then put the worker URL into the site by adding this to BOTH GitHub workflow
build steps (`deploy.yml` and `refresh.yml`):

```yaml
        env:
          NEXT_PUBLIC_LEADERBOARD_URL: https://afl230-leaderboard.<your-subdomain>.workers.dev
```

Push, and the global ladder goes live at /ladder. Until then the site hides it.
