import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const AUTH_COOKIE = 'ameyoko-auth';

// 環境変数からパスワードを取得（デフォルトは開発用）
const PASSWORD = process.env.SITE_PASSWORD || 'ameyoko';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = typeof body?.password === 'string' ? body.password.trim() : '';

    if (password !== PASSWORD) {
      return NextResponse.json(
        { error: 'パスワードが正しくありません' },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE, '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
