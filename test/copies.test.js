import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// `apify push` uploads one actor directory, so each actor carries a copy of the shared client.
// The copies must not drift: edit shared/registrum.js, then run `npm run sync`.
for (const actor of ['uk-company-eccta-gap-finder', 'uk-company-financials-json']) {
	test(`${actor} carries an identical copy of shared/registrum.js`, () => {
		const shared = readFileSync(new URL('../shared/registrum.js', import.meta.url), 'utf8');
		const copy = readFileSync(new URL(`../actors/${actor}/src/registrum.js`, import.meta.url), 'utf8');
		assert.equal(copy, shared, 'copy drifted - run `npm run sync`');
	});
}
