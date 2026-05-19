/**
 * lib/data-quality.ts
 *
 * Utilities per validare la qualità dei dati importati.
 * Controlla: copertura geographic, completezza enrichment, duplicati, ecc.
 */

export interface DataQualityReport {
  totalPlaces:     number;
  withDescription: number;
  withImages:      number;
  withEmbedding:   number;
  withWikipedia:   number;
  geoSpread: {
    minLat:  number;
    maxLat:  number;
    minLng:  number;
    maxLng:  number;
    centerLat: number;
    centerLng: number;
  };
  categories: Record<string, number>;
  scores: {
    enrichment:  number; // % di posti con descrizione
    completeness: number; // % di posti con immagine + descrizione + embedding
    geographic:  number;  // Copertura geografica spread (0-100)  }
  metrics: {
    avgDescriptionLength: number;
    avgDescriptionWords: number;
    duplicates: number;
    missingCoords: number;
  };
}

/**
 * Calcola report di qualità da un set di posti.
 */
export function analyzeDataQuality(places: Array<{
  name: string;
  lat?: number;
  lng?: number;
  description?: string | null;
  cover_image?: string | null;
  embedding?: unknown;
  wikipedia?: string | null;
  category?: string;
}>): DataQualityReport {
  const report: DataQualityReport = {
    totalPlaces: places.length,
    withDescription: 0,
    withImages: 0,
    withEmbedding: 0,
    withWikipedia: 0,
    geoSpread: {
      minLat: Infinity,
      maxLat: -Infinity,
      minLng: Infinity,
      maxLng: -Infinity,
      centerLat: 0,
      centerLng: 0,
    },
    categories: {},
    scores: {
      enrichment: 0,
      completeness: 0,
      geographic: 0,
    },
    metrics: {
      avgDescriptionLength: 0,
      avgDescriptionWords: 0,
      duplicates: 0,
      missingCoords: 0,
    },
  };

  let totalDescLength = 0;
  let totalDescWords = 0;
  const seenNames = new Set<string>();

  // Analizza ogni posto
  for (const place of places) {
    // Description
    if (place.description) {
      report.withDescription++;
      totalDescLength += place.description.length;
      totalDescWords += place.description.split(/\s+/).length;
    }

    // Images
    if (place.cover_image) report.withImages++;

    // Embedding
    if (place.embedding) report.withEmbedding++;

    // Wikipedia
    if (place.wikipedia) report.withWikipedia++;

    // Geography
    if (typeof place.lat === 'number' && typeof place.lng === 'number') {
      report.geoSpread.minLat = Math.min(report.geoSpread.minLat, place.lat);
      report.geoSpread.maxLat = Math.max(report.geoSpread.maxLat, place.lat);
      report.geoSpread.minLng = Math.min(report.geoSpread.minLng, place.lng);
      report.geoSpread.maxLng = Math.max(report.geoSpread.maxLng, place.lng);
    } else {
      report.metrics.missingCoords++;
    }

    // Categories
    if (place.category) {
      report.categories[place.category] = (report.categories[place.category] ?? 0) + 1;
    }

    // Duplicates
    if (seenNames.has(place.name)) {
      report.metrics.duplicates++;
    } else {
      seenNames.add(place.name);
    }
  }

  // Calcoli finali
  if (places.length > 0) {
    report.metrics.avgDescriptionLength = Math.round(totalDescLength / places.length);
    report.metrics.avgDescriptionWords = Math.round(totalDescWords / report.withDescription);

    // Enrichment score: % con descrizione
    report.scores.enrichment = Math.round((report.withDescription / places.length) * 100);

    // Completeness score: % con almeno descrizione + immagine + embedding
    const complete = places.filter(
      (p) => p.description && p.cover_image && p.embedding
    ).length;
    report.scores.completeness = Math.round((complete / places.length) * 100);

    // Geographic spread (0-100): normalizziamo la latitudine
    // Assumiamo il mondo: -90 a 90 di latitudine
    if (isFinite(report.geoSpread.minLat) && isFinite(report.geoSpread.maxLat)) {
      const latSpread = report.geoSpread.maxLat - report.geoSpread.minLat;
      report.geoSpread.centerLat = (report.geoSpread.minLat + report.geoSpread.maxLat) / 2;
      report.scores.geographic = Math.min(100, Math.round((latSpread / 180) * 100));
    }

    if (isFinite(report.geoSpread.minLng) && isFinite(report.geoSpread.maxLng)) {
      report.geoSpread.centerLng = (report.geoSpread.minLng + report.geoSpread.maxLng) / 2;
    }
  }

  return report;
}

/**
 * Crea un report leggibile come testo.
 */
export function formatQualityReport(report: DataQualityReport): string {
  const lines = [
    `📊 Data Quality Report`,
    ``,
    `Total Places: ${report.totalPlaces}`,
    `  • With Description: ${report.withDescription} (${report.scores.enrichment}%)`,
    `  • With Images: ${report.withImages}`,
    `  • With Embeddings: ${report.withEmbedding}`,
    `  • With Wikipedia: ${report.withWikipedia}`,
    ``,
    `Geographic Spread:`,
    `  • Latitude: ${report.geoSpread.minLat.toFixed(2)}° to ${report.geoSpread.maxLat.toFixed(2)}°`,
    `  • Longitude: ${report.geoSpread.minLng.toFixed(2)}° to ${report.geoSpread.maxLng.toFixed(2)}°`,
    `  • Center: (${report.geoSpread.centerLat.toFixed(2)}, ${report.geoSpread.centerLng.toFixed(2)})`,
    ``,
    `Categories: ${Object.keys(report.categories).length}`,
    ...Object.entries(report.categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, count]) => `  • ${cat}: ${count}`),
    ``,
    `Quality Scores:`,
    `  • Enrichment: ${report.scores.enrichment}%`,
    `  • Completeness: ${report.scores.completeness}%`,
    `  • Geographic Spread: ${report.scores.geographic}%`,
    ``,
    `Metrics:`,
    `  • Avg Description Length: ${report.metrics.avgDescriptionLength} chars`,
    `  • Avg Description Words: ${report.metrics.avgDescriptionWords} words`,
    `  • Duplicates: ${report.metrics.duplicates}`,
    `  • Missing Coordinates: ${report.metrics.missingCoords}`,
  ];

  return lines.join('\n');
}
