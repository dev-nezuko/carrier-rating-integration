import { readFile } from 'node:fs/promises';
import { createUpsRatingCarrier } from '../dist/index.js';

const rating = JSON.parse(await readFile(new URL('../test/fixtures/ups-rating-success.json', import.meta.url), 'utf8'));
const token = JSON.parse(await readFile(new URL('../test/fixtures/ups-token-response.json', import.meta.url), 'utf8'));
// Every request is answered locally. This example never calls UPS.
const fetchFixture = async input => {
  const url = String(input);
  return new Response(JSON.stringify(url.includes('/oauth/token') ? token : rating), { status: 200 });
};
const carrier = createUpsRatingCarrier({
  apiBaseUrl: 'https://fixture.invalid/api',
  oauthTokenUrl: 'https://fixture.invalid/oauth/token',
  clientId: 'offline-example', clientSecret: 'offline-placeholder',
  accountNumber: '', ratingVersion: 'v2409', requestTimeoutMs: 1000, tokenSkewMs: 60000,
}, fetchFixture);
const quotes = await carrier.getRates({
  origin: {lines: ['123 Example Street'], city: 'Timonium', stateProvinceCode: 'MD', postalCode: '21093', countryCode: 'US'},
  destination: {lines: ['456 Example Lane'], city: 'Alpharetta', stateProvinceCode: 'GA', postalCode: '30005', countryCode: 'US'},
  shipper: {name: 'Synthetic Example'},
  packages: [{weight: {value: 1, unit: 'LBS'}, dimensions: {length: 5, width: 5, height: 5, unit: 'IN'}}],
});
console.log('Fixture quotes only; these are not live shipping prices.');
console.log(JSON.stringify(quotes, null, 2));
