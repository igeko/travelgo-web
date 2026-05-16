# Data sources & travel APIs

Reference document for choosing data providers for TravelGo. Organized by category of information and by tier (accessibility vs. value).

## Categories of data we need

1. **POI · what to visit** (museums, attractions, parks, restaurants, bars, viewpoints)
2. **Lodging** (hotels, B&Bs, hostels, campgrounds)
3. **Transport** (flights, trains, buses, ferries, car rental)
4. **Bookable experiences** (tours, activities, attraction tickets, city transit passes)
5. **Practical context** (weather, maps, reviews, photos, opening hours, average prices)

---

## Tier 1 · Self-service, immediate signup, useful free tier

These can be activated today without partnerships.

### Google Maps Platform (already partially used)
- Places API (New) — POI of every type + details, photos, ratings, hours
- Maps Static / Embed — maps to display
- Routes API — directions and times
- Time Zone API — timezone of a point
- Geocoding / Reverse Geocoding
- **Cost**: pay-per-call with $200/month free credit (= thousands of calls). The Swiss Army knife of digital travel.

### OpenStreetMap + Overpass API
- Free maps, rich POI data (campgrounds, trails, mountain huts, water sources, viewpoints) — especially strong for outdoor
- Nominatim for free geocoding
- **Cost**: zero, but with rate limits and attribution required
- **Trade-off**: quality varies a lot by geographic area. Italy and Europe excellent; Asia/Africa more variable.

### Amadeus Self-Service
- Hotels, flights, activities, transfers
- Free tier 2,000-10,000 calls/month
- Good hotel data quality (it's the GDS feeding much of the industry)
- Predictable costs after free tier

### OpenWeatherMap or Open-Meteo
- Historical, current, forecast weather
- Open-Meteo is free without key for reasonable use
- OpenWeatherMap free tier 60 calls/min
- For TravelGo, displaying day weather is enough

### Wikipedia + Wikivoyage API
- Descriptions of places, cultural and historical context
- Free, no key required
- Wikivoyage specific to travel (community-curated "see/eat/sleep" sections)
- Quality varies but for intro/descriptions it's gold

### Wikidata SPARQL
- Structured database (a place has coordinates, historical period, architect, official Wikipedia link, etc.)
- Free
- Useful for enriching POI data

---

## Tier 2 · Self-service but more niche

### Tripadvisor Content API
- Reviews and ratings of their POIs
- Free tier limited (5,000 calls/month), then paid
- Strength: massive POI database
- ToS constraints: must attribute and link back to their site

### Foursquare Places API
- POI with very detailed categories (900+ native categories)
- Free tier 100k calls/month (historical, verify current)
- Excellent quality in Western cities, weaker in Asia

### Yelp Fusion API
- Strong on restaurants and local businesses (USA-first)
- Free tier 500 calls/day
- Practically useless outside North America

### Mapbox
- Alternative to Google Maps with freer styling
- Generous free tier
- POI data is ok, not Google-level

### HERE Maps
- Another enterprise alternative, decent free tier
- Particularly strong on traffic and vehicle routing

---

## Tier 3 · Transport

### Flights
- **Amadeus Self-Service** (see above) — offers, prices, schedules
- **Skyscanner Travel API** — more consumer-focused, requires approval
- **Duffel API** — modern and developer-friendly, also sells actual bookings
- **Google Flights API** — does not exist publicly (only embeddable widgets)

### Trains and buses
- Trenitalia / Italo: no public API, requires scraping (not recommended)
- Deutsche Bahn (Germany), SNCF (France), Renfe (Spain): all have APIs
- **Rome2Rio** has a paid API covering trains + buses + flights + ferries globally — extremely useful for "how do I get from X to Y" on multi-country trips

### Urban transit
- Citymapper API (limited, partnership-based)
- Google Routes API supports `TRANSIT` mode for many cities
- Apple does not expose APIs
- Individual cities have GTFS-realtime APIs (Rome, Milan, London TfL, NYC MTA…) — useful for city-specific info

### Ferries
- AFerry, FerryHopper have partner programs. No real self-service.

---

## Tier 4 · Experiences and activities

### GetYourGuide Partner API
- Tours, activities, attraction tickets
- Requires partner approval but reasonably accessible
- Revenue share (~8% commission)

### Viator API (Tripadvisor group)
- Similar to GetYourGuide
- More USA catalog, less Europe
- Partnership program

### Klook API
- Strong in Asia
- Partnership

### Tiqets, Musement
- Museum and attraction tickets
- Partnership

---

## Tier 5 · Lodging

- **Booking.com Demand API** — partnership, invite-only
- **Expedia Rapid API** — partnership but more accessible, business account needed
- **Airbnb** — no public API
- **Hostelworld** — partnership program
- **Hotelbeds (HBX)** — B2B wholesaler, contract required

**Realistic pattern for TravelGo**: Amadeus for lodging data + deep links to Booking/Airbnb/official site for booking.

---

## Tier 6 · Aggregators

### TravelPayouts
- Aggregates flights (Aviasales, Kiwi), hotels (Booking, Hotels.com), insurance
- Single-key API
- Revenue share, no fixed costs
- Perfect for "monetizing" without managing 5 separate partnerships
- Trade-off: data passes through their caching layer, not perfectly real-time

**TravelPayouts vs direct partnerships**: for an early stage it gives you 70% of the value without bureaucratic effort. Direct partnerships become more convenient when scaling.

---

## Tier 7 · Context and enrichment

- **Unsplash API** — photos of places (free, non-commercial)
- **Pexels API** — similar, slightly more permissive
- **Currencylayer / Open Exchange Rates** — exchange rates for budget conversion
- **TimezoneDB** — timezones
- **Numbeo API** — cost of living per city (quality varies but useful for orientation)
- **TrustYou** — aggregated review sentiment (B2B partnership)
- **Sygic Travel API** — pre-packaged city itineraries. Hand-curated. Medium-high cost.

---

## Tactical recommendation

For TravelGo in the next 3 months, in priority order:

1. **Google Places** (already in progress) — covers ~70% of POI needs
2. **Open-Meteo** — one endpoint, no key, gives weather per day for any activity
3. **Wikipedia / Wikivoyage** — call on-demand when user clicks a POI to auto-enrich descriptions
4. **OpenStreetMap / Overpass** — only if going seriously into the "campgrounds and outdoor" segment
5. **Amadeus** — when there's a real "find lodging" feature
6. **Currencylayer** — when real budget conversions are needed

For after 3 months (requires partnership or research):
- **TravelPayouts** if monetizing via affiliate
- **GetYourGuide** if selling experiences
- **Rome2Rio** if the app needs to handle multi-country trips well

---

## Integration pattern checklist

All these APIs share three things:
- **Secret API key** → never exposed to the client, always behind our API routes
- **Caching** → almost all allow caching results for hours or days. Reduces costs by 90%+.
- **Attribution** → most require showing a "Powered by X" somewhere. Plan in the design.

### Future-proofing note
A trend on the horizon: provider consolidation via official **MCP servers**. Booking, Airbnb, Google Maps are all considering MCP servers — when they arrive, integration will simplify (standardized authorization, centrally described tool schemas). For now we're in the "old world" of REST APIs. Design the data layer so that switching providers is relatively easy (cache + normalization into our own types, not provider types).
