# GridSignal Texas PRD

## 1. Product summary

GridSignal Texas is a Texas-only interactive energy map that helps users identify counties where backup energy planning may be useful.

The app displays Texas counties on a map and assigns each county a Backup Priority Score based on:

- weather risk
- solar potential
- demand exposure
- statewide grid strain
- likely utility/service territory context

The app is designed for clear public-data exploration. It does not predict outages, determine exact utility reliability, estimate electricity bills, or provide professional legal, engineering, investment, or energy advice.

The primary output is a county-level map and a county detail panel that explains why a county has a given backup-planning priority.

## 2. Target user

The target user is someone who wants a clear, public-data-based view of where backup energy planning may matter most in Texas.

This includes:

- homeowners thinking about solar and battery backup
- renters trying to understand local energy risk context
- small business owners evaluating backup power needs
- students, builders, and researchers exploring Texas energy conditions
- community organizations comparing county-level energy exposure

The user does not need technical grid knowledge. The app should explain results in plain English.

## 3. Core problem

Texas energy risk is difficult for normal users to understand because useful signals are spread across different sources.

Weather data, solar potential, population demand, grid strain, and utility context are not usually shown together in one simple county-level view.

GridSignal Texas solves this by combining public data into one explainable county-level Backup Priority Score.

The app answers one question:

Which Texas counties appear to have higher backup energy planning priority based on public weather, solar, demand, and grid strain data?

## 4. Core user flow

1. The user opens GridSignal Texas.
2. The user sees a Texas county map.
3. Counties are colored by Backup Priority Score.
4. The user can switch between supported map layers.
5. The user clicks a county.
6. A county detail panel opens.
7. The panel shows the county score, label, input scores, utility context, recommendation, data quality, and limitation wording.
8. The user can search for a county, city, or ZIP code.
9. The app maps the search result to the relevant county when possible.
10. The user can copy or export a short county report.

The app must stay focused on this map-to-county-detail workflow.

## 5. Required features

### Texas county map

The app must display Texas counties using county boundaries from a static GeoJSON file or Census/TIGER-derived data.

Each county must be clickable.

Each county must be colored by the selected layer.

Default layer:

- Backup Priority Score

Supported layers:

- Backup Priority Score
- Weather Risk
- Solar Potential
- Demand Exposure
- Statewide Grid Strain

### County detail panel

When a county is selected, the app must show:

- county name
- county FIPS code
- Backup Priority Score
- priority label
- weather risk score
- solar potential score
- demand exposure score
- statewide grid strain score
- likely utility/service territory context
- grid region context when available
- recommendation
- score explanation
- data quality label
- last updated timestamp
- limitation wording

### Backup Priority Score

Each county must receive a Backup Priority Score from 0 to 100.

The score must be deterministic and explainable.

The score must be calculated from normalized component scores.

The score must not use AI-generated or invented values.

### Priority labels

The app must label county scores as:

- Low
- Medium
- High
- Critical

The label must be derived directly from the numeric score.

### Search

The app must support search by:

- county name
- city
- ZIP code

If a city or ZIP code is searched, the app should resolve it to a Texas county when possible.

If the location cannot be resolved, the app must show a clear error state.

### Utility/service territory context

The app must show likely utility or service territory context when available.

Utility/service territory must be treated as context only.

Utility/service territory must not directly affect the Backup Priority Score unless reliable utility-level reliability data exists.

The app must use wording such as “likely utility/service territory” rather than making legal or exact service-area claims.

### Recommendation card

Each county detail panel must include a short recommendation based on the score and score drivers.

The recommendation must use cautious planning language.

Acceptable wording:

- “Backup energy planning may be useful here.”
- “Solar plus battery backup may be worth evaluating.”
- “This county shows elevated planning priority based on public data signals.”

Unacceptable wording:

- “This county will have outages.”
- “This utility is unreliable.”
- “You should buy solar.”
- “This is a professional engineering recommendation.”

### Report copy/export

The app must allow users to copy or export a short county report.

The report must include:

- county name
- Backup Priority Score
- priority label
- main score drivers
- recommendation
- data quality label
- limitation wording

### Data source footer

The app must include a visible data source footer listing the public data categories used.

The footer must make clear that values may be estimated, cached, or unavailable depending on API status.

### Loading, error, and fallback states

The app must include clear states for:

