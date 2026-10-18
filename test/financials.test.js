import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toFinancialsRow, isChargeable } from '../actors/uk-company-financials-json/src/row.js';
import { fixture } from './helpers.js';

test('flattens parsed accounts into current and prior columns', () => {
	const row = toFinancialsRow(fixture('07420328').data);
	assert.equal(row.company_name, 'BAKERY BAGIETKA LTD');
	assert.equal(row.financials_available, true);
	assert.equal(row.period_end, '2025-10-31');
	assert.equal(row.filed_on, '2026-07-27');
	assert.equal(row.net_assets, 215929);
	assert.equal(row.net_assets_prior, 295725);
	assert.equal(row.cash, 30831);
	assert.equal(row.employees, 44);
	assert.equal(row.turnover, null);
	assert.equal(row.completeness, 0.77);
	assert.ok(row.missing_fields.includes('turnover'));
});

test('lists current board directors without their other appointments', () => {
	const row = toFinancialsRow(fixture('07420328').data);
	assert.ok(row.directors.length >= 1);
	for (const d of row.directors) assert.deepEqual(Object.keys(d).sort(), ['appointed_on', 'name', 'role']);
	assert.ok(row.directors.every((d) => !/secretary/.test(d.role)));
});

test('a company without parsable accounts says why and is not charged', () => {
	const tesco = fixture('00445790').data;
	const row = toFinancialsRow(tesco);
	assert.equal(row.financials_available, false);
	assert.equal(row.unavailable_reason, 'image_pdf');
	assert.equal(row.net_assets, null);
	assert.equal(isChargeable(tesco), false);
	assert.equal(isChargeable(fixture('07420328').data), true);
});

test('every row links back with Apify attribution', () => {
	const row = toFinancialsRow(fixture('07420328').data);
	assert.equal(row.registrum_url, 'https://registrum.co.uk/company/07420328?utm_source=apify&utm_medium=actor&utm_campaign=financials-json');
});
