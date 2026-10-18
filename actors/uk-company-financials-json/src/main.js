import { Actor, log } from 'apify';
import { MAX_COMPANIES_PER_RUN, fetchBundle, normalizeCompanyNumbers, processCompanies } from './registrum.js';
import { EVENT, INCLUDE, isChargeable, toFinancialsRow } from './row.js';

const USER_AGENT = 'registrum-apify/uk-company-financials-json/1.0';

await Actor.init();
const apiKey = process.env.REGISTRUM_API_KEY;
if (!apiKey) await Actor.fail('This actor is misconfigured (no API key). Please report it in the Issues tab.');

const input = (await Actor.getInput()) ?? {};
const { numbers, invalid, truncated } = normalizeCompanyNumbers(input.companyNumbers);
if (invalid.length) log.warning(`Skipped ${invalid.length} entries that are not UK company numbers: ${invalid.slice(0, 10).join(', ')}`);
if (truncated) log.warning(`Only the first ${MAX_COMPANIES_PER_RUN} companies are processed per run; ${truncated} were left out. Split the list into several runs.`);
if (!numbers.length) await Actor.fail('No valid UK company numbers in the input (e.g. 07420328, SC123456).');

const summary = await processCompanies(numbers, {
	fetchOne: (n) => fetchBundle(n, { apiKey, include: INCLUDE, userAgent: USER_AGENT }),
	toRow: toFinancialsRow,
	isChargeable,
	push: (row, eventName) => (eventName ? Actor.pushData(row, eventName) : Actor.pushData(row)),
	eventName: EVENT,
	concurrency: 4,
});

const parts = [`${summary.charged + summary.free} companies returned`];
if (summary.notFound) parts.push(`${summary.notFound} not found (not charged)`);
if (summary.errors) parts.push(`${summary.errors} failed (not charged)`);
if (summary.stoppedAtBudget) parts.push('stopped: your maximum cost per run was reached');
if (truncated) parts.push(`${truncated} over the ${MAX_COMPANIES_PER_RUN}-per-run cap skipped`);
await Actor.exit(parts.join('; '));