- loading data
- failed API fetch
- unavailable score component
- fallback estimate used
- no search result
- selected county with partial data

Fallback values must be labeled clearly.

## 6. Explicit non-goals

GridSignal Texas must not be a national grid map.

GridSignal Texas must not support states outside Texas.

GridSignal Texas must not predict outages.

GridSignal Texas must not claim to know exact household-level reliability.

GridSignal Texas must not calculate electricity bills.

GridSignal Texas must not estimate savings from solar.

GridSignal Texas must not recommend specific solar installers, utilities, products, or financing options.

GridSignal Texas must not provide legal advice.

GridSignal Texas must not provide engineering advice.

GridSignal Texas must not provide investment advice.

GridSignal Texas must not be an ERCOT dashboard clone.

GridSignal Texas must not be an InfraMap clone.

GridSignal Texas must not be a power-line explorer.

GridSignal Texas must not be a substation explorer.

GridSignal Texas must not use utility/service territory as a score input unless reliable utility-level reliability data exists.

GridSignal Texas must not present estimated data as exact data.

GridSignal Texas must not add accounts, payments, subscriptions, chatbots, or user profiles.

## 7. Data assumptions

The primary geography is Texas county.

Each county is represented by:

- county boundary
- county FIPS code
- county name
- centroid latitude
- centroid longitude
- population
- likely utility/service territory context when available

Weather risk is calculated using public weather data for the county centroid.

Solar potential is calculated using public solar potential data for the county centroid.

Demand exposure is calculated using county population or another clearly documented public demand proxy.

Statewide grid strain is calculated from ERCOT public data or EIA balancing-authority data when available.

If live grid strain data is unavailable, the app may use a clearly labeled fallback estimate.

Utility/service territory may come from PUCT public maps, static lookup data, or another public source.

If utility/service territory data is uncertain, the app must label it as likely, estimated, or unavailable.

All score inputs must be normalized from 0 to 100 before being combined.

## 8. Risk and limitation wording

The app must clearly state that the Backup Priority Score is a planning signal, not a prediction.

Required limitation language:

“GridSignal Texas estimates backup energy planning priority using public data. It does not predict outages, determine exact utility reliability, or provide legal, engineering, investment, or energy advice.”

County-level results must be presented as approximate.

Statewide grid strain must not be described as county-specific unless the source directly supports county-level values.

Utility/service territory must not be described as a legal service determination.

Solar potential must not be described as a household-specific rooftop solar assessment.

Weather risk must not be described as a guaranteed outage driver.

Demand exposure must not be described as exact electricity consumption unless actual consumption data is used.

## 9. Acceptance criteria

The app is acceptable only if all of the following are true:

- The app displays a Texas county map.
- The app does not display or support non-Texas regions.
- Each county can be selected.
- Each selected county opens a detail panel.
- The detail panel shows a Backup Priority Score from 0 to 100.
- The detail panel shows the component scores that created the final score.
- The final score is deterministic and explainable.
- The app includes the required scoring formula.
- The app includes priority labels.
- The app includes layer toggles.
- The app includes county, city, or ZIP search.
- The app includes a copy/export report feature.
- The app includes likely utility/service territory context when available.
- Utility/service territory does not affect the score unless reliable utility-level reliability data exists.
- The app labels estimated, cached, live, fallback, or unavailable data clearly.
- The app includes loading, error, empty, and fallback states.
- The app does not claim to predict outages.
- The app does not provide legal, engineering, investment, or billing advice.
- The app does not include accounts, payments, chatbots, or national support.
- The app includes visible data source and limitation wording.
- The app can run locally using documented setup steps.
- API keys are handled through environment variables.
- No secrets are committed to source code.

## 10. Final scope lock

GridSignal Texas is locked as a Texas-only county-level backup energy planning map.

The final app includes:

- Texas county map
- Backup Priority Score
- weather risk layer
- solar potential layer
- demand exposure layer
- statewide grid strain layer
- likely utility/service territory context
- county detail panel
- layer toggles
- search
- report copy/export
- data quality labels
- source and limitation wording

The final app excludes:

- national expansion
- outage prediction
- billing estimates
- solar savings calculations
- exact household-level claims
- utility reliability rankings
- transmission-line analysis
- substation analysis
- ERCOT dashboard cloning
- InfraMap cloning
- user accounts
- payments
- chatbots
- future roadmap language

This scope is final for the one-shot build.
