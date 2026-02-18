import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { prisma } from '../lib/prisma';

// shoplist.md から店舗データ（アメモバ + サクモバ）
const stores: Array<{ name: string; placeId: string; googleMapsUrl: string; type: string; brand: string }> = [
  // アメモバ
  { name: 'アメモバ 上野本店', placeId: 'ChIJG_0V74WNGGARNcOjkwixJuQ', googleMapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJG_0V74WNGGARNcOjkwixJuQ', type: 'DIRECT', brand: 'AMEMOBA' },
  { name: 'アメモバ 秋葉原店', placeId: 'ChIJFQAwsZ-OGGARfGHc4VvmyLA', googleMapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJFQAwsZ-OGGARfGHc4VvmyLA', type: 'DIRECT', brand: 'AMEMOBA' },
  { name: 'アメモバ 柏店', placeId: 'ChIJhyb1RRmdGGARKhISBfOIFhI', googleMapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJhyb1RRmdGGARKhISBfOIFhI', type: 'DIRECT', brand: 'AMEMOBA' },
  { name: 'アメモバ 名古屋大須店', placeId: 'ChIJHYp3Shd3A2ARONqCexsG5ew', googleMapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJHYp3Shd3A2ARONqCexsG5ew', type: 'DIRECT', brand: 'AMEMOBA' },
  { name: 'アメモバ 新宿東南口店', placeId: 'ChIJM_kPEBiNGGAR1jbcaf_pwpo', googleMapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJM_kPEBiNGGAR1jbcaf_pwpo', type: 'DIRECT', brand: 'AMEMOBA' },
  { name: 'アメモバ 大宮マルイ店', placeId: 'ChIJn-qyhX6dGGARAFfE-Mv4UOU', googleMapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJn-qyhX6dGGARAFfE-Mv4UOU', type: 'DIRECT', brand: 'AMEMOBA' },
  // サクモバ
  { name: 'サクモバ 秋葉原店', placeId: 'ChIJiS1phZ6PGGARWW9Q51UQcRk', googleMapsUrl: 'https://maps.app.goo.gl/5syqmR83eYHR1Sy77', type: 'DIRECT', brand: 'SAKUMOBA' },
  { name: 'サクモバ 新宿西口店', placeId: 'ChIJy97SMKGNGGARHCW4cTVFLtw', googleMapsUrl: 'https://maps.app.goo.gl/T3ua72862GeWfFdJ6', type: 'DIRECT', brand: 'SAKUMOBA' },
  { name: 'サクモバ 名古屋大須店', placeId: 'ChIJdfabEGd3A2ARPStzxMd5OJE', googleMapsUrl: 'https://maps.app.goo.gl/CgynoAtxgwVYP3UR9', type: 'DIRECT', brand: 'SAKUMOBA' },
];

async function main() {
  console.log('Starting store seed...');
  
  let created = 0;
  let skipped = 0;

  for (const storeData of stores) {
    const existing = await prisma.store.findFirst({
      where: { name: storeData.name }
    });

    if (existing) {
      console.log(`⏭  ${storeData.name} - already exists`);
      skipped++;
    } else {
      await prisma.store.create({
        data: {
          name: storeData.name,
          type: storeData.type,
          brand: storeData.brand,
          googleMapsUrl: storeData.googleMapsUrl,
          placeId: storeData.placeId,
        },
      });
      console.log(`✓  ${storeData.name} - created`);
      created++;
    }
  }

  console.log(`\nCompleted: ${created} created, ${skipped} skipped`);
  console.log(`Total stores: ${stores.length}`);
}

main()
  .catch((e) => {
    console.error('Error seeding stores:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
