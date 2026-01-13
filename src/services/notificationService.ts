/**
 * Notification Service
 * 
 * Core business logic for managing banners and toast notifications.
 * Handles creation, updates, deletion, filtering, and dismissal of banners.
 */

import prisma from '../db/client';
import { CreateBannerInput, UpdateBannerInput, BannerOutput, BannerLink } from '../types/banner';

/**
 * Converts a Prisma Banner record to BannerOutput format
 */
function toBannerOutput(banner: any): BannerOutput {
  const output: BannerOutput = {
    id: banner.id,
    type: banner.type,
    message: banner.message,
    dismissable: banner.dismissable,
    audience: banner.audience,
    createdAt: banner.createdAt,
    updatedAt: banner.updatedAt,
  };

  if (banner.key) output.key = banner.key;
  if (banner.accountId) output.accountId = banner.accountId;
  
  // Reconstruct link object if link fields are present
  if (banner.linkText && banner.linkUrl && banner.linkStyle) {
    output.link = {
      text: banner.linkText,
      url: banner.linkUrl,
      external: banner.linkExternal,
      style: banner.linkStyle,
    };
  }
  
  if (banner.backgroundColor) output.backgroundColor = banner.backgroundColor;
  if (banner.textColor) output.textColor = banner.textColor;
  if (banner.scheduledStart) output.scheduledStart = banner.scheduledStart;
  if (banner.scheduledEnd) output.scheduledEnd = banner.scheduledEnd;

  return output;
}

/**
 * Creates or updates a banner using key-based upsert logic
 * 
 * If key is provided and a banner with that key exists in the same scope
 * (same accountId or both global), updates the existing banner and clears dismissals.
 * If key is not provided, always creates a new banner.
 * 
 * @param input - Banner creation input
 * @returns The created or updated banner
 */
export async function createOrUpdateBanner(input: CreateBannerInput): Promise<BannerOutput> {
  // If key is provided, check for existing banner with same key and scope
  if (input.key) {
    const existingBanner = await prisma.banner.findFirst({
      where: {
        key: input.key,
        accountId: input.accountId || null,
      },
    });

    if (existingBanner) {
      // Update existing banner and clear dismissals
      await prisma.$transaction(async (tx) => {
        // Delete all dismissal records for this banner
        await tx.bannerDismissal.deleteMany({
          where: { bannerId: existingBanner.id },
        });

        // Update the banner
        await tx.banner.update({
          where: { id: existingBanner.id },
          data: {
            type: input.type,
            message: input.message,
            dismissable: input.dismissable ?? true,
            audience: input.audience ?? 'authenticated',
            linkText: input.link?.text || null,
            linkUrl: input.link?.url || null,
            linkExternal: input.link?.external ?? false,
            linkStyle: input.link?.style || null,
            backgroundColor: input.backgroundColor || null,
            textColor: input.textColor || null,
            scheduledStart: input.scheduledStart || null,
            scheduledEnd: input.scheduledEnd || null,
          },
        });
      });

      // Fetch and return the updated banner
      const updatedBanner = await prisma.banner.findUnique({
        where: { id: existingBanner.id },
      });

      return toBannerOutput(updatedBanner!);
    }
  }

  // Create new banner
  const banner = await prisma.banner.create({
    data: {
      key: input.key || null,
      accountId: input.accountId || null,
      type: input.type,
      message: input.message,
      dismissable: input.dismissable ?? true,
      audience: input.audience ?? 'authenticated',
      linkText: input.link?.text || null,
      linkUrl: input.link?.url || null,
      linkExternal: input.link?.external ?? false,
      linkStyle: input.link?.style || null,
      backgroundColor: input.backgroundColor || null,
      textColor: input.textColor || null,
      scheduledStart: input.scheduledStart || null,
      scheduledEnd: input.scheduledEnd || null,
    },
  });

  return toBannerOutput(banner);
}

/**
 * Updates an existing banner by ID
 * 
 * @param id - Banner ID
 * @param input - Banner update input
 * @returns The updated banner
 * @throws Error if banner not found
 */
