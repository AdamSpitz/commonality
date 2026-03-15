import { onchainTable, relations } from "ponder";
import { users } from "./conceptspace.schema";

// ============================================================================
// SOCIAL DATA SCHEMA
// ============================================================================
// Off-chain social data for users: ENS names, Twitter handles, follower counts.
// Populated by a background sync job, not by on-chain events.
// ============================================================================

/**
 * User social data - ENS names and Twitter profile information.
 * Keyed by Ethereum address, linked to the conceptspace users table.
 */
export const userSocialData = onchainTable("user_social_data", (t) => ({
  // Ethereum address (matches users.id)
  address: t.hex().primaryKey(),
  // ENS name (e.g. "vitalik.eth")
  ensName: t.text(),
  // Twitter handle from ENS text record (e.g. "VitalikButerin")
  twitterHandle: t.text(),
  // Follower count from Twitter API
  twitterFollowerCount: t.integer(),
  // Whether the ENS→Twitter link is verified
  // TODO: implement verification check
  // see https://support.ens.domains/en/articles/9626402-profile-verification
  isTwitterVerified: t.boolean().notNull().default(false),
  // Whether we've attempted to fetch social data
  socialDataFetched: t.boolean().notNull().default(false),
  // Timestamp of last successful fetch (milliseconds)
  fetchedAt: t.bigint(),
  // Error message from last fetch attempt, if any
  error: t.text(),
}));

export const userSocialDataRelations = relations(userSocialData, ({ one }) => ({
  user: one(users, {
    fields: [userSocialData.address],
    references: [users.id],
  }),
}));
