/**
 * app/api/overpass/status/route.ts
 *
 * GET /api/overpass/status
 * Restituisce lo stato in tempo reale di Overpass API
 * (quanti slot disponibili, endpoint, ultimo aggiornamento)
 */

import { NextResponse } from 'next/server';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
];

async function checkStatus(endpoint: string): Promise<{ slots: number; statusUrl: string }> {
  try {
    const res = await fetch(endpoint.replace('/interpreter', '/status'), {
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();
    const match = text.match(/(\d+)\s+slots? available/);
    const slots = match ? parseInt(match[1]) : 0;

    return { slots, statusUrl: endpoint.replace('/interpreter', '/status') };
  } catch (e) {
    return { slots: -1, statusUrl: endpoint.replace('/interpreter', '/status') }; // -1 = errore
  }
}

export async function GET() {
  try {
    // Controlla tutti gli endpoint in parallelo
    const results = await Promise.all(
      ENDPOINTS.map(async (endpoint) => ({
        endpoint,
        ...await checkStatus(endpoint),
      }))
    );

    // Trova il migliore (più slot disponibili)
    const bestEndpoint = results.reduce((best, current) =>
      current.slots > best.slots ? current : best
    );

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      best: {
        endpoint: bestEndpoint.endpoint,
        slots: bestEndpoint.slots,
        available: bestEndpoint.slots > 0,
        status: bestEndpoint.slots === -1 ? 'error' : bestEndpoint.slots === 0 ? 'busy' : 'ready',
      },
      all: results,
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'Errore controllo status Overpass', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
