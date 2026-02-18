interface GooglePlace {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  reviews?: GoogleReview[];
}

interface GoogleReview {
  author_name: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number; // Unix timestamp
  googleMapsUri?: string; // 口コミ単体のGoogle Maps URL（Places API New で取得）
}

interface PlaceDetailsResponse {
  result: GooglePlace;
  status: string;
}

interface PlaceSearchResponse {
  candidates: GooglePlace[];
  status: string;
}

// Places API (New) v1 の口コミレスポンス形式（text はオブジェクトで返る場合あり）
interface PlaceV1Review {
  name?: string;
  relativePublishTimeDescription?: string;
  text?: string | { text?: string; languageCode?: string };
  rating?: number;
  authorAttribution?: { displayName?: string; uri?: string };
  publishTime?: string; // RFC3339
  googleMapsUri?: string;
}

export class GooglePlacesService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async findPlace(searchQuery: string): Promise<GooglePlace | null> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${this.apiKey}&language=ja`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        return data.results[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error finding place:', error);
      return null;
    }
  }

  async getPlaceDetails(placeId: string): Promise<GooglePlace | null> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,reviews,user_ratings_total&key=${this.apiKey}&language=ja&reviews_sort=newest`
      );
      
      const data: PlaceDetailsResponse & { status: string; error_message?: string } = await response.json();
      
      if (data.status === 'OK') {
        console.log(`[Places API legacy] placeId=${placeId}: ${data.result.reviews?.length ?? 0} reviews`);
        return data.result;
      }
      console.warn(`[Places API legacy] placeId=${placeId} status=${data.status}`, data.error_message ?? '');
      return null;
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  /**
   * Places API (New) v1 で口コミを取得。各口コミに googleMapsUri（その口コミを開くリンク）が含まれる。
   */
  async getPlaceDetailsV1(placeId: string): Promise<GooglePlace | null> {
    try {
      const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=ja`;
      const response = await fetch(url, {
        headers: {
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'id,reviews'
        }
      });
      const data: { id?: string; reviews?: PlaceV1Review[]; error?: { message?: string } } = await response.json();
      if (!response.ok) {
        console.warn(`[Places API v1] placeId=${placeId} status=${response.status}`, data.error?.message ?? JSON.stringify(data));
        return null;
      }
      if (!data.reviews?.length) {
        console.warn(`[Places API v1] placeId=${placeId} returned 0 reviews (reviews key present: ${!!data.reviews})`);
        return null;
      }
      const reviews: GoogleReview[] = data.reviews.map((r) => {
        const publishTime = r.publishTime ? new Date(r.publishTime).getTime() / 1000 : 0;
        const textStr = typeof r.text === 'object' && r.text !== null && 'text' in r.text
          ? (r.text as { text?: string }).text ?? ''
          : (typeof r.text === 'string' ? r.text : '');
        return {
          author_name: r.authorAttribution?.displayName ?? '',
          rating: r.rating ?? 0,
          relative_time_description: r.relativePublishTimeDescription ?? '',
          text: textStr,
          time: publishTime,
          googleMapsUri: r.googleMapsUri
        };
      });
      return {
        place_id: placeId,
        name: '',
        reviews
      };
    } catch (error) {
      console.error('Error getting place details (v1):', error);
      return null;
    }
  }

  async getReviewsForStore(storeName: string, placeId?: string, googleMapsUrl?: string): Promise<GoogleReview[]> {
    try {
      const resolvedPlaceId = placeId ?? (googleMapsUrl?.match(/place_id:([^&]+)/)?.[1]);
      const reviewsV1: GoogleReview[] = [];
      const reviewsLegacy: GoogleReview[] = [];

      // v1 と legacy の両方を呼び、マージして件数を最大化（各APIは最大5件）
      if (resolvedPlaceId) {
        const placeV1 = await this.getPlaceDetailsV1(resolvedPlaceId);
        if (placeV1?.reviews?.length) reviewsV1.push(...placeV1.reviews);
        const placeLegacy = await this.getPlaceDetails(resolvedPlaceId);
        if (placeLegacy?.reviews?.length) reviewsLegacy.push(...placeLegacy.reviews);
      }
      if (!reviewsV1.length && !reviewsLegacy.length && googleMapsUrl) {
        const placeIdMatch = googleMapsUrl.match(/place_id:([^&]+)/);
        if (placeIdMatch) {
          const placeLegacy = await this.getPlaceDetails(placeIdMatch[1]);
          if (placeLegacy?.reviews?.length) reviewsLegacy.push(...placeLegacy.reviews);
        }
      }
      if (!reviewsV1.length && !reviewsLegacy.length) {
        const place = await this.findPlace(storeName) ?? await this.findPlace(`アメモバ ${storeName}`);
        if (place?.reviews?.length) return place.reviews;
        return [];
      }

      // 同一口コミを author_name + time で重複排除（v1 を優先＝googleMapsUri あり）
      const seen = new Set<string>();
      const merged: GoogleReview[] = [];
      for (const r of [...reviewsV1, ...reviewsLegacy]) {
        const key = `${r.author_name}|${r.time}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(r);
      }
      merged.sort((a, b) => b.time - a.time);
      return merged;
    } catch (error) {
      console.error('Error getting reviews:', error);
      return [];
    }
  }
}
