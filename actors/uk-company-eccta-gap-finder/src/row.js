import { registrumUrl } from './registrum.js';

export const INCLUDE = ['profile', 'compliance'];
export const EVENT = 'company-checked';

const DAY_MS = 86_400_000;
const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

/** One row per company: who still has to verify, by when, and the filings that block on it. */
export function toEcctaRow(bundle, today) {
	const p = bundle.profile ?? {};
	const c = bundle.compliance ?? {};
	const people = (c.unverified_persons ?? []).map((u) => ({
		name: u.name,
		kind: u.kind,
		status: u.status,
		deadline: u.deadline ?? null,
		days_left: u.deadline ? daysBetween(today, u.deadline) : null,
	}));
	const deadlines = people.map((u) => u.deadline).filter(Boolean).sort();
	const earliest = deadlines[0] ?? null;
	return {
		company_number: bundle.company_number,
		company_name: p.company_name ?? null,
		company_status: p.company_status ?? null,
		verification_status: c.verification_risk ?? null,
		people_to_verify: people.length,
		any_overdue: people.some((u) => u.status === 'overdue'),
		earliest_deadline: earliest,
		days_to_earliest_deadline: earliest ? daysBetween(today, earliest) : null,
		unverified_people: people,
		directors_total: c.directors_total ?? null,
		directors_verified: c.directors_verified ?? null,
		directors_pending: c.directors_pending ?? null,
		directors_overdue: c.directors_overdue ?? null,
		directors_unknown: c.directors_unknown ?? null,
		pscs_total: c.pscs_total ?? null,
		pscs_verified: c.pscs_verified ?? null,
		pscs_pending: c.pscs_pending ?? null,
		pscs_overdue: c.pscs_overdue ?? null,
		pscs_unknown: c.pscs_unknown ?? null,
		confirmation_statement_next_due: p.confirmation_statement?.next_due ?? null,
		confirmation_statement_overdue: p.confirmation_statement?.overdue ?? null,
		accounts_next_due: p.accounts?.next_accounts_due ?? null,
		accounts_overdue: p.accounts?.overdue ?? null,
		eccta_enforcement_deadline: c.eccta_enforcement_deadline ?? null,
		registrum_url: registrumUrl(bundle.company_number, 'eccta-gap-finder'),
	};
}

/** A company with no compliance section (lookup failed upstream) is delivered free. */
export const isChargeable = (bundle) => Boolean(bundle.compliance);
