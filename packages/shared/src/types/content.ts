export type ContentType = "POST" | "CAROUSEL" | "REEL";

export type ContentStatus =
  | "DRAFT"
  | "GENERATED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "SCHEDULED"
  | "PROCESSING"
  | "PUBLISHED"
  | "FAILED"
  | "CANCELLED";

export interface IContentPost {
  _id: string;
  userId: string;
  instagramAccountId?: string;
  title: string;
  caption: string;
  hashtags: string[];
  mediaUrls: string[];
  mediaType: ContentType;
  coverImageUrl?: string;
  scheduledPublishTime?: string | Date;
  timezone: string;
  status: ContentStatus;
  isAutoPublish: boolean;
  approval: {
    status: "PENDING" | "APPROVED" | "REJECTED";
    approvedAt?: string | Date;
    approvedBy?: string;
    notes?: string;
  };
  publishingResult?: {
    instagramPostId?: string;
    permalink?: string;
    publishedAt?: string | Date;
    errorMessage?: string;
    retryCount: number;
  };
  createdAt: string | Date;
  updatedAt: string | Date;
}
