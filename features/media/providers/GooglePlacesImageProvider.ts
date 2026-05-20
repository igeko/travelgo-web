import type { ImageSearchProvider, PlaceDetails } from "../ImageSearchService";
import type { PlaceEnriched } from "@/app/api/places/photo-search/route";
import { api } from "@/lib/client";

export class GooglePlacesImageProvider implements ImageSearchProvider {
  async search(query: string): Promise<PlaceDetails | null> {
    try {
      const place = await api.places.photoSearch<PlaceEnriched>(query);
      if (!place) return null;

      const photoUrls = place.photoRefs.map((ref) => api.places.photoUrl(ref, 800));
      const thumbUrls = place.photoRefs.map((ref) => api.places.photoUrl(ref, 400));

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