export async function updateBanner(id: string, input: UpdateBannerInput): Promise<BannerOutput> {
  const updateData: any = {};

  if (input.type !== undefined) updateData.type = input.type;
  if (input.message !== undefined) updateData.message = input.message;
  if (input.dismissable !== undefined) updateData.dismissable = input.dismissable;
  if (input.audience !== undefined) updateData.audience = input.audience;
  
  // Handle link updates (null to remove, object to set)
  if (input.link !== undefined) {
    if (input.link === null) {
      updateData.linkText = null;
      updateData.linkUrl = null;
      updateData.linkExternal = false;
      updateData.linkStyle = null;
    } else {
      updateData.linkText = input.link.text;
      updateData.linkUrl = input.link.url;
      updateData.linkExternal = input.link.external;
      updateData.linkStyle = input.link.style;
    }
  }
  
  if (input.backgroundColor !== undefined) updateData.backgroundColor = input.backgroundColor;
  if (input.textColor !== undefined) updateData.textColor = input.textColor;
  if (input.scheduledStart !== undefined) updateData.scheduledStart = input.scheduledStart;
  if (input.scheduledEnd !== undefined) updateData.scheduledEnd = input.scheduledEnd;

  const banner = await prisma.banner.update({
    where: { id },
    data: updateData,
  });

  return toBannerOutput(banner);
}

/**
 * Deletes a banner by ID
 * 
 * @param id - Banner ID
 * @throws Error if banner not found
 */
export async function deleteBanner(id: string): Promise<void> {
  await prisma.banner.delete({
    where: { id },
  });
}

/**
 * Deletes all banners matching a key
 * 
 * @param key - Banner key
 * @returns Number of banners deleted
 */
export async function deleteBannersByKey(key: string): Promise<number> {
  const result = await prisma.banner.deleteMany({
    where: { key },
  });
  
  return result.count;
}

/**
 * Retrieves active banners for a specific account or global banners
 * 
 * Filters by:
 * - Schedule (only banners within their scheduled time window)
 * - Dismissals (excludes banners dismissed by the account)
 * - Audience (filters global banners by authentication status)
 * 
 * @param accountId - Account ID (null for unauthenticated users)
 * @param isAuthenticated - Whether the user is authenticated
 * @returns Array of active banners
 */
export async function getActiveBanners(
  accountId: string | null,
  isAuthenticated: boolean
): Promise<BannerOutput[]> {
  const now = new Date();

  // Build the where clause
  const whereClause: any = {
    AND: [
      // Schedule filtering
      {
        OR: [
          { scheduledStart: null },
          { scheduledStart: { lte: now } },
        ],
      },
      {
        OR: [
          { scheduledEnd: null },
          { scheduledEnd: { gt: now } },
        ],
      },
    ],
  };

  // Audience and account filtering
  if (isAuthenticated && accountId) {
    // Authenticated user: show account-specific banners + global banners for authenticated/all
    whereClause.OR = [
      // Account-specific banners
      { accountId },
      // Global banners with appropriate audience
      {
        accountId: null,
        audience: { in: ['authenticated', 'all'] },
      },
    ];
  } else if (isAuthenticated && !accountId) {
    // Authenticated but no accountId (edge case): only global authenticated/all
    whereClause.AND.push({
      accountId: null,
      audience: { in: ['authenticated', 'all'] },
    });
  } else {
    // Unauthenticated user: only global banners for unauthenticated/all
    whereClause.AND.push({
      accountId: null,
      audience: { in: ['unauthenticated', 'all'] },
    });
  }

  // Fetch banners
  const banners = await prisma.banner.findMany({
    where: whereClause,
  });

  // Filter out dismissed banners if user is authenticated
  let filteredBanners = banners;
  if (isAuthenticated && accountId) {
    const dismissals = await prisma.bannerDismissal.findMany({
      where: {
        accountId,
        bannerId: { in: banners.map(b => b.id) },
      },
      select: { bannerId: true },
    });

    const dismissedBannerIds = new Set(dismissals.map(d => d.bannerId));
    filteredBanners = banners.filter(b => !dismissedBannerIds.has(b.id));
  }

  return filteredBanners.map(toBannerOutput);
}

/**
 * Dismisses a banner for a specific account
 * 
 * Creates a dismissal record to prevent the banner from appearing again
 * for this account.
 * 
 * @param bannerId - Banner ID
 * @param accountId - Account ID
 */
export async function dismissBanner(bannerId: string, accountId: string): Promise<void> {
  await prisma.bannerDismissal.create({
    data: {
      bannerId,
      accountId,
    },
  });
}
