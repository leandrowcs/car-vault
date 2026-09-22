# Gas Stations

Open **Gas Stations** in the sidebar or mobile menu, or **Select nearby station** in the fuel form. A single browser location request starts the search. For manual search, enter a **city or postal code**, press **Search location**, then choose a matching place. Include the province or country to distinguish cities with the same name. Coordinates are resolved internally, never requested as manual input.

Choose regular, mid-grade, premium, or diesel; a 1/5/10/20/30 km radius; and distance or price sorting. Distances use the haversine formula and are straight-line estimates, not route lengths. Unknown prices sort last. Selecting a station opens Add Fuel (an active, unsold fuel-powered vehicle is required). Navigate opens OpenStreetMap directions in another tab.

## Providers and price limits

- `GasStationProvider` is the replaceable service contract. UI components receive normalized `GasStation` objects, never provider response bodies.
- Gas Québec is attempted inside its documented coordinate bounds, with at most 10 results and a 30 km radius. The selected radius, grade, and sort are passed to the API. Limits are not bypassed by pagination or area sweeps.
- The documented nearby endpoint provides regular, premium, and diesel prices in CAD cents/L. They are converted to CAD/L internally. Mid-grade is not inferred from other grades.
- The observed nearby response lacks per-station update timestamps. The UI distinguishes retrieval time from price update time and explicitly reports unavailable update times. If supplied, valid update timestamps are retained; flagged stale or over-seven-day-old prices are omitted.
- OpenStreetMap Overpass (`amenity=fuel`, nodes/ways/relations) provides fallback station locations when Gas Québec is unavailable, empty, outside coverage, or does not support the grade. Missing OSM fuel tags mean unknown availability, not confirmed availability. OSM does not supply prices here. Stations from different providers are not merged by coordinate proximity, which could assign the wrong price to an adjacent station.
- Price and map attribution stay visible. Prices are suggestions and must be checked at the pump.

## Fuel entry and compatibility

Station selection fills the name, grade, and available price. A manually edited price (including one derived from a manually edited total) is never replaced by station selection. Selecting a station without a price clears the previous automatic suggestion. Changing grade clears automatic suggestions. Existing entries retain their saved price and legacy fuel type until the user explicitly changes them.

Fuel grades are stored in the existing optional `FuelEntry.fuelType` string field. Vehicle powertrain types are unchanged. The existing JSON, CSV, local storage, and cloud record paths continue to handle entries. Selected coordinates are never stored with a fuel entry. Suggestions in a different currency are shown but not automatically applied; there is no currency conversion.

## Runtime and deployment

Gas Québec did not return `Access-Control-Allow-Origin` in the verified live response. The fixed-destination GET proxy is therefore required:

- `frontend/server/gasQuebecProxy.ts`: input validation, upstream timeout, sanitized errors, Retry-After handling, no-store response. It accepts no upstream URL and forwards no browser credentials.
- `api/gas-stations.ts`: Vercel handler when deploying from the repository root (the recommended existing setup).
- `frontend/api/gas-stations.ts`: equivalent handler for frontend-root deployments.
- Root `package.json` declares ES modules; both API roots use NodeNext TypeScript configuration and explicit `.js` import extensions. This fixes the observed production `ERR_REQUIRE_ESM` crash when a CommonJS entry imported the frontend's ES module handler.
- `frontend/vite.config.ts`: same handler in Vite development and preview.
- `VITE_GAS_QUEBEC_ENDPOINT`: defaults to `/api/gas-stations`; configure an equivalent proxy when using another hosting platform. A static-only host cannot serve this endpoint.
- `VITE_OVERPASS_ENDPOINT`: replaceable Overpass endpoint, defaulting to the public OpenStreetMap instance. Use a suitable hosted/self-hosted endpoint if usage grows beyond a personal app.
- `VITE_LOCATION_SEARCH_ENDPOINT`: defaults to `/api/location-search`, served by both Vercel API roots and Vite dev/preview. The fixed-destination proxy calls Photon; `LocationSearchProvider` keeps geocoding separate from device geolocation and station providers.

No keys or new paid services are required by the integration. No deployment is performed by the implementation. Standard host request logging may include coordinate query parameters: configure hosting log retention appropriately; application code does not log or permanently store coordinates.

## Requests and privacy

Manual city/postcode search sends text to Photon only after submission, never on each keystroke. Results include place labels, explicit selection and OpenStreetMap attribution. The replaceable service deduplicates requests and caches at most 12 queries in memory for five minutes. Photon permits reasonable personal use without an availability guarantee; high-volume use requires a suitable hosted/self-hosted provider.

Only the station page and opened picker request geolocation. No background tracking, polling, place-name autocomplete, or persistent location cache is used. Nearby search keys/results live in memory for five minutes, with at most 12 completed entries. Duplicate in-flight searches share a request. Expired displayed searches require an explicit refresh, rather than fetching automatically. Filter changes initiate a relevant new search; repeated equivalent queries reuse the cache. HTTP 429 Retry-After delays are respected across queries to the same provider. Failed lookups are not cached as successful results.

The browser shares the search coordinates with the active provider (via the application's proxy for Gas Québec). Provider failure does not block manual fuel entry or saved history. External API results are not included in the PWA precache.

## Verification

`npm run test:run` covers normalization, coordinates, malformed/missing/stale prices, fuel grades, OSM metadata, sorting/filtering, request deduplication, cache expiration, rate limiting, location outcomes, proxy validation, and the rendered form → local storage workflow. `npm run build` checks TypeScript and produces the PWA bundle.

`npm run test:api` compiles both API roots and invokes all four function entry points in native Node ESM, preserving package boundaries. This catches production module-loading failures that Vite/Vitest bundling can hide. City/postcode normalization, explicit selection, empty results and caching also have regression coverage.

Provider references checked September 22, 2026:

- [Gas Québec API](https://www.gasquebec.ca/api)
- [Gas Québec OpenAPI contract](https://www.gasquebec.ca/openapi.json)
- [Gas Québec terms and attribution](https://www.gasquebec.ca/en/terms)
- [OpenStreetMap Overpass API and public instance guidance](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [OpenStreetMap attribution and licence](https://www.openstreetmap.org/copyright)
- [Photon API and public demo usage policy](https://github.com/komoot/photon)
