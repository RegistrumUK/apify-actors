# UK Company Financials (Companies House accounts as JSON)

Paste a list of UK company numbers and get back **figures parsed from each company's latest filed
accounts**: turnover, profit, net assets, cash, debtors, creditors, employees and more, each with
the prior year. You also get the company profile and current directors, as one flat row per company
that is ready for a spreadsheet, CRM or database.

Companies House publishes accounts as iXBRL documents, not as data. This actor gives you the numbers.

## What you get per company

| Group | Fields |
|---|---|
| Profile | `company_name`, `company_status`, `company_type`, `incorporated_on`, `sic_codes`, `registered_postcode` |
| Filing | `accounts_type`, `period_start`, `period_end`, `filed_on`, `currency` |
| Profit and loss | `turnover`, `gross_profit`, `operating_profit`, `profit_before_tax`, `tax`, `profit_after_tax`, `depreciation` |
| Balance sheet | `fixed_assets`, `intangible_assets`, `current_assets`, `stocks`, `debtors`, `cash`, `creditors_within_one_year`, `creditors_after_one_year`, `net_assets`, `equity`, `share_capital`, `retained_earnings` |
| Other | `employees` |
| Every figure | also as `<field>_prior` for the previous year |
| Quality | `completeness` (0-1), `missing_fields`, `turnover_untagged_suspected` |
| Board | `directors`: name, role, appointed_on |
| Link | `registrum_url`: the company's full page on registrum.co.uk |

All amounts are in whole pounds. **Small companies often file without a profit and loss account**,
so turnover and profit are legitimately `null` for many of them. `missing_fields` tells you which
figures the filing did not contain.

Example (live data, October 2026, abridged):

```json
{
  "company_number": "07420328",
  "company_name": "BAKERY BAGIETKA LTD",
  "financials_available": true,
  "period_end": "2025-10-31",
  "filed_on": "2026-07-27",
  "net_assets": 215929, "net_assets_prior": 295725,
  "cash": 30831, "cash_prior": 31343,
  "employees": 44, "employees_prior": 85,
  "turnover": null,
  "completeness": 0.77
}
```

## Input

`companyNumbers`: a list of UK company numbers, such as `07420328` or `SC123456`. Leading zeros
can be dropped and duplicates are removed.

**Up to 500 companies per run.** Each company is a live lookup, and the cap keeps one large job
from slowing everyone else down. For bigger lists, start several runs, or use the
[Registrum API](https://registrum.co.uk/quickstart?utm_source=apify&utm_medium=actor&utm_campaign=financials-json) directly.

## Pricing

Pay per company **with parsed accounts** (see the Pricing tab). These are free and still listed in
the output, with the reason:
- companies whose accounts cannot be read as data, for example scanned PDFs (`unavailable_reason`)
- company numbers that do not exist
- lookups that fail on our side

The run stops cleanly when it reaches your maximum cost per run.

## Data source

Built on [Registrum](https://registrum.co.uk?utm_source=apify&utm_medium=actor&utm_campaign=financials-json),
which parses the iXBRL accounts filed at Companies House. Figures come from the latest filing
that is a genuine set of annual accounts.

## Support

Open an issue on the Issues tab, or email support@registrum.co.uk.
