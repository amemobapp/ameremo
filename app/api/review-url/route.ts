import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GooglePlacesService } from '@/lib/google-places';

export const dynamic = 'force-dynamic';

/**
 * 個別口コミをGoogleで開くURLを返す。
 * storeId + authorName + createdAt で Places API (New) v1 の口コミ一覧から該当を検索し、
 * その口コミの googleMapsUri を返す。見つからなければ店舗の口コミタブURLを返す。
 */
export async function GET(request: NextRequest) {
  try {
    const storeId = request.nextUrl.searchParams.get('storeId');
    const authorName = request.nextUrl.searchParams.get('authorName');
    const createdAt = request.nextUrl.searchParams.get('createdAt');

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

    const service = new GooglePlacesService(apiKey);
    const place = await service.getPlaceDetailsV1(placeId);
    if (!place?.reviews?.length) {
      return NextResponse.json({ url: fallbackUrl });
    }

    const targetTime = createdAt ? new Date(createdAt).getTime() : 0;

    // 著者名と日時で最も近い口コミを選ぶ（googleMapsUri があるもののみ。該当が複数なら時間が最も近いもの）
    let best: { googleMapsUri: string; time: number; diff: number } | null = null;
    for (const r of place.reviews) {
      if (!r.googleMapsUri) continue;
      const time = (r.time || 0) * 1000;
      const authorMatch = !authorName || !r.author_name || r.author_name === authorName || r.author_name.includes(authorName) || authorName.includes(r.author_name);
      if (!authorMatch) continue;
      const diff = targetTime ? Math.abs(time - targetTime) : 0;
      if (targetTime && diff > 30 * 24 * 60 * 60 * 1000) continue; // 30日以上ずれは無視
      if (!best || diff < best.diff) {
        best = { googleMapsUri: r.googleMapsUri, time, diff };
      }
    }
    if (best?.googleMapsUri) {
      return NextResponse.json({ url: best.googleMapsUri });
    }

    // 該当する口コミの直接URLが取れない場合は店舗口コミタブへ
    return NextResponse.json({ url: fallbackUrl });
  } catch (error) {
    console.error('review-url error:', error);
    return NextResponse.json({ url: null }, { status: 500 });
  }
}
