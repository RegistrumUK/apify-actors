import { registrumUrl } from './registrum.js';

export const INCLUDE = ['profile', 'financials', 'directors'];
export const EVENT = 'company-financials';

const PL = ['turnover', 'gross_profit', 'operating_profit', 'profit_before_tax', 'tax', 'profit_after_tax', 'depreciation'];
const BS = ['fixed_assets', 'intangible_assets', 'current_assets', 'stocks', 'debtors', 'cash', 'creditors_within_one_year',
	'creditors_after_one_year', 'net_assets', 'equity', 'share_capital', 'retained_earnings'];

/** One flat row per company: latest parsed accounts (current + prior), profile and board. */
export function toFinancialsRow(bundle) {
	const p = bundle.profile ?? {};
	const f = bundle.financials ?? {};
	const dq = f.data_quality ?? {};
	const row = {
		company_number: bundle.company_number,
		company_name: p.company_name ?? f.company_name ?? null,
		company_status: p.company_status ?? null,
		company_type: p.company_type ?? null,
		incorporated_on: p.date_of_creation ?? null,
		sic_codes: p.sic_codes ?? [],
		registered_postcode: p.registered_office_address?.postal_code ?? null,
		financials_available: f.available === true,
		unavailable_reason: f.available === true ? null : (f.unavailable_reason ?? 'not_returned'),
		accounts_type: f.accounts_type ?? null,
		period_start: f.period_start ?? null,
		period_end: f.period_end ?? null,
		filed_on: dq.filed_on ?? null,
		currency: f.currency ?? null,
	};
	const put = (name, v) => {
		row[name] = v?.current ?? (typeof v === 'number' ? v : null);
		row[`${name}_prior`] = v?.prior ?? null;
	};
	for (const k of PL) put(k, f.profit_and_loss?.[k]);
	for (const k of BS) put(k, f.balance_sheet?.[k]);
	put('employees', f.other?.employees);
	row.completeness = dq.completeness ?? null;
	row.missing_fields = dq.missing_fields ?? [];
	row.turnover_untagged_suspected = dq.turnover_untagged_suspected ?? null;
	row.directors = (bundle.directors?.current_directors ?? [])
		.filter((d) => d.is_board_director)
		.map((d) => ({ name: d.name, role: d.officer_role, appointed_on: d.appointed_on ?? null }));
	row.registrum_url = registrumUrl(bundle.company_number, 'financials-json');
	return row;
}

/** Charged only when there are parsed accounts to deliver; profile-only rows are free. */
export const isChargeable = (bundle) => bundle.financials?.available === true;
