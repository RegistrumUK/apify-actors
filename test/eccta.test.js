import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toEcctaRow } from '../actors/uk-company-eccta-gap-finder/src/row.js';
import { fixture } from './helpers.js';

const TODAY = '2026-10-18';

test('pending directors: names, earliest deadline and days left', () => {
	const row = toEcctaRow(fixture('07420328').data, TODAY);
	assert.equal(row.company_name, 'BAKERY BAGIETKA LTD');
	assert.equal(row.verification_status, 'pending');
	assert.equal(row.people_to_verify, 2);
	assert.deepEqual(row.unverified_people.map((p) => [p.name, p.kind, p.status, p.deadline, p.days_left]), [
		['FELCZAK, Karolina', 'director', 'pending', '2026-11-10', 23],
		['FELCZAK, Piotr', 'director', 'pending', '2026-11-10', 23],
	]);
	assert.equal(row.earliest_deadline, '2026-11-10');
	assert.equal(row.days_to_earliest_deadline, 23);
	assert.equal(row.any_overdue, false);
	assert.equal(row.confirmation_statement_next_due, '2026-11-10');
	assert.equal(row.confirmation_statement_overdue, false);
	assert.equal(row.accounts_overdue, false);
});

test('an overdue PSC is flagged with negative days left', () => {
	const row = toEcctaRow(fixture('13339241').data, TODAY);
	assert.equal(row.any_overdue, true);
	assert.equal(row.unverified_people[0].kind, 'psc');
	assert.ok(row.unverified_people[0].days_left < 0);
});

test('directors and PSCs are counted together', () => {
	const row = toEcctaRow(fixture('16049917').data, TODAY);
	assert.equal(row.people_to_verify, 4);
	assert.equal(row.directors_pending, 2);
	assert.equal(row.pscs_pending, 2);
});

test('a fully verified company has nothing to chase', () => {
	const row = toEcctaRow(fixture('00445790').data, TODAY);
	assert.equal(row.verification_status, 'compliant');
	assert.equal(row.people_to_verify, 0);
	assert.equal(row.earliest_deadline, null);
	assert.equal(row.days_to_earliest_deadline, null);
});

test('every row links back with Apify attribution', () => {
	const row = toEcctaRow(fixture('07420328').data, TODAY);
	assert.equal(row.registrum_url, 'https://registrum.co.uk/company/07420328?utm_source=apify&utm_medium=actor&utm_campaign=eccta-gap-finder');
});

test('rows carry results, never the classification inputs behind them', () => {
	const text = JSON.stringify(toEcctaRow(fixture('07420328').data, TODAY));
	for (const leak of ['identity_verified_on', 'verification_window', 'cache_schema_version', 'risk_score']) {
		assert.ok(!text.includes(leak), leak);
	}
});
