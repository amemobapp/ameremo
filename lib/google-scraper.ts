import puppeteer from 'puppeteer';

interface ScrapedReview {
  author_name: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number; // Unix timestamp
}

export class GoogleScraperService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async scrapeGoogleMapsReviews(searchQuery: string): Promise<ScrapedReview[]> {
    console.log(`🔍 Starting to scrape reviews for: ${searchQuery}`);
    
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Go to Google Maps search
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // Wait for results to load
      await page.waitForSelector('[data-value="Reviews"]', { timeout: 10000 });
      
      // Click on Reviews button if exists
      const reviewsButton = await page.$('[data-value="Reviews"]');
      if (reviewsButton) {
        await reviewsButton.click();
        await page.waitForTimeout(2000);
      }
      
      // Scroll to load more reviews
      console.log('📜 Loading reviews by scrolling...');
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(2000);
      }
      
      // Extract reviews
      const reviews = await page.evaluate(() => {
        const reviewElements = document.querySelectorAll('[data-review-id]');
        const extractedReviews: any[] = [];
        
        reviewElements.forEach((element, index) => {
          try {
            const reviewText = element.querySelector('.review-text')?.textContent?.trim() || '';
            const authorName = element.querySelector('.d4r55')?.textContent?.trim() || '';
            const ratingElement = element.querySelector('.kvMYJ');
            const rating = ratingElement ? ratingElement.getAttribute('aria-label')?.match(/(\d+)/)?.[1] : '0';
            const timeElement = element.querySelector('.rsqaWe')?.textContent?.trim() || '';
            
            if (reviewText && authorName && rating) {
              extractedReviews.push({
                author_name: authorName,
                rating: parseInt(rating),
                relative_time_description: timeElement,
                text: reviewText,
                time: Date.now() - (index * 86400000) // Estimate different dates
              });
            }
          } catch (error) {
            console.log(`Error extracting review ${index}:`, error);
          }
        });
        
        return extractedReviews;
      });
      
      console.log(`✅ Successfully scraped ${reviews.length} reviews for ${searchQuery}`);
      return reviews;
      
    } catch (error) {
      console.error(`❌ Error scraping reviews for ${searchQuery}:`, error);
      return [];
    } finally {
      await browser.close();
    }
  }

  async getAllReviewsForStore(storeName: string): Promise<ScrapedReview[]> {
    console.log(`🚀 Starting comprehensive review collection for: ${storeName}`);
    
    try {
      // Try multiple search queries to get more results
      const searchQueries = [
        storeName,
        `${storeName} 口コミ`,
        `${storeName} 評判`,
        `アメモバ買取 ${storeName.split(' ').pop()}`
      ];
      
      let allReviews: ScrapedReview[] = [];
      
      for (const query of searchQueries) {
        const reviews = await this.scrapeGoogleMapsReviews(query);
        
        // Remove duplicates based on author name and text similarity
        const newReviews = reviews.filter(review => {
          return !allReviews.some(existing => 
            existing.author_name === review.author_name && 
            existing.text.substring(0, 50) === review.text.substring(0, 50)
          );
        });
        
        allReviews = [...allReviews, ...newReviews];
        
        // Wait between requests to avoid being blocked
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      // Sort by estimated time (newest first)
      allReviews.sort((a, b) => b.time - a.time);
      
      console.log(`📊 Total unique reviews collected for ${storeName}: ${allReviews.length}`);
      return allReviews;
      
    } catch (error) {
      console.error(`❌ Error in comprehensive review collection for ${storeName}:`, error);
      return [];
    }
  }
}
