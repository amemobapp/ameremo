# アメモバ Google口コミモニター

アメモバ各店舗のGoogle口コミを定常的にモニターし、店舗ごとの評判推移（件数・平均評価）と投稿内容を確認できるシステムです。

## 機能

### ダッシュボード
- 口コミ投稿件数と平均評価の集計表示
- 時系列グラフ（日別/週別/月別切り替え）
- 店舗別比較表示
- フィルター機能（店舗、期間、集計粒度）

### 口コミ一覧
- 口コミ詳細の閲覧
- フィルター機能（店舗、期間）
- ソート機能（新しい順、古い順、評価高い順、評価低い順）
- ページング機能（50件/ページ）
- Googleマップへのリンク

### データ取得
- Google Places APIによる口コミ取得
- 手動再取得機能
- 取得ログの記録

## 技術スタック

- **フロントエンド**: Next.js 14, React, TypeScript, Tailwind CSS
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

4. **初回デプロイ後**  
   デプロイが完了したら、Vercel の **Settings → Environment Variables** で本番の `DATABASE_URL` をコピーし、ローカルの `.env.local` にも同じ値を入れてから、以下でマイグレーションを実行（本番 DB にテーブルを作成）：
   ```bash
   npm run db:push
   ```
   または Vercel の **Storage → Postgres → Query** で SQL を実行しても構いません。Prisma の場合は `db push` が手軽です。

ローカル開発で Postgres を使わない場合は、[Neon](https://neon.tech) の無料枠などで Postgres を 1 つ作成し、その接続 URL をローカルと Vercel の両方の `DATABASE_URL` に設定してもかまいません。

## 使い方

### 1. 口コミデータの取得

1. ダッシュボードの「口コミデータを再取得」ボタンをクリック
2. または、以下のコマンドを実行：

```bash
npm run fetch-reviews
```

### 2. ダッシュボードの確認

- 口コミ投稿件数と平均評価を確認
- 時系列グラフで推移を確認
- 店舗別比較で各店舗の評価を比較

### 3. 口コミ一覧の確認

1. ダッシュボードから「口コミ一覧を見る」をクリック
2. フィルターとソート機能を使用して目的の口コミを検索
3. 口コミをクリックしてGoogleマップで元のレビューを確認

## プロジェクト構成

```
├── app/                    # Next.js App Router
│   ├── api/               # APIエンドポイント
│   │   ├── dashboard/     # ダッシュボード用API
│   │   ├── reviews/       # 口コミ一覧用API
│   │   └── fetch-reviews/ # データ取得用API
│   ├── page.tsx           # ダッシュボードページ
│   ├── reviews/           # 口コミ一覧ページ
│   ├── layout.tsx         # レイアウト
│   └── globals.css        # グローバルスタイル
├── components/            # Reactコンポーネント
│   └── ui/               # UIコンポーネント
├── lib/                  # ユーティリティライブラリ
│   ├── prisma.ts        # Prismaクライアント
│   ├── google-places.ts # Google Places API
│   └── utils.ts         # 汎用ユーティリティ
├── prisma/              # Prisma設定
│   └── schema.prisma    # データベーススキーマ
├── scripts/             # スクリプト
│   └── fetch-reviews.ts # データ取得スクリプト
└── public/              # 静的ファイル
```

## データベーススキーマ

### stores（店舗マスタ）
- id: UUID
- name: 店舗名
- type: 店舗種別（DIRECT/FRANCHISE/UNKNOWN）
- googleMapsUrl: GoogleマップURL
- placeId: Google Place ID
- createdAt/updatedAt: タイムスタンプ

### reviews（口コミ）
- id: UUID
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
- id: UUID
- storeId: 店舗ID（外部キー）
- granularity: 集計粒度（DAY/WEEK/MONTH）
- bucketStartDate: 集計期間開始日
- reviewCount: 口コミ件数
- ratingAvg: 平均評価
- updatedAt: 更新日時

### fetch_logs（取得ログ）
- id: UUID
- storeId: 店舗ID
- status: ステータス（SUCCESS/ERROR/RUNNING）
- message: メッセージ
- reviewCount: 取得件数
- startedAt: 開始日時
- completedAt: 完了日時

## APIエンドポイント

### GET /api/dashboard
ダッシュボード用データを取得

クエリパラメータ:
- `storeIds`: 店舗ID（カンマ区切り、allで全店舗）
- `startDate`: 開始日（YYYY-MM-DD）
- `endDate`: 終了日（YYYY-MM-DD）
- `granularity`: 集計粒度（DAY/WEEK/MONTH）

### GET /api/reviews
口コミ一覧を取得

クエリパラメータ:
- `storeIds`: 店舗ID（カンマ区切り、allで全店舗）
- `startDate`: 開始日（YYYY-MM-DD）
- `endDate`: 終了日（YYYY-MM-DD）
- `sortBy`: ソート順（newest/oldest/rating-high/rating-low）
- `page`: ページ番号
- `limit`: 1ページあたりの件数（デフォルト50）

### POST /api/fetch-reviews
口コミデータを再取得

すべての店舗の口コミデータをGoogle Places APIから取得し、データベースに保存します。

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

# 口コミデータ取得
npm run fetch-reviews
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
