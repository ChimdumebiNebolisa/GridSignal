# GridSignal Texas UI/UX Design Specification

## 1. Visual direction

GridSignal Texas should look like a serious public-data energy intelligence tool, not a raw developer dashboard. The design should feel polished, restrained, and trustworthy.

The visual tone should be:

- Map-first
- Clean
- Technical but understandable
- Calm rather than dramatic
- Serious enough for a portfolio project
- Honest about estimates and data quality

The app should avoid visual language that implies outage prediction, emergency alerts, or real-time utility operations unless the data directly supports it.

Recommended style:

- Light background with subtle gray panels
- Dark text for readability
- Muted borders
- Clear score colors
- Compact cards
- Minimal motion
- Strong spacing
- Clear hierarchy between map, score, explanation, and data quality

The interface should communicate one main idea quickly:

GridSignal Texas estimates which Texas counties have higher backup energy planning priority based on public data.

## 2. Layout structure

The default desktop layout should use a two-region structure:

1. Main map area
2. County detail side panel

Desktop layout:

- Full-page app shell
- Header at the top
- Map occupying most of the screen
- Right-side county detail panel
- Floating controls over the map for search, layer toggles, and legend
- Footer or compact source strip at the bottom

Recommended desktop structure:

- Header height: compact, about 56 to 72 px
- Map area: primary surface
- Side panel width: about 360 to 440 px
- Map controls: top-left or top-right overlay
- Legend: bottom-left or bottom-right overlay
- Data source footer: bottom strip or panel footer

Mobile layout:

- Map remains primary
- County panel becomes a bottom sheet
- Search stays near the top
- Layer toggles collapse into a compact menu
- Legend can collapse into a button or drawer

The mobile version only needs to be usable, not feature-expanded.

## 3. Map behavior

The map should display Texas counties as the primary geography.

Required map behavior:

- Display all Texas county boundaries
- Color each county by the selected layer
- Default layer is Backup Priority Score
- Hovering a county highlights it and shows a small tooltip
- Clicking a county opens or updates the county detail panel
- Selected county remains visually highlighted
- Search selection should zoom or pan to the matching county
- Map should not require paid tiles
- If base tiles are unavailable, the county GeoJSON map must still work

County tooltip should show only:

- County name
- Current selected layer label
- Score or status

Example tooltip:

```text
Dallas County
Backup Priority: High
Score: 76/100
```

Do not show too much data in the tooltip. The side panel is responsible for detailed explanation.

Map controls should include:

- Zoom in
- Zoom out
- Reset Texas view
- Optional selected-county reset

The map should not show exact power lines, substations, or household-level claims.

## 4. Color and score language

The default map color should represent Backup Priority Score.

Backup Priority labels:

- Low: 0 to 39
- Medium: 40 to 59
- High: 60 to 79
- Critical: 80 to 100

Use a restrained four-level color scale. The colors should be visually distinct but not alarmist.

Recommended language:

- Low backup priority
- Medium backup priority
- High backup priority
- Critical backup priority

Avoid these phrases:

- Outage risk
- Blackout prediction
- Failure probability
- Unsafe grid
- Guaranteed backup need
- County grid weakness
- Utility reliability ranking

Use these safer phrases:

- Backup planning priority
- Estimated planning signal
- Higher exposure
- Stronger case for backup planning
- Based on available public data
- Statewide grid strain signal
- Utility context only

Layer language:

- Backup Priority
- Weather Risk
- Solar Potential
- Demand Exposure
- Statewide Grid Strain

Utility language:

- Likely utility/service territory
- Utility context
- Informational service-area context

Do not use utility/service territory as a score color unless reliable utility-level reliability data is added and documented.

## 5. County side panel structure

The county side panel is the most important explanatory part of the app. It must explain the score clearly and quickly.

Required side panel order:

1. County title
2. Backup Priority Score
3. Priority label
4. Short interpretation
5. Score breakdown
6. Recommendation card
7. Utility/service territory context
8. Data quality/status
9. Last updated
10. Copy/export report action
11. Source notes or limitations

Recommended structure:

```text
Dallas County, Texas

Backup Priority
76/100
High

Interpretation:
Backup energy planning may be useful here because demand exposure and weather risk are elevated, while solar potential is strong.

Score Breakdown:
Weather Risk: 82/100
Solar Potential: 74/100
Demand Exposure: 91/100
Statewide Grid Strain: 54/100

Recommendation:
Consider solar + battery backup planning for homes, small businesses, and essential facilities. This is a planning signal, not an outage prediction.

Utility Context:
Likely Utility/Service Territory: Oncor
Use: Context only, not part of the score

Data Quality:
Weather: live
Solar: cached
Population: static
Grid strain: live or cached
Utility context: estimated

Last Updated:
2026-05-22 14:30 UTC
```

The score breakdown should make the weighting visible:

```text
Weather Risk: 30%
Solar Potential: 25%
Demand Exposure: 25%
Statewide Grid Strain: 20%
```

The panel must clearly state when a value is estimated, cached, live, fallback, or unavailable.

## 6. Layer toggle behavior

Layer toggles should allow the user to recolor the county map by different score inputs.

Required layers:

- Backup Priority
- Weather Risk
- Solar Potential
- Demand Exposure
- Statewide Grid Strain

Default selected layer:

- Backup Priority

Behavior:

- Selecting a layer changes county fill colors
- Legend updates to match selected layer
- Tooltip updates to match selected layer
- County side panel remains open if a county is selected
- Side panel still shows the full Backup Priority Score even when another layer is selected
- If a layer has unavailable data, show unavailable styling instead of inventing values

