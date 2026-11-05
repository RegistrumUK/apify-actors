import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_COMPANIES_PER_RUN, MAX_RETRY_AFTER_MS, normalizeCompanyNumbers, fetchBundle, processCompanies } from '../shared/registrum.js';
import { fakeFetch } from './helpers.js';

const opts = (f, extra = {}) => ({ apiKey: 'k', include: ['profile'], userAgent: 'u', fetchImpl: f, retryDelayMs: 0, ...extra });

test('normalizes, pads and de-duplicates company numbers', () => {
	const r = normalizeCompanyNumbers([' 7420328 ', 'sc123456', '07420328', 'SC 123456', 'not a number', '']);
	assert.deepEqual(r.numbers, ['07420328', 'SC123456']);
	assert.deepEqual(r.invalid, ['not a number']);
	assert.equal(r.truncated, 0);
});

test('caps a run so one job cannot exhaust the shared Companies House rate limit', () => {
	const many = Array.from({ length: MAX_COMPANIES_PER_RUN + 25 }, (_, i) => String(i + 1));
	const r = normalizeCompanyNumbers(many);
	assert.equal(r.numbers.length, MAX_COMPANIES_PER_RUN);
	assert.equal(r.truncated, 25);
});

test('the cap is a deliberate, modest number', () => {
	assert.ok(MAX_COMPANIES_PER_RUN >= 100 && MAX_COMPANIES_PER_RUN <= 1000);
});

test('fetchBundle sends the key, the include list and an attributable User-Agent', async () => {
	const f = fakeFetch();
	const r = await fetchBundle('07420328', opts(f, { include: ['profile', 'compliance'], userAgent: 'registrum-apify/x' }));
	assert.equal(r.status, 'ok');
	assert.equal(r.data.company_number, '07420328');
	const { url, init } = f.calls[0];
	assert.match(url, /\/v1\/company\/07420328\/bundle\?include=profile%2Ccompliance$/);
	assert.equal(init.headers['X-API-Key'], 'k');
	assert.equal(init.headers['User-Agent'], 'registrum-apify/x');
});

test('fetchBundle reports not_found on 404 without retrying', async () => {
	const f = fakeFetch();
	const r = await fetchBundle('99999999', opts(f));
	assert.equal(r.status, 'not_found');
	assert.equal(f.calls.length, 1);
});

test('fetchBundle retries 429 and 5xx, then succeeds', async () => {
	const f = fakeFetch({ script: [429, 503] });
	const r = await fetchBundle('07420328', opts(f));
	assert.equal(r.status, 'ok');
	assert.equal(f.calls.length, 3);
});

test('fetchBundle gives up with an error after repeated failures', async () => {
	const f = fakeFetch({ script: [500, 500, 500, 500] });
	const r = await fetchBundle('07420328', opts(f));
	assert.equal(r.status, 'error');
});

// CH-Api#206: a shed 503 says when capacity returns. Retrying after 2s/4s/6s instead tripled the
// load on a saturated window (5365 shed 503s for ~2000 companies on 2026-11-03).
test('fetchBundle waits the server-stated Retry-After before retrying a shed 503', async () => {
	const f = fakeFetch({ script: [{ status: 503, headers: { 'Retry-After': '45' } }] });
	const sleeps = [];
	const r = await fetchBundle('07420328', opts(f, { retryDelayMs: 2000, sleepImpl: async (ms) => { sleeps.push(ms); } }));
	assert.equal(r.status, 'ok');
	assert.deepEqual(sleeps, [45000]);
});

test('fetchBundle caps an absurd Retry-After so a run cannot hang', async () => {
	const f = fakeFetch({ script: [{ status: 429, headers: { 'Retry-After': '99999' } }] });
	const sleeps = [];
	await fetchBundle('07420328', opts(f, { sleepImpl: async (ms) => { sleeps.push(ms); } }));
	assert.deepEqual(sleeps, [MAX_RETRY_AFTER_MS]);
});

test('fetchBundle falls back to linear backoff without a usable Retry-After', async () => {
	const f = fakeFetch({ script: [500, { status: 503, headers: { 'Retry-After': 'soon' } }] });
	const sleeps = [];
	await fetchBundle('07420328', opts(f, { retryDelayMs: 2000, sleepImpl: async (ms) => { sleeps.push(ms); } }));
	assert.deepEqual(sleeps, [2000, 4000]);
});

test('fetchBundle does not retry an auth failure', async () => {
	const f = fakeFetch({ script: [401] });
	const r = await fetchBundle('07420328', opts(f));
	assert.equal(r.status, 'error');
	assert.equal(f.calls.length, 1);
});

function harness({ limitAfter = Infinity } = {}) {
	const pushed = [];
	let charged = 0;
	const push = async (row, eventName) => {
		pushed.push({ row, eventName });
		if (!eventName) return undefined;
		charged += 1;
		return { eventChargeLimitReached: charged >= limitAfter, chargedCount: 1 };
	};
	return { pushed, push, charged: () => charged };
}

const toRow = (bundle) => ({ company_number: bundle.company_number });

test('processCompanies charges found companies and never charges not-found', async () => {
	const h = harness();
	const f = fakeFetch();
	const summary = await processCompanies(['07420328', '99999999', '13339241'], {
		fetchOne: (n) => fetchBundle(n, opts(f)), toRow, push: h.push, eventName: 'company', concurrency: 2,
	});
	assert.equal(h.charged(), 2);
	const notFound = h.pushed.find((p) => p.row.company_number === '99999999');
	assert.equal(notFound.eventName, undefined);
	assert.equal(notFound.row.error, 'not_found');
	assert.deepEqual(summary, { charged: 2, free: 0, notFound: 1, errors: 0, stoppedAtBudget: false });
});

test('processCompanies does not charge rows the actor marks as not chargeable', async () => {
	const h = harness();
	const f = fakeFetch();
	const summary = await processCompanies(['07420328', '00445790'], {
		fetchOne: (n) => fetchBundle(n, opts(f)), toRow, push: h.push, eventName: 'company', concurrency: 1,
		isChargeable: (b) => b.company_number !== '00445790',
	});
	assert.equal(summary.charged, 1);
	assert.equal(summary.free, 1);
});

test('processCompanies stops when the user budget is reached', async () => {
	const h = harness({ limitAfter: 1 });
	const f = fakeFetch();
	const summary = await processCompanies(['07420328', '13339241', '16049917', '00445790'], {
		fetchOne: (n) => fetchBundle(n, opts(f)), toRow, push: h.push, eventName: 'company', concurrency: 1,
	});
	assert.equal(summary.stoppedAtBudget, true);
	assert.equal(h.charged(), 1);
	assert.equal(f.calls.length, 1);
});
