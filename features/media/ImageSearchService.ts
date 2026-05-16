/**
 * ImageSearchService — provider-agnostic place enrichment + images.
 */

export type PlaceDetails = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;       // 0–4
  openNow?: boolean;
  weekdayText?: string[];
  website?: string;
  types?: string[];
  editorialSummary?: string;
  /** Proxy URLs pronti all'uso — /api/places/photo?ref=... */
  photoUrls: string[];
  thumbUrls: string[];
};

export interface ImageSearchProvider {
  search(query: string): Promise<PlaceDetails | null>;
}

export class ImageSearchService {
  constructor(private readonly provider: ImageSearchProvider) {}

  search(query: string): Promise<PlaceDetails | null> {
    return this.provider.search(query);
  }
}