Layer toggle UI:

- Desktop: segmented control or compact button group
- Mobile: dropdown or drawer
- Each layer should have a short description available through tooltip or helper text

Example helper text:

```text
Weather Risk uses recent and forecast weather conditions at the county centroid.
```

Grid strain helper text should be careful:

```text
Statewide Grid Strain uses ERCOT or EIA balancing-authority signals. It is not county-specific grid reliability data.
```

## 7. Search behavior

Search should support:

- County name
- City name
- ZIP code

Search result behavior:

- County name search directly selects the county
- City search maps the city to its county
- ZIP search maps the ZIP to the likely county
- If a city or ZIP spans multiple counties, show the best match and label it as approximate, or show multiple selectable matches
- If no match is found, show a clear empty state

Search placeholder:

```text
Search county, city, or ZIP
```

Search result examples:

```text
Dallas County
County

Austin
City, maps to Travis County

75428
ZIP, likely maps to Hunt County
```

Search must not imply address-level precision unless address-level geocoding is actually implemented.

If city or ZIP mapping uses a static lookup, label it as:

```text
Approximate county match
```

Error state:

```text
No matching Texas county, city, or ZIP found.
```

## 8. Report export/copy design

Each selected county should have a copy/export report action.

Required action:

- Copy report text to clipboard

Optional action only if simple:

- Download report as `.txt` or `.md`

The report should be concise and shareable.

Report content must include:

- County name
- Backup Priority Score
- Priority label
- Score breakdown
- Recommendation
- Utility context
- Data quality
- Limitation statement
- Last updated time

Report example:

```text
GridSignal Texas Report
Dallas County, Texas

Backup Priority: High
Score: 76/100

Score Breakdown:
- Weather Risk: 82/100
- Solar Potential: 74/100
- Demand Exposure: 91/100
- Statewide Grid Strain: 54/100

Recommendation:
Backup energy planning may be useful here, especially for homes, small businesses, and essential facilities.

Utility Context:
Likely utility/service territory: Oncor
Utility context is informational only and does not directly affect the score.

Limitations:
This report is a public-data planning signal. It does not predict outages or provide legal, engineering, investment, or utility service advice.

Data Quality:
Weather: live
Solar: cached
Population: static
Grid strain: cached
Utility context: estimated

Last updated: 2026-05-22 14:30 UTC
```

After copy action, show a simple confirmation:

```text
Report copied
```

Do not require account creation or login to export/copy a report.

## 9. Error/loading/fallback states

The app must handle loading and failure clearly.

Global loading state:

```text
Loading GridSignal Texas data...
```

Map loading state:

```text
Loading Texas county map...
```

County loading state:

```text
Loading county profile...
```

API fallback state:

```text
Some live data is unavailable. Showing cached or estimated values where available.
```

Unavailable data state:

```text
Unavailable
```

Do not hide missing data. Show it clearly.

Data status labels:

- Live
- Cached
- Static
- Estimated
- Fallback
- Unavailable

API failure behavior:

- Keep the app usable
- Keep the map visible
- Use cached or static data where available
- Mark affected fields as fallback or unavailable
- Do not silently replace failed values with fake values

County panel fallback example:

```text
Statewide Grid Strain: Unavailable
This source could not be reached. The final score is calculated without this input only if the documented fallback rule allows it.
```

If final score cannot be calculated:

```text
Backup Priority: Unavailable
Required score inputs are missing.
```

## 10. Accessibility requirements

The app must be usable without relying only on color.

Accessibility requirements:

- Every colored score must also have a text label
- Map legend must include numeric ranges and labels
- County side panel must be keyboard accessible
- Search must be keyboard accessible
- Buttons must have visible focus states
- Text contrast must be readable
- Tooltips must not contain essential-only information
- County detail panel must contain the full explanation
- Loading and error states must be text-visible
- Copy/export actions must have accessible labels
- Avoid tiny text in the side panel
- Do not use animation as the only feedback

Minimum text sizes:

- Body text: 14 to 16 px
- Key score: large and clear
- Labels: readable at dashboard distance

Screen-reader-friendly labels should exist for:

- Search input
- Layer toggles
- Selected county
- Copy report button
- Map reset button

## 11. Design acceptance criteria

The design is acceptable only if all of the following are true:

- A first-time user can understand the selected county score in under 10 seconds.
- The map defaults to Backup Priority Score.
- Every county color has a matching legend label and numeric range.
- Clicking a county opens a side panel with score, breakdown, recommendation, utility context, data quality, and limitations.
- The county panel explains why the score exists.
- The app never says or implies that it predicts outages.
- Utility/service territory is shown as context only.
- Statewide or balancing-authority grid strain is not presented as exact county-level grid reliability.
- Missing data is labeled as unavailable, fallback, estimated, cached, or static.
- Search supports county, city, and ZIP lookup behavior as documented.
- The copy/export report includes the score, breakdown, recommendation, data quality, utility context, and limitations.
- The layout is map-first on desktop.
- The mobile layout remains usable through a bottom-sheet style county panel or equivalent.
- The UI avoids raw tables as the main experience.
- The app has loading, error, empty, and fallback states.
- The design can be implemented in Next.js, Tailwind CSS, and Leaflet or MapLibre without paid UI dependencies.
- No accounts, payments, chatbot UI, future roadmap UI, or national map controls are present.
