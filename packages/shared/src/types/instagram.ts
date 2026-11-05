export interface IInstagramAccountSummary {
  _id: string;
  userId: string;
  instagramId: string;
  username: string;
  name: string;
  profilePictureUrl?: string;
  accountType: "BUSINESS" | "CREATOR";
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  isConnected: boolean;
  tokenExpiresAt?: string | Date;
  lastSyncedAt?: string | Date;
}

export interface IPublishingJob {
  _id: string;
  contentPostId: string;
  instagramAccountId: string;
  status: "QUEUED" | "CLAIMED" | "CONTAINER_CREATED" | "PUBLISHED" | "FAILED";
  containerId?: string;
  attempts: number;
  maxAttempts: number;
  scheduledFor: string | Date;
  lockedAt?: string | Date;
  errorMessage?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IInstagramMetrics {
  totalPublished: number;
  pendingApprovals: number;
  scheduledPosts: number;
  failedJobs: number;
  totalReach: number;
  totalImpressions: number;
  totalLikes: number;
  totalComments: number;
  engagementRate: number;
}
