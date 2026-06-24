# AFL Monte-Carlo engine

A TypeScript simulation that turns the per-player **expectations** from the
[AFL-Modelling](https://github.com/DanielTomaro13/AFL-Modelling) Python models
into full, internally-consistent **distributions** for ten markets, plus match
win/total markets. All parameters come from the empirical model artifacts.

## Pipeline position

```
AFL-Modelling: predict.py → projection_inputs.json   (per-player expecteds + shares + dispersion)
                                   │  copied to pipeline/data/
                                   ▼
   tsx src/montecarlo/index.ts  →  web/public/data/projections-latest.json
                                   ▼
   web/app/{projections,value,lab,backtest,how-it-works}
```

## How a match is simulated (`simulate.ts`)

For each of N sims (default 4000), per team:
1. **Team totals** — draw each stat's team total around its model expectation
   (`countDraw`, per-stat coefficient of variation).
2. **Allocation** — hand each unit out to a player by their share band, jittered
   per-sim by the empirical dispersion (`allocate` maps a uniform draw into a
   player's cumulative share range).
3. **Identity & composition** — `disposals = kicks + handballs`; fantasy is
   rebuilt from the allocated components with the DreamTeam weights.
4. **Result** — team points (`6·goals + behinds`) give win/draw/win and totals.

A short **calibration** pass first corrects each player's allocation weight so
the simulated mean matches the model expectation. After it, simulated means sit
within ~2% of the models.

## Run

```bash
# one-off (no DB deps needed):
npx tsx src/montecarlo/index.ts --in data/projection_inputs.json --sims 4000
# or via the package script:
npm run projections
# sanity checks:
npx tsx src/montecarlo/test.ts
```

`projection_inputs.json` is produced by AFL-Modelling and copied to
`pipeline/data/`. In CI, fetch the latest artifact from the AFL-Modelling repo
before running (see `.github/workflows/refresh.yml`).

## Output

`projections-latest.json` (and `projections-<season>-r<round>.json`): per match,
win probabilities + total, and per player a `dist` for each market with mean,
sd, deciles and a sparse `over` map of P(over line) at the half-lines books post.
