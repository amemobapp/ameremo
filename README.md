# アメモバ Google口コミモニター（AmeReMo）

**アメモバ**（アメモバ買取）と**サクモバ**の各店舗のGoogle口コミを定常的にモニターし、評判推移（件数・平均評価）と投稿内容を一括で確認できる社内向けWebアプリです。

---

## コンセプト

- **対象ブランド**: アメモバ買取（AMEMOBA）・サクモバ（SAKUMOBA）の全店舗
- **目的**: 店舗ごとのGoogle口コミ件数・平均評価の推移把握と、個別口コミの内容確認
- **利用想定**: 社内での定期確認・共有。URLのクエリで店舗・ブランド・期間を指定したリンクを共有可能（スラッグ対応）
- **アクセス制御**: 簡易パスワード認証（Cookie）で未登録ユーザーをブロック

---

## サイト構造

- **メインページ（`/`）**: 1ページで「ダッシュボード」と「口コミ一覧」の2タブを切り替え
- **ログイン（`/login`）**: パスワード入力で認証後、メインへリダイレクト
- **API**: ダッシュボード用・口コミ一覧用・口コミ再取得・認証・Google口コミURL取得など（後述）

---

## 機能

### 認証
- パスワードによるログイン（`SITE_PASSWORD`）
- ログイン状態はCookieで保持。未ログイン時は `/login` へリダイレクト

### ダッシュボード（タブ）
- **サマリ**: 選択条件での口コミ総数・平均評価
- **時系列グラフ**: 日別/週別/月別の切り替え（集計粒度）
- **店舗別比較**: 店舗ごとの評価分布（1〜5の件数）と棒グラフ
- **期間別集計表**: 店舗×期間の件数マトリクス
- **フィルター**: ブランド（全店舗 / アメモバのみ / サクモバのみ）、店舗（複数選択可）、期間（開始日・終了日）

### 口コミ一覧（タブ）
- **一覧表示**: 店舗名・評価・本文・投稿者・投稿日。50件/ページでページング
- **ソート**: 新しい順 / 古い順 / 評価高い順 / 評価低い順
- **フィルター**: ブランド・店舗・期間（ダッシュボードと共通）
- **店舗×評価セルクリック**: その店舗・その評価の口コミだけをポップアップで表示
- **Googleマップ**: 各口コミや店舗から、Googleマップの口コミタブを開くリンク（Places API の `reviewsUri` を利用）

### データ取得
- **手動再取得**: UIの「口コミデータを再取得」から `POST /api/fetch-reviews` を実行
- **取得元**: Google Places API（Places API (New)）。店舗が0件の場合は初期店舗を自動作成してから取得
- **取得ログ**: `FetchLog` で店舗ごとの実行結果を記録

## 技術スタック

- **フロントエンド**: Next.js 16, React, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: PostgreSQL + Prisma ORM（本番は Vercel Postgres 推奨）
- **外部API**: Google Places API

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定：

```env
# Google Places API Key
GOOGLE_PLACES_API_KEY=your_google_places_api_key

# Database URL（本番は Vercel Postgres の接続文字列を設定）
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# Site Password (for login protection)
SITE_PASSWORD=your_password_here
```

### 3. データベースのセットアップ

