import type { ImageSearchProvider, PlaceDetails } from "../ImageSearchService";
import type { PlaceEnriched } from "@/app/api/places/photo-search/route";

export class GooglePlacesImageProvider implements ImageSearchProvider {
  async search(query: string): Promise<PlaceDetails | null> {
    try {
      const res = await fetch(`/api/places/photo-search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return null;

      const data = await res.json() as { place?: PlaceEnriched };
      const place = data.place;
      if (!place) return null;

      const photoUrls = place.photoRefs.map(
        (ref) => `/api/places/photo?ref=${encodeURIComponent(ref)}&maxwidth=800`,
      );
      const thumbUrls = place.photoRefs.map(
        (ref) => `/api/places/photo?ref=${encodeURIComponent(ref)}&maxwidth=400`,
      );

      return {
        placeId: place.placeId,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        rating: place.rating,
        userRatingsTotal: place.userRatingsTotal,
        priceLevel: place.priceLevel,
        openNow: place.openNow,
        weekdayText: place.weekdayText,
        website: place.website,
        types: place.types,
        editorialSummary: place.editorialSummary,
        photoUrls,
        thumbUrls,
      };
    } catch {
      return null;
    }
  }
}
