/**
 * 店名変更をDBに反映するワンショットスクリプト。
 * アメモバ: 東京上野本店→上野本店 (現: 上野店→上野本店)
 * サクモバ: 東京秋葉原店→秋葉原店
 *
 * 実行: npx tsx scripts/update-store-names.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { prisma } from '../lib/prisma';

const RENAMES: Array<{ from: string; to: string }> = [
  { from: 'アメモバ買取 上野店', to: 'アメモバ 上野本店' },
  { from: 'アメモバ買取 東京上野本店', to: 'アメモバ 上野本店' },
  { from: 'アメモバ買取 上野本店', to: 'アメモバ 上野本店' },
  { from: 'アメモバ買取 秋葉原店', to: 'アメモバ 秋葉原店' },
  { from: 'アメモバ買取 柏店', to: 'アメモバ 柏店' },
  { from: 'アメモバ買取 名古屋大須店', to: 'アメモバ 名古屋大須店' },
  { from: 'アメモバ買取 新宿東南口店', to: 'アメモバ 新宿東南口店' },
  { from: 'アメモバ買取 大宮マルイ店', to: 'アメモバ 大宮マルイ店' },
  { from: 'サクモバ 東京秋葉原店', to: 'サクモバ 秋葉原店' },
];

async function main() {
  console.log('Updating store names...');
  for (const { from, to } of RENAMES) {
    const result = await prisma.store.updateMany({
      where: { name: from },
      data: { name: to },
    });
    if (result.count > 0) {
      console.log(`  ${from} → ${to} (${result.count}件)`);
    }
  }
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
