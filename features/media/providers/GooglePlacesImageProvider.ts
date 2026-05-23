import type { ImageSearchProvider, PlaceDetails } from "../ImageSearchService";
import type { PlaceEnriched } from "@/app/api/places/photo-search/route";
import { api } from "@/lib/client";

/** Map the API's enriched place onto the client `PlaceDetails` shape. */
function toPlaceDetails(place: PlaceEnriched): PlaceDetails {
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
    photoUrls: place.photoRefs.map((ref) => api.places.photoUrl(ref, 800)),
    thumbUrls: place.photoRefs.map((ref) => api.places.photoUrl(ref, 400)),
  };
}

export class GooglePlacesImageProvider implements ImageSearchProvider {
  /** Text search → place_id → details. Used when only a query string is known. */
  async search(query: string): Promise<PlaceDetails | null> {
    try {
      const place = await api.places.photoSearch<PlaceEnriched>(query);
      return place ? toPlaceDetails(place) : null;
    } catch {
      return null;
    }
  }

  /** Details by known place_id — skips the Places text search entirely. */
  async searchByPlaceId(placeId: string): Promise<PlaceDetails | null> {
    try {
      const place = await api.places.enriched<PlaceEnriched>(placeId);
      return place ? toPlaceDetails(place) : null;
    } catch {
      return null;
    }
  }
}
