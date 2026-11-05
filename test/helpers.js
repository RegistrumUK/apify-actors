import { readFileSync } from 'node:fs';

/** A captured live response from api.registrum.co.uk (2026-10-18), never hand-written. */
export function fixture(number) {
	return JSON.parse(readFileSync(new URL(`./fixtures/bundle-${number}.json`, import.meta.url), 'utf8'));
}

/** A fetch that answers from fixtures; `script` forces a status per call, for retry tests. */
export function fakeFetch({ script = [] } = {}) {
	const calls = [];
	const impl = async (url, init) => {
		calls.push({ url, init });
		const forced = script.shift();
		if (forced) {
			// A number is a bare status; an object adds headers (e.g. Retry-After).
			const { status, headers } = typeof forced === 'number' ? { status: forced } : forced;
			return new Response(JSON.stringify({ detail: 'forced' }), { status, headers });
		}
		const number = decodeURIComponent(new URL(url).pathname.split('/')[3]);
		const body = fixture(number);
		return new Response(JSON.stringify(body), { status: body.status === 'error' ? 404 : 200 });
	};
	impl.calls = calls;
	return impl;
}
