# Macro Forge

A local-first, mobile- and tablet-first tracker for people who lift: macros with
training-day and rest-day targets, a full workout logger with PRs, a supplement
checklist, and progress charts. Installable as an offline PWA. All data stays on
the device.

## Features

- **Today**: calorie ring and macro bars against the day's target. Training days are
  detected from logged workouts (or toggled manually). Meal slots support quick add,
  copy from the previous day, and save as meal.
- **Food**: a bundled library of 190+ foods (per 100 g), your own foods, **variations**
  of any food (e.g. "Chicken thigh, my marinade"), saved meals, and per-serving entry.
  Log entries snapshot their macros, so editing a food never rewrites history.
- **Macro suggestions**: type "oats 80g" or "2 eggs" and press *Suggest macros*.
- **Workouts**: 88 exercises plus custom ones, templates, and live sessions that
  prefill last time's sets. Includes RPE, warm-ups, a rest timer, and live e1RM
  and weight PRs.
- **Supplements**: dose, unit and timing; a daily checklist; streak and 30-day adherence.
- **Body composition**: log body fat % and muscle mass from a smart scale, DEXA,
  InBody, calipers or a tape measure (US Navy estimate). Each reading keeps its
  method, and trends are charted one method at a time because methods disagree.
- **Goals**: a target body fat % and lean mass, with an optional date. The app works
  out the target weight, the fat and lean change, and the weekly pace, rates the pace
  (realistic, ambitious or too fast) and suggests a phase: cut, recomp, maintain or lean bulk.
- **Progress**: body fat %, lean and fat mass, weight trend (gap-aware EMA), goal
  progress, calories and protein vs target, e1RM per lift, PR list, and weekly hard sets per muscle.
- **Settings**: target calculator with per-field overrides. It uses Katch-McArdle and
  protein per kg of lean mass when body fat is known, otherwise Mifflin-St Jeor. Also
  kg/lb, light/dark/system theme, and JSON backup export/import.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build (also generates the service worker)
npm run serve      # preview the production build
npm test           # run tests once (Vitest + Testing Library)
npm run test:watch
npm run typecheck
node scripts/generate-icons.mjs   # regenerate PWA icons from the logo geometry
```

In development, Settings has a **Load sample data** button that fills 90 days of
food, weigh-ins, workouts and supplements so every chart has something to show.

## Architecture

```
app/
  domain/       pure TS: zod schemas, macros, TDEE, strength (e1RM/PRs), streaks, dates, units, progress selectors
  data/         Dexie schema (db.ts), repositories (interfaces + Dexie impl), seed JSON
  services/     macro suggestion providers
  hooks/        live queries (useLiveQuery over repositories)
  components/   ui/ (shadcn), shared/ (app primitives), layout/ (shell, nav, header)
  features/     today, food, workouts, supplements, progress, settings, onboarding
  routes/       thin TanStack Router file routes
```

- Weights are stored in **kg** and food in **grams**. Units are converted only at display time.
- Features talk to `~/data/repositories` only. To add sync, implement the `Repositories`
  interface (`app/data/repositories/types.ts`) against a backend and swap it in
  `app/data/repositories/index.ts`. Every record already has a UUID plus `createdAt`/`updatedAt`.
- Shared building blocks (`MacroSummary`, `NumberField`, `WeightField`, `QuantityField`,
  `ResponsiveSheet`, `ListRow`, `SearchList`, `DateSwitcher`, cards, `ConfirmDialog`) live in
  `app/components/shared`. Use these before writing new UI.
- Below `md` there's a bottom tab bar. From `md` up, the sidebar takes over. On touch
  devices, controls grow to roughly 40–44 px (`pointer-coarse:` variants in the shadcn components).

## Adding an AI macro provider

Suggestions go through one interface (`app/services/suggestions/types.ts`):

```ts
interface MacroSuggestionProvider {
  readonly id: string
  readonly label: string // shown to users, e.g. "AI estimate"
  suggest(query: string, options?: { limit?: number; signal?: AbortSignal }): Promise<MacroSuggestion[]>
}
```

Return `per100g` macros, an optional `grams` parsed from the query, and a `confidence`
between 0 and 1. Then wrap the app:

```tsx
<SuggestionProvider provider={new MyAiProvider()}>...</SuggestionProvider>
```

The forms don't change. Suggestions only prefill fields, and users can edit
everything before saving. A good pattern is a provider that tries `LocalFuzzyProvider`
first and calls the model only when local confidence is low. Keep API keys on a
server, never in the client bundle.

## Your data

Everything lives in IndexedDB in this browser. Clearing site data, or uninstalling the
PWA on some platforms, deletes it. Use **Settings → Export backup** regularly. Backups
are plain JSON, and the bundled library is restored automatically on import.

## Data sources and credits

- Food values are derived from [USDA FoodData Central](https://fdc.nal.usda.gov/)
  (public domain). Items under "Protein & supplements" use typical label values.
- Exercise names are generic. The descriptions are original to this app.
- Formulas: Mifflin-St Jeor and Katch-McArdle (energy), US Navy circumference method
  (tape body fat), Epley (estimated 1RM), exponential moving average (weight trend).
  Pace guidelines: fat loss of 0.5–0.7% of body weight a week is comfortable and up to 1% is ambitious;
  lean gain of 0.5 kg a month is comfortable and up to 1 kg is ambitious for trained lifters.
- A smart scale's "muscle mass" is stored as reported. Lean mass is always calculated as
  weight minus fat mass, because the two numbers measure different things.
- The name, logo, icons and UI are original to this project.

Estimates are a starting point, not medical advice.
