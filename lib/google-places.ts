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

// Places API (New) v1 の口コミレスポンス形式
interface PlaceV1Review {
  name?: string;
  relativePublishTimeDescription?: string;
  text?: string;
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
      
      const data: PlaceSearchResponse = await response.json();
      
      if (data.status === 'OK' && data.candidates.length > 0) {
        return data.candidates[0];
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
      
      const data: PlaceDetailsResponse = await response.json();
      
      if (data.status === 'OK') {
        console.log(`Place ${placeId}: Found ${data.result.reviews?.length || 0} reviews`);
        if (data.result.reviews) {
          data.result.reviews.forEach((review, index) => {
            console.log(`Review ${index + 1}: ${new Date(review.time * 1000).toISOString()} by ${review.author_name}`);
          });
        }
        return data.result;
      }
      
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
      if (!response.ok) {
        console.warn(`Places API v1 failed for ${placeId}: ${response.status}`);
        return null;
      }
      const data: { id?: string; reviews?: PlaceV1Review[] } = await response.json();
      if (!data.reviews?.length) {
        return null;
      }
      const reviews: GoogleReview[] = data.reviews.map((r) => {
        const publishTime = r.publishTime ? new Date(r.publishTime).getTime() / 1000 : 0;
        return {
          author_name: r.authorAttribution?.displayName ?? '',
          rating: r.rating ?? 0,
          relative_time_description: r.relativePublishTimeDescription ?? '',
          text: r.text ?? '',
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
      let place: GooglePlace | null = null;
      const resolvedPlaceId = placeId ?? (googleMapsUrl?.match(/place_id:([^&]+)/)?.[1]);

      // まず Places API (New) v1 で口コミ＋googleMapsUri を取得
      if (resolvedPlaceId) {
        place = await this.getPlaceDetailsV1(resolvedPlaceId);
      }
      // v1 で取れなければ従来APIを使用
      if (!place?.reviews?.length && resolvedPlaceId) {
        place = await this.getPlaceDetails(resolvedPlaceId);
      }
      if (!place?.reviews?.length && googleMapsUrl) {
        const placeIdMatch = googleMapsUrl.match(/place_id:([^&]+)/);
        if (placeIdMatch) {
          place = await this.getPlaceDetails(placeIdMatch[1]);
        }
      }

      if (!place?.reviews?.length) {
        place = await this.findPlace(storeName);
      }
      if (!place?.reviews?.length) {
        place = await this.findPlace(`アメモバ買取 ${storeName}`);
      }

      if (place?.reviews) {
        return place.reviews;
      }

      return [];
    } catch (error) {
      console.error('Error getting reviews:', error);
      return [];
    }
  }
}
