import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (actor, file) => JSON.parse(readFileSync(new URL(`../actors/${actor}/.actor/${file}`, import.meta.url), 'utf8'));

// The Apify Store refuses to publish an actor without an output schema.
for (const actor of ['uk-company-eccta-gap-finder', 'uk-company-financials-json']) {
	test(`${actor} declares an output schema whose views exist`, () => {
		const manifest = read(actor, 'actor.json');
		assert.equal(manifest.output, './output_schema.json');
		const output = read(actor, 'output_schema.json');
		assert.equal(output.actorOutputSchemaVersion, 1);
		assert.ok(output.title);
		const views = Object.keys(read(actor, 'dataset_schema.json').views);
		const entries = Object.values(output.properties);
		assert.ok(entries.length > 0);
		for (const o of entries) {
			assert.ok(o.title && o.template, 'every output needs title and template');
			assert.match(o.template, /^\{\{links\.apiDefaultDatasetUrl\}\}\/items/);
			const view = o.template.match(/view=([\w-]+)/)?.[1];
			if (view) assert.ok(views.includes(view), `view ${view} is not in dataset_schema.json`);
		}
	});
}
