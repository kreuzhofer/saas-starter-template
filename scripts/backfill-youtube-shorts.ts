/**
 * Backfill Script: YouTube Shorts Video IDs and Statistics
 * 
 * This script finds all short URLs pointing to YouTube Shorts that don't have
 * a youtubeVideoId set (created before the Shorts support was added), extracts
 * the video ID, and fetches initial statistics.
 * 
 * Usage:
 *   npx ts-node scripts/backfill-youtube-shorts.ts
 */

import db from '../src/db/client';
import { youtubeService } from '../src/services/youtube';
import logger from '../src/utils/logger';

async function backfillYoutubeShorts() {
  logger.info('Starting YouTube Shorts backfill script');

  try {
    // Find all URLs with Shorts source URLs but no youtubeVideoId
    const shortsUrls = await db.shortUrl.findMany({
      where: {
        sourceUrl: {
          contains: '/shorts/'
        },
        youtubeVideoId: null
      },
      select: {
        id: true,
        shortCode: true,
        sourceUrl: true,
        createdAt: true
      }
    });

    logger.info(`Found ${shortsUrls.length} YouTube Shorts URLs without video IDs`);

    if (shortsUrls.length === 0) {
      logger.info('No URLs to backfill. Exiting.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const url of shortsUrls) {
      try {
        logger.info(`Processing ${url.shortCode} (${url.sourceUrl})`);

        // Skip if sourceUrl is null
        if (!url.sourceUrl) {
          logger.warn(`Source URL is null for ${url.shortCode}`);
          errorCount++;
          continue;
        }

        // Extract video ID using the updated service
        const videoId = youtubeService.extractVideoId(url.sourceUrl);

        if (!videoId) {
          logger.warn(`Could not extract video ID from ${url.sourceUrl}`);
          errorCount++;
          continue;
        }

        logger.info(`Extracted video ID: ${videoId}`);

        // Fetch statistics from YouTube API
        const statistics = await youtubeService.fetchVideoStatistics(videoId);

        // Update the database with video ID and statistics
        await db.shortUrl.update({
          where: { id: url.id },
          data: {
            youtubeVideoId: videoId,
            youtubeVideoTitle: statistics.title,
            youtubeViewCount: BigInt(statistics.viewCount),
            youtubeViewCountBaseline: BigInt(statistics.viewCount),
            youtubeLikeCount: BigInt(statistics.likeCount),
            youtubeCommentCount: BigInt(statistics.commentCount),
            youtubeLastFetchedAt: statistics.fetchedAt,
          },
        });

        logger.info(`Successfully backfilled ${url.shortCode}`, {
          videoId,
          title: statistics.title,
          viewCount: statistics.viewCount,
          likeCount: statistics.likeCount,
          commentCount: statistics.commentCount
        });

        successCount++;

        // Rate limiting: wait 500ms between requests to avoid hitting API limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        logger.error(`Failed to backfill ${url.shortCode}`, {
          error: error instanceof Error ? error.message : String(error),
          sourceUrl: url.sourceUrl
        });
        errorCount++;
      }
    }

    logger.info('YouTube Shorts backfill completed', {
      total: shortsUrls.length,
      success: successCount,
      errors: errorCount
    });

  } catch (error) {
    logger.error('Backfill script failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the script
backfillYoutubeShorts()
  .then(() => {
    logger.info('Backfill script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Backfill script failed with error', { error });
    process.exit(1);
  });
