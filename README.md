# Registrum actors for Apify

[Apify Store](https://apify.com/store) actors over the [Registrum](https://registrum.co.uk) UK
company data API:

| Actor | What it returns |
|---|---|
| [`uk-company-eccta-gap-finder`](actors/uk-company-eccta-gap-finder) | Directors and PSCs still to verify their identity under ECCTA, with deadlines |
| [`uk-company-financials-json`](actors/uk-company-financials-json) | Figures parsed from the latest filed accounts, plus profile and board |

Each actor is a thin client: the data and its rules live in the Registrum API, not here.

## Develop

```bash
npm test                 # node --test; fixtures are captured live API responses, never hand-written
npm run sync             # copy shared/registrum.js into each actor after editing it
```

`apify push` uploads one actor directory, so each actor carries a copy of `shared/registrum.js`.
A test fails if a copy drifts.

Run one locally: `cd actors/<name> && npm install`, put an input in
`storage/key_value_stores/default/INPUT.json`, then run `REGISTRUM_API_KEY=... node src/main.js`.

## Deploy

```bash
cd actors/<name> && APIFY_TOKEN=... npx apify-cli push
```

The actor's `REGISTRUM_API_KEY` is a secret environment variable on the Apify actor version. It is
never stored in this repo.

## Licence

MIT
