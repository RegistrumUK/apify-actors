# UK Company ECCTA Identity Verification Checker

Paste a list of UK company numbers and get back, for each company, **which directors and people
with significant control (PSCs) still have to verify their identity with Companies House**, their
deadlines, how many days are left, and whether anyone is already overdue.

Under the Economic Crime and Corporate Transparency Act 2023 (ECCTA), every director and PSC of a
UK company must verify their identity. Missing it can block the company's confirmation statement.
This actor turns the public register into a chase list for an accountant's or company secretary's
client book, a lender's portfolio, or a supplier list.

## What you get per company

| Field | Meaning |
|---|---|
| `verification_status` | `compliant`, `partial`, `pending`, `overdue` or `unknown` |
| `people_to_verify` | How many directors and PSCs still have to verify |
| `unverified_people` | Name, `director` or `psc`, status, deadline and `days_left` for each |
| `earliest_deadline`, `days_to_earliest_deadline` | The first deadline that will bite |
| `any_overdue` | `true` if any deadline has already passed |
| `directors_*`, `pscs_*` | Counts: total, verified, pending, overdue, unknown |
| `confirmation_statement_next_due`, `accounts_next_due` (+ `_overdue`) | The filings that depend on it |
| `registrum_url` | The company's full page on registrum.co.uk |

Example row (live data, October 2026):

```json
{
  "company_number": "07420328",
  "company_name": "BAKERY BAGIETKA LTD",
  "verification_status": "pending",
  "people_to_verify": 2,
  "any_overdue": false,
  "earliest_deadline": "2026-11-10",
  "days_to_earliest_deadline": 23,
  "unverified_people": [
    { "name": "FELCZAK, Karolina", "kind": "director", "status": "pending", "deadline": "2026-11-10", "days_left": 23 },
    { "name": "FELCZAK, Piotr", "kind": "director", "status": "pending", "deadline": "2026-11-10", "days_left": 23 }
  ],
  "confirmation_statement_next_due": "2026-11-10"
}
```

## Input

`companyNumbers`: a list of UK company numbers, such as `07420328` or `SC123456`. Leading zeros
can be dropped and duplicates are removed.

**Up to 500 companies per run.** Each company is a live lookup against Companies House, and the
cap keeps one large job from slowing everyone else down. For bigger lists, start several runs, or
use the [Registrum API](https://registrum.co.uk/quickstart?utm_source=apify&utm_medium=actor&utm_campaign=eccta-gap-finder) directly.

## Pricing

Pay per company returned (see the Pricing tab). **Company numbers that do not exist, and lookups
that fail on our side, are listed in the output but never charged.** The run stops cleanly when
it reaches your maximum cost per run.

## Data source and freshness

Built on [Registrum](https://registrum.co.uk?utm_source=apify&utm_medium=actor&utm_campaign=eccta-gap-finder),
which reads the Companies House public register. Verification status is as Companies House
publishes it. A director who verified very recently can take a short while to show.

## Support

Open an issue on the Issues tab, or email support@registrum.co.uk.
