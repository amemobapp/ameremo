import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * 店舗の「口コミタブ」を開くURLを返す。
 * Places API (New) の googleMapsLinks.reviewsUri を取得。失敗時は店舗の place URL を返す。
 */
export async function GET(request: NextRequest) {
  try {
    const storeId = request.nextUrl.searchParams.get('storeId');
    if (!storeId) {
      return NextResponse.json({ error: 'storeId required' }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { placeId: true, googleMapsUrl: true }
    });
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const placeId = store.placeId ?? (store.googleMapsUrl?.match(/place_id:([^&]+)/)?.[1]);
    const fallbackUrl = store.googleMapsUrl ?? null;

    if (!placeId) {
      return NextResponse.json({ url: fallbackUrl });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ url: fallbackUrl });
    }

    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
    const res = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'googleMapsLinks'
      }
    });

    if (!res.ok) {
      return NextResponse.json({ url: fallbackUrl });
    }

    const data = (await res.json()) as { googleMapsLinks?: { reviewsUri?: string } };
    const reviewsUri = data.googleMapsLinks?.reviewsUri;
    const urlToReturn = reviewsUri || fallbackUrl;

    return NextResponse.json({ url: urlToReturn });
  } catch (error) {
    console.error('place-reviews-url error:', error);
    return NextResponse.json({ url: null }, { status: 500 });
  }
}
