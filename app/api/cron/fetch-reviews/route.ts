import { NextRequest, NextResponse } from 'next/server';
import { runFetchReviews } from '@/lib/fetch-reviews';

/**
 * Vercel Cron 用エンドポイント。1日1回 GET で呼ばれ、口コミを自動取得する。
 * Authorization: Bearer <CRON_SECRET> で保護（Vercel が自動付与）。
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 店舗数が多い場合のため 5 分

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await runFetchReviews();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Cron fetch-reviews error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
