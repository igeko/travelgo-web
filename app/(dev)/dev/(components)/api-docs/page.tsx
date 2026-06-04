"use client";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "TravelGo API",
    version: "1.0.0",
    description: "Backend API for the TravelGo trip planning app.",
  },
  servers: [{ url: "/api", description: "Local dev server" }],
  tags: [
    { name: "Days", description: "Trip day management" },
    { name: "Activities", description: "Day activity management" },
    { name: "Places", description: "Google Places proxy" },
    { name: "Routes", description: "Google Routes proxy" },
  ],
  paths: {
    "/trips/days/{dayId}": {
      patch: {
        tags: ["Days"],
        summary: "Update a day",
        description: "Partially updates a day record. Only whitelisted fields are accepted.",
        parameters: [
          { name: "dayId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  show_map: { type: "boolean" },
                  city: { type: "string" },
                  label: { type: "string" },
                  day_type: { type: "string" },
                  notes: { type: "string" },
                  summary: { type: "string" },
                  accommodation_type: { type: "string" },
                  accommodation_name: { type: "string" },
                  accommodation_address: { type: "string" },
                  accommodation_url: { type: "string" },
                  accommodation_notes: { type: "string" },
                  accommodation_place_id: { type: "string" },
                  accommodation_lat: { type: "number" },
                  accommodation_lng: { type: "number" },
                  accommodation_cost_amount: { type: "number" },
                  accommodation_cost_currency: { type: "string" },
                  accommodation_cost_paid: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Update successful", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          400: { description: "No valid fields to update" },
          500: { description: "Database error" },
        },
      },
    },
    "/trips/days/{dayId}/activities": {
      get: {
        tags: ["Activities"],
        summary: "List activities for a day",
        parameters: [
          { name: "dayId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "Array of activities", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Activity" } } } } },
        },
      },
      post: {
        tags: ["Activities"],
        summary: "Create an activity",
        parameters: [
          { name: "dayId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ActivityInput" } } },
        },
        responses: {
          201: { description: "Created activity", content: { "application/json": { schema: { $ref: "#/components/schemas/Activity" } } } },
          404: { description: "Day not found" },
          500: { description: "Database error" },
        },
      },
    },
    "/trips/activities/{activityId}": {
      patch: {
        tags: ["Activities"],
        summary: "Update an activity",
        parameters: [
          { name: "activityId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ActivityInput" } } },
        },
        responses: {
          200: { description: "Update successful", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          400: { description: "No valid fields to update" },
          500: { description: "Database error" },
        },
      },
    },
    "/places/autocomplete": {
      get: {
        tags: ["Places"],
        summary: "Autocomplete a place name",
        description: "Proxies Google Places Autocomplete. Returns suggestions for a partial input string.",
        parameters: [
          { name: "input", in: "query", required: true, schema: { type: "string", minLength: 2 }, description: "Partial place name or address" },
        ],
        responses: {
          200: {
            description: "List of suggestions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          placeId: { type: "string" },
                          description: { type: "string" },
                          mainText: { type: "string" },
                          secondaryText: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          500: { description: "Places API not configured" },
          502: { description: "Upstream Google error" },
        },
      },
    },
    "/places/details": {
      get: {
        tags: ["Places"],
        summary: "Get place details",
        description: "Proxies Google Place Details. Returns coordinates, formatted address and address components.",
        parameters: [
          { name: "placeId", in: "query", required: true, schema: { type: "string" }, description: "Google place_id" },
        ],
        responses: {
          200: {
            description: "Place details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    place: {
                      type: "object",
                      properties: {
                        formatted: { type: "string" },
                        name: { type: "string" },
                        placeId: { type: "string" },
                        lat: { type: "number" },
                        lng: { type: "number" },
                        components: { type: "object", additionalProperties: { type: "string" } },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "placeId is required" },
          500: { description: "Places API not configured" },
          502: { description: "Upstream Google error" },
        },
      },
    },
    "/routes": {
      post: {
        tags: ["Routes"],
        summary: "Compute a route polyline",
        description: "Proxies Google Routes API (computeRoutes). Returns an encoded polyline for the given waypoints.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["points"],
                properties: {
                  points: {
                    type: "array",
                    minItems: 2,
                    items: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" } } },
                    description: "Ordered waypoints (first = origin, last = destination)",
                  },
                  travelMode: { type: "string", enum: ["WALKING", "DRIVING", "BICYCLING", "TRANSIT"], default: "WALKING" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Encoded polyline", content: { "application/json": { schema: { type: "object", properties: { polyline: { type: "string" } } } } } },
          400: { description: "Invalid input" },
          404: { description: "No route found" },
          500: { description: "Routes API not configured" },
          502: { description: "Upstream Google error" },
        },
      },
    },
  },
  components: {
    schemas: {
      Activity: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          day_id: { type: "string", format: "uuid" },
          trip_id: { type: "string", format: "uuid" },
          slot: { type: "string", enum: ["morning", "afternoon", "evening", "night"] },
          position: { type: "integer" },
          time: { type: "string", description: "HH:MM" },
          title: { type: "string" },
          short_desc: { type: "string" },
          location: { type: "string" },
          location_place_id: { type: "string" },
          location_lat: { type: "number" },
          location_lng: { type: "number" },
          icon: { type: "string" },
          hero_image: { type: "string" },
          url: { type: "string" },
          budget_amount: { type: "number" },
          budget_currency: { type: "string" },
          budget_paid: { type: "boolean" },
        },
      },
      ActivityInput: {
        type: "object",
        properties: {
          title: { type: "string" },
          short_desc: { type: "string" },
          slot: { type: "string", enum: ["morning", "afternoon", "evening", "night"] },
          time: { type: "string", description: "HH:MM" },
          location: { type: "string" },
          location_place_id: { type: "string" },
          location_lat: { type: "number" },
          location_lng: { type: "number" },
          budget_amount: { type: "number" },
          budget_currency: { type: "string" },
          budget_paid: { type: "boolean" },
        },
      },
    },
  },
};

const html = `<!DOCTYPE html>
<html>
<head>
  <title>TravelGo API Docs</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      spec: ${JSON.stringify(spec)},
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: "BaseLayout",
      deepLinking: true,
    });
  </script>
</body>
</html>`;

export default function ApiDocsPage() {
  return (
    <iframe
      srcDoc={html}
      style={{ width: "100%", height: "100vh", border: "none" }}
      title="TravelGo API Docs"
    />
  );
}
