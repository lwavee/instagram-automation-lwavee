# LWAVEE — Database Architecture (MongoDB Atlas)

## Database Principles
- **Primary Database**: MongoDB Atlas is the **ONLY** primary database.
- **Supabase**: **Not used anywhere** in the stack.
- **Timestamps**: All dates and timestamps are stored in strict UTC.
- **Database Name**: `instagram_automation`

## Collections Schema

1. **`users`**
   - Application users and access roles (`admin`, `editor`, `viewer`).
   - Fields: `_id`, `email`, `passwordHash`, `name`, `role`, `preferences`, `isActive`, `createdAt`, `updatedAt`.

2. **`instagramAccounts`**
   - Connected Instagram Professional (Business or Creator) accounts.
   - Fields: `_id`, `userId`, `instagramId`, `username`, `name`, `profilePictureUrl`, `followersCount`, `accessTokenEncrypted`, `tokenExpiresAt`, `isConnected`, `lastSyncedAt`.

3. **`contentPosts`**
   - High-level content items (Reels, Carousels, Posts).
   - Fields: `_id`, `userId`, `instagramAccountId`, `title`, `caption`, `hashtags`, `mediaUrls`, `mediaType`, `coverImageUrl`, `scheduledPublishTime`, `timezone`, `status`, `approval`, `publishingResult`, `createdAt`, `updatedAt`.

4. **`publishingJobs`**
   - Idempotent publishing execution queue with atomic claiming.
   - Fields: `_id`, `contentPostId`, `status` (`QUEUED`, `CLAIMED`, `CONTAINER_CREATED`, `PUBLISHED`, `FAILED`), `attempts`, `lockedAt`, `errorMessage`.

5. **`publishingLogs`**
   - Execution audit trail for every publishing step and container status transition.

6. **`aiGenerations`**
   - History of AI caption generation prompts, models used, and token outputs.

7. **`automationSettings`**
   - System configuration, timezone preferences, and scheduling cadences.

8. **`apiIntegrations`**
   - Encrypted third-party credentials (OpenRouter, Cloudinary, Meta) using AES-256-GCM.
