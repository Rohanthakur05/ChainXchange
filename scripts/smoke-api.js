/**
 * Smoke-test public API routes (local or production).
 * Usage: node scripts/smoke-api.js
 *        API_BASE=https://chainxchange-api.onrender.com node scripts/smoke-api.js
 */
const API_BASE = (process.env.API_BASE || 'http://localhost:8000').replace(/\/$/, '');

const routes = [
  { method: 'GET', path: '/health', expectStatus: [200] },
  { method: 'GET', path: '/', expectStatus: [200] },
  { method: 'GET', path: '/crypto', expectStatus: [200] },
  { method: 'GET', path: '/api/home', expectStatus: [200] },
  { method: 'GET', path: '/crypto/search?q=bitcoin', expectStatus: [200] },
  { method: 'GET', path: '/crypto/markets-by-ids?ids=bitcoin,ethereum', expectStatus: [200] },
  { method: 'GET', path: '/crypto/simple-prices?ids=bitcoin', expectStatus: [200] },
  { method: 'GET', path: '/crypto/chart-data/bitcoin?days=7', expectStatus: [200] },
];

async function run() {
  console.log(`Smoke testing ${API_BASE}\n`);
  let failed = 0;

  for (const { method, path, expectStatus } of routes) {
    const url = `${API_BASE}${path}`;
    try {
      const res = await fetch(url, { method });
      const ok = expectStatus.includes(res.status);
      const mark = ok ? 'OK' : 'FAIL';
      if (!ok) failed += 1;
      console.log(`${mark} ${method} ${path} → ${res.status}`);
    } catch (err) {
      failed += 1;
      console.log(`FAIL ${method} ${path} → ${err.message}`);
    }
  }

  console.log(failed ? `\n${failed} route(s) failed` : '\nAll routes passed');
  process.exit(failed ? 1 : 0);
}

run();
