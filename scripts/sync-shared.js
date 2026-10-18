// Copies shared/registrum.js into every actor (apify push uploads one directory at a time).
import { copyFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
for (const actor of readdirSync(new URL('actors/', root))) {
	copyFileSync(new URL('shared/registrum.js', root), new URL(`actors/${actor}/src/registrum.js`, root));
	console.log(`synced ${actor}`);
}
