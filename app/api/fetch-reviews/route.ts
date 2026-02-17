import { NextRequest, NextResponse } from 'next/server';
import { runFetchReviews } from '@/lib/fetch-reviews';

export async function POST(request: NextRequest) {
  try {
    const data = await runFetchReviews();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Fetch reviews API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
