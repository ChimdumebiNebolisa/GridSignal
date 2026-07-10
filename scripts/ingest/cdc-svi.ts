/**
 * Ingest CDC/ATSDR SVI 2022 Texas county data.
 * Download from https://www.atsdr.cdc.gov/place-health/php/svi/svi-data-documentation-download.html
 * Place at src/data/sources/cdc_svi/county-svi.json
 * Then run: npm run data:build
 */

console.log(
  "CDC SVI ingest: download Texas county CSV and convert to county-svi.json"
);
