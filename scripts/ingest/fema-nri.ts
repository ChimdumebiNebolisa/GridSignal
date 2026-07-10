/**
 * Ingest FEMA NRI county hazard data.
 * Download v1.20 county CSV from https://www.fema.gov/flood-maps/products-tools/national-risk-index
 * Place processed JSON at src/data/sources/fema_nri/county-hazard.json
 * Then run: npm run data:build
 */

console.log(
  "FEMA NRI ingest: download county CSV from FEMA NRI v1.20 and convert to county-hazard.json"
);
