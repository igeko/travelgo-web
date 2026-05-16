/**
 * Singleton image search service — client-side usage.
 * Import this wherever you need a lazy image fetch.
 */

import { ImageSearchService } from "./ImageSearchService";
import { GooglePlacesImageProvider } from "./providers/GooglePlacesImageProvider";

export const imageSearch = new ImageSearchService(new GooglePlacesImageProvider());
