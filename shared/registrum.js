// Shared Registrum API client for the actors in this repo. Canonical copy: shared/registrum.js.
// Each actor carries an identical copy (apify push uploads one directory); `npm run sync`.

export const API_BASE = 'https://api.registrum.co.uk';

// Every company costs Companies House calls behind our API, and that rate limit is shared with
// every other Registrum customer. One large run must not be able to starve them, so a run is
// capped; bigger jobs are split into several runs or go to the API directly.
export const MAX_COMPANIES_PER_RUN = 500;

const COMPANY_NUMBER = /^([A-Z]{2}\d{6}|\d{8})$/;

export function normalizeCompanyNumbers(raw) {
	const seen = new Set();
	const invalid = [];
	for (const value of raw ?? []) {
		const s = String(value ?? '').replace(/\s+/g, '').toUpperCase();
		if (!s) continue;
		const n = /^\d{1,8}$/.test(s) ? s.padStart(8, '0') : s;
		if (COMPANY_NUMBER.test(n)) seen.add(n);
		else invalid.push(String(value).trim());
	}
	const all = [...seen];
	return {
		numbers: all.slice(0, MAX_COMPANIES_PER_RUN),
		invalid,
		truncated: Math.max(0, all.length - MAX_COMPANIES_PER_RUN),
	};
}

const RETRYABLE = (status) => status === 429 || status >= 500;

export async function fetchBundle(number, { apiKey, include, userAgent, fetchImpl = fetch, retries = 3, retryDelayMs = 2000 }) {
	const url = `${API_BASE}/v1/company/${encodeURIComponent(number)}/bundle?include=${encodeURIComponent(include.join(','))}`;
	let last = 'no response';
	for (let attempt = 0; attempt <= retries; attempt++) {
		if (attempt > 0) await new Promise((r) => setTimeout(r, retryDelayMs * attempt));
		let res;
		try {
			res = await fetchImpl(url, { headers: { 'X-API-Key': apiKey, 'User-Agent': userAgent, Accept: 'application/json' } });
		} catch (e) {
			last = e.message;
			continue;
		}
		if (res.status === 404) return { status: 'not_found' };
		if (res.ok) return { status: 'ok', data: (await res.json()).data };
		last = `HTTP ${res.status}`;
		if (!RETRYABLE(res.status)) break;
	}
	return { status: 'error', message: last };
}

/**
 * Fetch, shape and push each company. Only a found company whose row `isChargeable` is pushed
 * with the pay-per-event name; not-found and failed lookups are pushed free, so a user never
 * pays for a typo or our outage. Stops as soon as the user's run budget is spent.
 */
export async function processCompanies(numbers, { fetchOne, toRow, isChargeable = () => true, push, eventName, concurrency = 4 }) {
	const summary = { charged: 0, free: 0, notFound: 0, errors: 0, stoppedAtBudget: false };
	const queue = [...numbers];
	const worker = async () => {
		while (queue.length && !summary.stoppedAtBudget) {
			const number = queue.shift();
			const r = await fetchOne(number);
			if (r.status === 'not_found') {
				summary.notFound++;
				await push({ company_number: number, error: 'not_found' });
			} else if (r.status === 'error') {
				summary.errors++;
				await push({ company_number: number, error: r.message });
			} else if (isChargeable(r.data)) {
				const charge = await push(toRow(r.data), eventName);
				summary.charged++;
				if (charge?.eventChargeLimitReached) summary.stoppedAtBudget = true;
			} else {
				summary.free++;
				await push(toRow(r.data));
			}
		}
	};
	await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
	return summary;
}

export function registrumUrl(number, campaign) {
	return `https://registrum.co.uk/company/${number}?utm_source=apify&utm_medium=actor&utm_campaign=${campaign}`;
}