```bash
# Prismaクライアントの生成
npm run db:generate

# データベースのマイグレーション
npm run db:push
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスしてください。

## Vercel へのデプロイ（簡単・高速）

1. **Vercel Postgres を追加**  
   Vercel ダッシュボード → プロジェクト → **Storage** → **Create Database** → **Postgres** を選択して作成。接続情報（`POSTGRES_URL` など）が自動で Environment Variables に追加されます。

2. **DATABASE_URL の設定**  
   Storage で発行された URL が `POSTGRES_URL` などの名前の場合は、**Settings → Environment Variables** で `DATABASE_URL` を追加し、同じ値（接続文字列）を設定してください。既に `DATABASE_URL` が設定されていればそのままで問題ありません。

3. **GOOGLE_PLACES_API_KEY**  
   **Settings → Environment Variables** で `GOOGLE_PLACES_API_KEY` を追加し、Google Cloud の API キーを設定。

4. **SITE_PASSWORD**  
   **Settings → Environment Variables** で `SITE_PASSWORD` を追加し、サイト保護用のパスワードを設定（例: `ameyoko`）。Production、Preview、Development すべての環境に設定してください。

5. **ビルドが進まない場合**  
   **Settings → Environment Variables** で `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` を `1` に設定してください（Production / Preview に適用）。Puppeteer はローカルスクリプト用のため Vercel では Chromium 不要で、設定するとインストールが短時間で完了します。

6. **初回デプロイ後**  
   デプロイが完了したら、Vercel の **Settings → Environment Variables** で本番の `DATABASE_URL` をコピーし、ローカルの `.env.local` にも同じ値を入れてから、以下でマイグレーションを実行（本番 DB にテーブルを作成）：
   ```bash
   npm run db:push
   ```
   または Vercel の **Storage → Postgres → Query** で SQL を実行しても構いません。Prisma の場合は `db push` が手軽です。

ローカル開発で Postgres を使わない場合は、[Neon](https://neon.tech) の無料枠などで Postgres を 1 つ作成し、その接続 URL をローカルと Vercel の両方の `DATABASE_URL` に設定してもかまいません。

## 使い方

### 1. ログイン

- 未ログインで `/` にアクセスすると `/login` にリダイレクトされます
- `SITE_PASSWORD` で設定したパスワードを入力してログイン

### 2. 口コミデータの取得

- メインページのナビゲーション内「口コミデータを再取得」ボタンで取得（推奨）
- または CLI: `npm run fetch-reviews`

### 3. ダッシュボードの確認

- メインページの「ダッシュボード」タブで、サマリ・時系列グラフ・店舗別比較・期間別集計表を確認
- ブランド・店舗・期間・集計粒度でフィルターを変更可能

### 4. 口コミ一覧の確認

- 「口コミ一覧」タブで一覧・ソート・ページング。店舗×評価のセルをクリックすると、その条件の口コミだけをポップアップ表示
- 各口コミや店舗からGoogleマップの口コミタブへリンクで遷移可能

## プロジェクト構成

```
├── app/                          # Next.js App Router
│   ├── api/                      # APIエンドポイント
│   │   ├── auth/login/          # ログイン認証（POST）
│   │   ├── dashboard/           # ダッシュボード用データ取得（GET）
│   │   ├── reviews/             # 口コミ一覧用データ取得（GET）
│   │   ├── fetch-reviews/       # 口コミ再取得（POST）
│   │   ├── place-reviews-url/   # 店舗のGoogle口コミタブURL取得（GET）
│   │   └── review-url/          # 口コミ単体URL用（GET）
│   ├── login/page.tsx           # ログインページ
│   ├── page.tsx                 # メインページ（ダッシュボード＋口コミ一覧タブ）
│   ├── layout.tsx               # ルートレイアウト
│   └── globals.css              # グローバルスタイル
├── components/
│   ├── common-navigation.tsx    # 共通フィルター・店舗選択・タブ・再取得ボタン
│   ├── header.tsx               # ヘッダー
│   └── ui/button.tsx            # ボタンUI
├── lib/
│   ├── prisma.ts                # Prismaクライアント
│   ├── google-places.ts         # Google Places API（口コミ取得）
│   ├── google-scraper.ts        # Puppeteerスクレイパー（ローカル/将来用）
│   ├── store-slug.ts            # 店舗・ブランドのスラッグ⇔表示名対応（URL共有用）
│   └── utils.ts                 # 汎用ユーティリティ
├── middleware.ts                # 認証チェック（Cookie）、/login リダイレクト
├── prisma/
│   └── schema.prisma            # データベーススキーマ
├── scripts/
│   ├── fetch-reviews.ts         # 口コミ一括取得（CLI）
│   ├── seed-stores.ts           # 店舗マスタ投入
│   └── test-gbp-api.ts          # API動作確認用
└── public/                      # 静的ファイル
```

## データベーススキーマ

### stores（店舗マスタ）
- id: CUID
- name: 店舗名
- brand: ブランド（AMEMOBA / SAKUMOBA）
- type: 店舗種別（DIRECT/FRANCHISE/UNKNOWN）
- googleMapsUrl: GoogleマップURL
- placeId: Google Place ID
- createdAt/updatedAt: タイムスタンプ

### reviews（口コミ）
- id: CUID
- storeId: 店舗ID（外部キー）
- source: データソース（GOOGLE）
- sourceReviewId: 元のレビューID（ユニーク）
- rating: 評価（1-5）
- text: 口コミテキスト
- authorName: 投稿者名
- createdAt: 投稿日時
- fetchedAt: 取得日時
- reviewUrl: レビューURL
- rawPayload: 生データ（JSON）

### review_aggregates（集計キャッシュ）
- id: CUID
- storeId: 店舗ID（外部キー）
- granularity: 集計粒度（DAY/WEEK/MONTH）
- bucketStartDate: 集計期間開始日
- reviewCount: 口コミ件数
- ratingAvg: 平均評価
- updatedAt: 更新日時

### fetch_logs（取得ログ）
- id: CUID
- storeId: 店舗ID
- status: ステータス（SUCCESS/ERROR/RUNNING）
- message: メッセージ
- reviewCount: 取得件数
- startedAt: 開始日時
- completedAt: 完了日時

## APIエンドポイント

### GET /api/dashboard
ダッシュボード用データ（サマリ・時系列・店舗比較・期間別集計表・店舗一覧）を取得。

クエリパラメータ:
- `storeIds`: 店舗ID（カンマ区切り、省略または `all` で全店舗）
- `brand`: ブランドで絞り込み（`all` / `AMEMOBA` / `SAKUMOBA`）
- `startDate`: 開始日（YYYY-MM-DD）
- `endDate`: 終了日（YYYY-MM-DD）
- `granularity`: 集計粒度（DAY/WEEK/MONTH）

### GET /api/reviews
口コミ一覧を取得。

クエリパラメータ:
- `storeIds`: 店舗ID（カンマ区切り、省略または `all` で全店舗）
- `brand`: ブランドで絞り込み（`all` / `AMEMOBA` / `SAKUMOBA`）
- `startDate` / `endDate`: 期間
- `rating`: 評価で絞り込み（1〜5、ポップアップ用）
- `sortBy`: ソート順（newest/oldest/rating-high/rating-low）
- `page`: ページ番号
- `limit`: 1ページあたりの件数（デフォルト50）

### POST /api/fetch-reviews
口コミデータを再取得。全店舗をGoogle Places APIで取得しDBに保存。店舗が0件の場合は初期店舗を自動作成してから取得。

### POST /api/auth/login
ログイン。Body: `{ "password": "..." }`。成功時はCookieをセットして `{ "ok": true }` を返す。

### GET /api/place-reviews-url
店舗のGoogleマップ「口コミ」タブURLを取得。クエリ: `storeId`。Places API の `googleMapsLinks.reviewsUri` を利用。

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm run start

# データベース関連
npm run db:generate  # Prismaクライアント生成
npm run db:push      # データベーススキーマ適用
npm run db:migrate   # マイグレーション実行
npm run db:studio    # Prisma Studio起動

# 店舗マスタ投入・口コミ取得
npm run seed-stores   # 店舗をDBに投入
npm run fetch-reviews # 口コミを一括取得（CLI）
```

## 注意事項

1. **Google Places API**: APIキーにはPlaces APIの有効化が必要です
2. **API制限**: Google Places APIには1日のリクエスト数制限があります
3. **データ取得**: 大量のデータ取得の場合はAPI制限に注意してください
4. **口コミデータ**: Google Places APIは各店舗から最大5件の最新口コミのみ返します。過去の長期的な履歴データは取得できません
5. **ブラウザ互換性**: モダンブラウザ（Chrome, Firefox, Safari, Edge）を推奨します

## 今後の拡張機能

- 低評価アラート（Slack/メール通知）
- ネガ/ポジ分類、頻出ワード抽出（LLM要約）
- 返信（オーナー返信）管理・テンプレート化
- 店舗管理ページ
- ユーザー認証（Googleログイン等）
- データ取得スケジューラー（cron）
- レポート出力機能（PDF/Excel）

## ライセンス

このプロジェクトは社内利用を目的としています。
