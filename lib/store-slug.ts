/**
 * URL用店舗・ブランドスラッグと表示名の対応（shoplist.md と同期）
 */

export const STORE_SLUG_TO_NAME: Record<string, string> = {
  'ame-ueno': 'アメモバ買取 東京上野本店',
  'ame-akiba': 'アメモバ買取 秋葉原店',
  'ame-kashiwa': 'アメモバ買取 柏店',
  'ame-nagoya': 'アメモバ買取 名古屋大須店',
  'ame-shinjuku': 'アメモバ買取 新宿東南口店',
  'ame-omiya': 'アメモバ買取 大宮マルイ店',
  'saku-akiba': 'サクモバ 東京秋葉原店',
  'saku-shinjuku': 'サクモバ 新宿西口店',
  'saku-nagoya': 'サクモバ 名古屋大須店',
};

export const STORE_NAME_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(STORE_SLUG_TO_NAME).map(([slug, name]) => [name, slug])
);

export type BrandFilter = 'all' | 'AMEMOBA' | 'SAKUMOBA';

export const BRAND_SLUG_TO_BRAND: Record<string, BrandFilter> = {
  amemoba: 'AMEMOBA',
  sakumoba: 'SAKUMOBA',
};

export const BRAND_TO_SLUG: Record<BrandFilter, string> = {
  all: '',
  AMEMOBA: 'amemoba',
  SAKUMOBA: 'sakumoba',
};

export const VALID_STORE_SLUGS = Object.keys(STORE_SLUG_TO_NAME);
export const VALID_BRAND_SLUGS = Object.keys(BRAND_SLUG_TO_BRAND);
