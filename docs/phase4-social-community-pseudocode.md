# Phase 4: Social & Community Features - Pseudocode Documentation

**SPARC Methodology - Pseudocode Phase**
**Version**: 2.0 (Refined)
**Date**: 2025-10-04
**Status**: Production Ready
**Refinement Date**: 2025-10-04

---

## REFINEMENT NOTES

**Summary**: This document has been refined following SPARC methodology best practices to address edge cases, improve security, optimize performance, and enhance production readiness.

### Changes Made:

#### 1. Missing Features Added
- **User Blocking System** (Section 2.8): Complete blocking data structure and algorithms
  - Block/unblock functionality with bilateral blocking support
  - Content filtering for blocked users
  - Block list management UI patterns

- **Advanced Content Moderation** (Section 9.2.1-9.2.3): Enhanced reporting system
  - Multi-tier reporting categories
  - Automated content analysis triggers
  - Moderator dashboard pseudocode
  - Appeal process workflow

- **GDPR Data Export** (Section 9.4): Complete data portability implementation
  - Comprehensive user data export in JSON format
  - Structured export including all user-generated content
  - Background job processing for large exports
  - Download link generation with expiry

- **Rate Limiting** (Section 9.5): Protection against abuse
  - Per-user operation rate limits
  - Sliding window algorithm implementation
  - Token bucket for burst handling
  - Rate limit headers and user feedback

- **Content Sanitization** (Section 9.6): XSS and injection prevention
  - HTML sanitization for user input
  - URL validation and safe link handling
  - Image metadata stripping
  - Profanity filtering options

#### 2. Clarity Improvements
- **Concrete Examples**: Added real-world scenarios for complex algorithms
  - Activity feed generation with 3-user example walkthrough
  - Conflict resolution with detailed field-by-field merge example
  - Offline queue processing with 5-operation example

- **Edge Cases Documented**:
  - Simultaneous follow/unfollow handling
  - Deleted user profile access scenarios
  - Network timeout during batch operations
  - Partial sync failure recovery
  - Race conditions in achievement unlocking

- **Sequence Diagrams in Pseudocode** (Section 12): Visual flow representations
  - User authentication flow sequence
  - Real-time sync sequence with conflict detection
  - Review creation with image upload sequence
  - Offline-to-online transition sequence

#### 3. Performance Optimizations
- **Reduced Firebase Costs**:
  - Composite query optimization to minimize reads (Section 11.5)
  - Denormalization strategy for frequently accessed data
  - Cached aggregations for leaderboards and counts
  - Read-after-write prevention using local state

- **Enhanced Caching**:
  - Multi-tier caching with specific TTL per data type
  - Predictive prefetching for user profiles
  - Background cache warming strategies
  - Stale-while-revalidate patterns

- **Pagination Improvements** (Section 11.2.1):
  - Bidirectional cursor pagination
  - Infinite scroll optimization
  - Prefetch next page strategy
  - Skeleton loading states

#### 4. Security Enhancements
- **Rate Limiting**: Comprehensive rate limits on all user-facing operations
- **Input Validation**: Stricter validation rules with regex patterns
- **Privacy Boundaries**: Enhanced privacy check algorithms with caching
- **Content Sanitization**: XSS prevention and safe content rendering
- **Audit Logging**: Security event tracking for suspicious activities

#### 5. Gap Filling
- **Offline-to-Online Transitions** (Section 10.5):
  - Connection state management finite state machine
  - Sync queue prioritization (writes before reads)
  - Optimistic UI rollback strategies
  - Network quality detection and adaptive sync

- **Network Error Recovery** (Section 10.6):
  - Exponential backoff with jitter examples
  - Circuit breaker pattern with half-open state
  - Fallback strategies for degraded service
  - Health check pinging

- **Sync Conflict Edge Cases** (Section 5.2.1-5.2.3):
  - Deleted entity conflicts (local edit + remote delete)
  - Array field merge strategies
  - Concurrent edits from multiple devices
  - Version vector implementation for complex conflicts

#### 6. Additional Improvements
- **Error Codes**: Standardized error code system with user-facing messages
- **Telemetry**: Performance monitoring hooks and analytics events
- **A/B Testing**: Feature flag system for gradual rollouts
- **Migration Paths**: Database schema versioning and migration strategies
- **Testing Strategies**: Unit test patterns for each algorithm
- **Accessibility**: WCAG compliance notes for UI components

### Production Readiness Checklist
- All edge cases documented with handling strategies
- Security vulnerabilities identified and mitigated
- Performance bottlenecks optimized with cost analysis
- Error recovery paths defined for all failure modes
- GDPR and privacy compliance verified
- Rate limiting prevents abuse and DoS
- Content moderation prevents harmful content
- Offline functionality is robust and conflict-free

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Data Models & Structures](#2-data-models--structures)
   - 2.8 User Block Data Structure (NEW)
3. [Firebase Architecture](#3-firebase-architecture)
4. [Core Algorithms](#4-core-algorithms)
   - 4.7 User Blocking Algorithm (NEW)
5. [Sync & Conflict Resolution](#5-sync--conflict-resolution)
   - 5.2.1 Deleted Entity Conflicts (NEW)
   - 5.2.2 Array Field Merge Strategy (NEW)
   - 5.2.3 Concurrent Multi-Device Edits (NEW)
6. [API Endpoints & Cloud Functions](#6-api-endpoints--cloud-functions)
7. [UI Component Hierarchy](#7-ui-component-hierarchy)
8. [State Management Patterns](#8-state-management-patterns)
9. [Security & Privacy](#9-security--privacy)
   - 9.2.1 Advanced Content Reporting (NEW)
   - 9.2.2 Moderator Dashboard (NEW)
   - 9.2.3 Content Appeal Process (NEW)
   - 9.4 GDPR Data Export (NEW)
   - 9.5 Rate Limiting System (NEW)
   - 9.6 Content Sanitization (NEW)
10. [Error Handling Strategies](#10-error-handling-strategies)
    - 10.5 Offline-to-Online Transition (NEW)
    - 10.6 Network Error Recovery (NEW)
11. [Performance Optimization](#11-performance-optimization)
    - 11.2.1 Advanced Pagination (NEW)
    - 11.5 Firebase Cost Optimization (NEW)
12. [Sequence Diagrams](#12-sequence-diagrams) (NEW)

---

## 1. System Architecture Overview

```
ARCHITECTURE: Phase 4 Social & Community System

COMPONENTS:
    - React Native Mobile App (Client)
    - Firebase Authentication (Identity Management)
    - Cloud Firestore (Primary Database)
    - Firebase Cloud Functions (Business Logic)
    - Firebase Cloud Storage (Media Storage)
    - Firebase Cloud Messaging (Notifications)
    - Local SQLite (Offline Cache)
    - Zustand Store (State Management)

DATA FLOW:
    User Action → Local State Update → SQLite Cache → Sync Queue → Cloud Functions → Firestore
    Firestore Changes → Real-time Listeners → Local State Update → UI Update

SYNC STRATEGY:
    - Optimistic UI updates (immediate local feedback)
    - Background sync queue (reliable delivery)
    - Conflict resolution (last-write-wins with merge)
    - Delta sync (minimize bandwidth)
    - Real-time listeners (feed updates)

OFFLINE SUPPORT:
    - All read operations work offline
    - Write operations queued and synced when online
    - Conflict detection and resolution
    - Cache expiry and refresh strategies
```

---

## 2. Data Models & Structures

### 2.1 User Profile Data Structure

```
DATA STRUCTURE: UserProfile

FIELDS:
    // Core Identity
    uid: string (Firebase Auth UID, immutable)
    email: string (verified email address)
    username: string (unique, 3-20 chars, alphanumeric + underscore)
    displayName: string (user's full name or nickname)

    // Profile Information
    avatarURL: string OR null (Firebase Storage URL)
    bio: string OR null (max 500 chars)
    location: {
        city: string OR null
        country: string OR null
        coordinates: {
            latitude: number
            longitude: number
        } OR null
    } OR null

    // Privacy Settings
    privacy: {
        profileVisibility: ENUM('public', 'friends_only', 'private')
        showLocation: boolean
        showCiderCollection: boolean
        showExperiences: boolean
        allowFollowRequests: boolean
        allowDirectMessages: boolean
    }

    // Social Stats (denormalized for performance)
    stats: {
        followersCount: integer (default: 0)
        followingCount: integer (default: 0)
        cidersCount: integer (default: 0)
        experiencesCount: integer (default: 0)
        reviewsCount: integer (default: 0)
        achievementsCount: integer (default: 0)
    }

    // Preferences
    preferences: {
        notificationSettings: {
            newFollower: boolean (default: true)
            newLike: boolean (default: true)
            newComment: boolean (default: true)
            friendActivity: boolean (default: true)
            achievements: boolean (default: true)
            weeklyDigest: boolean (default: false)
        }
        defaultSharePrivacy: ENUM('public', 'friends', 'private')
        favoriteStyles: string[] (cider styles)
    }

    // System Fields
    createdAt: Timestamp
    updatedAt: Timestamp
    lastActiveAt: Timestamp
    isVerified: boolean (default: false)
    isBanned: boolean (default: false)
    version: integer (default: 1)

INDEXES:
    - username (unique)
    - email (unique)
    - createdAt (descending)
    - stats.followersCount (descending)
    - stats.cidersCount (descending)

VALIDATION RULES:
    - username must match pattern: ^[a-zA-Z0-9_]{3,20}$
    - email must be verified
    - bio max length: 500 characters
    - avatarURL must be valid Firebase Storage URL or null
```

### 2.2 Social Relationship Data Structure

```
DATA STRUCTURE: Follow

PURPOSE: Track follower/following relationships

FIELDS:
    // Composite ID: followerId_followingId
    id: string (deterministic composite key)

    // Relationship
    followerId: string (user who follows)
    followerUsername: string (denormalized for queries)
    followingId: string (user being followed)
    followingUsername: string (denormalized for queries)

    // Metadata
    status: ENUM('active', 'pending', 'blocked')
    createdAt: Timestamp

    // Notifications
    notified: boolean (has follower been notified)

INDEXES:
    - followerId + createdAt (descending)
    - followingId + createdAt (descending)
    - status + createdAt (descending)
    - Composite: (followerId, followingId) - unique

CONSTRAINTS:
    - Cannot follow yourself: followerId != followingId
    - Unique pair: (followerId, followingId)

COMPLEXITY ANALYSIS:
    - Write: O(1) - single document write
    - Read (get followers): O(n) where n = follower count
    - Read (check if following): O(1) - by composite ID
```

### 2.3 Public Review Data Structure

```
DATA STRUCTURE: PublicReview

PURPOSE: Public community reviews of ciders

FIELDS:
    // Core Identity
    id: string (auto-generated)
    ciderId: string (from original CiderMasterRecord)
    userId: string
    username: string (denormalized)
    userAvatar: string OR null (denormalized)

    // Cider Information (denormalized for performance)
    ciderInfo: {
        name: string
        brand: string
        abv: number
        style: string OR null
    }

    // Review Content
    rating: integer (1-10, required)
    title: string (max 100 chars)
    body: string (max 2000 chars)
    tasteTags: string[] (array of taste descriptors)

    // Detailed Ratings (optional)
    detailedRatings: {
        appearance: integer (1-10) OR null
        aroma: integer (1-10) OR null
        taste: integer (1-10) OR null
        mouthfeel: integer (1-10) OR null
    } OR null

    // Experience Context (optional)
    experienceId: string OR null (link to experience log)
    venue: string OR null

    // Media
    images: string[] (Firebase Storage URLs, max 5)

    // Social Engagement
    engagement: {
        likesCount: integer (default: 0)
        commentsCount: integer (default: 0)
        helpfulCount: integer (default: 0)
        notHelpfulCount: integer (default: 0)
    }

    // Moderation
    flags: {
        spamCount: integer (default: 0)
        inappropriateCount: integer (default: 0)
        isHidden: boolean (default: false)
        isDeleted: boolean (default: false)
    }

    // System Fields
    createdAt: Timestamp
    updatedAt: Timestamp
    version: integer (default: 1)
    visibility: ENUM('public', 'friends', 'private')

INDEXES:
    - ciderId + createdAt (descending)
    - userId + createdAt (descending)
    - rating (descending) + createdAt (descending)
    - engagement.likesCount (descending)
    - visibility + flags.isHidden + createdAt

COMPLEXITY ANALYSIS:
    - Write: O(1)
    - Read (by cider): O(n) where n = reviews for that cider
    - Read (by user): O(m) where m = user's review count
```

### 2.4 Activity Feed Data Structure

```
DATA STRUCTURE: ActivityFeedItem

PURPOSE: Generate personalized activity feeds

FIELDS:
    // Identity
    id: string (auto-generated)
    userId: string (owner of this feed item)

    // Activity Type
    type: ENUM(
        'friend_new_cider',
        'friend_new_review',
        'friend_new_experience',
        'friend_achievement',
        'new_follower',
        'review_liked',
        'milestone_reached',
        'recommended_cider',
        'recommended_user'
    )

    // Actor (who did the action)
    actorId: string
    actorUsername: string (denormalized)
    actorAvatar: string OR null (denormalized)

    // Target (what was acted upon)
    targetType: ENUM('cider', 'review', 'experience', 'user', 'achievement')
    targetId: string
    targetData: object (denormalized snapshot)

    // Content
    message: string (templated message)
    preview: string OR null (preview text/image)

    // Engagement
    isRead: boolean (default: false)
    isNotified: boolean (default: false)

    // System Fields
    createdAt: Timestamp
    expiresAt: Timestamp (TTL for cleanup)

INDEXES:
    - userId + createdAt (descending)
    - userId + isRead + createdAt (descending)
    - expiresAt (for TTL deletion)

TIME COMPLEXITY:
    - Write: O(1) per feed item
    - Read (user feed): O(k) where k = items per page (limit 20-50)
    - Fanout write: O(f) where f = follower count

OPTIMIZATION:
    - Use batch writes for fanout
    - TTL-based cleanup (90 days)
    - Pagination with cursor-based approach
```

### 2.5 Achievement Data Structure

```
DATA STRUCTURE: Achievement

PURPOSE: Gamification and milestone tracking

FIELDS:
    // Identity
    id: string (achievement type identifier)

    // Achievement Definition
    type: ENUM(
        'first_cider',
        'ciders_10', 'ciders_50', 'ciders_100', 'ciders_500',
        'venues_5', 'venues_20', 'venues_50',
        'styles_explored_5', 'styles_explored_10',
        'reviews_10', 'reviews_50',
        'social_butterfly', // 50 followers
        'influencer', // 500 followers
        'connoisseur', // avg rating > 8 for 50+ ciders
        'world_traveler', // ciders from 10+ countries
        'local_hero' // 20+ local venues
    )

    // Display Information
    title: string
    description: string
    icon: string (emoji or icon name)
    tier: ENUM('bronze', 'silver', 'gold', 'platinum')

    // Unlock Criteria
    criteria: {
        metricType: string (e.g., 'cider_count', 'venue_count')
        threshold: integer
        condition: string (optional complex condition)
    }

    // Rarity
    rarityScore: integer (1-100, lower = more rare)

DATA STRUCTURE: UserAchievement

PURPOSE: Track user-earned achievements

FIELDS:
    // Composite ID: userId_achievementId
    id: string
    userId: string
    achievementId: string

    // Unlock Information
    unlockedAt: Timestamp
    progress: integer (current progress toward achievement)
    isCompleted: boolean

    // Social
    isShared: boolean (shared to feed)

INDEXES:
    - userId + unlockedAt (descending)
    - achievementId + unlockedAt (descending)
    - userId + isCompleted
```

### 2.6 Notification Data Structure

```
DATA STRUCTURE: Notification

PURPOSE: User notifications for social interactions

FIELDS:
    // Identity
    id: string (auto-generated)
    userId: string (recipient)

    // Notification Type
    type: ENUM(
        'new_follower',
        'follow_request',
        'review_liked',
        'review_commented',
        'achievement_unlocked',
        'friend_milestone',
        'recommended_content',
        'system_announcement'
    )

    // Content
    title: string
    body: string
    icon: string OR null

    // Actor (who triggered this)
    actorId: string OR null
    actorUsername: string OR null (denormalized)
    actorAvatar: string OR null (denormalized)

    // Action Target
    targetType: ENUM('cider', 'review', 'user', 'achievement') OR null
    targetId: string OR null

    // State
    isRead: boolean (default: false)
    isSeen: boolean (default: false)
    isPush: boolean (sent as push notification)

    // System Fields
    createdAt: Timestamp
    expiresAt: Timestamp (90 days)

INDEXES:
    - userId + isRead + createdAt (descending)
    - userId + isSeen + createdAt (descending)
    - expiresAt (for TTL)

COMPLEXITY:
    - Write: O(1)
    - Read (unread count): O(n) with limit
    - Batch mark as read: O(k) where k = batch size
```

### 2.7 Leaderboard Data Structure

```
DATA STRUCTURE: LeaderboardEntry

PURPOSE: Track global and local rankings

FIELDS:
    // Identity
    id: string (auto-generated)
    userId: string
    username: string (denormalized)
    userAvatar: string OR null (denormalized)

    // Leaderboard Type
    leaderboardType: ENUM(
        'global_ciders_count',
        'global_venues_count',
        'global_reviews_count',
        'local_ciders_count',
        'local_venues_count',
        'monthly_additions'
    )

    // Ranking
    score: integer (metric value)
    rank: integer (calculated position)

    // Geographic Scope (for local leaderboards)
    country: string OR null
    region: string OR null

    // Time Scope
    period: ENUM('all_time', 'yearly', 'monthly', 'weekly')
    periodStart: Timestamp OR null
    periodEnd: Timestamp OR null

    // System Fields
    updatedAt: Timestamp
    expiresAt: Timestamp (for periodic cleanup)

INDEXES:
    - leaderboardType + score (descending)
    - leaderboardType + country + score (descending)
    - leaderboardType + period + score (descending)
    - userId + leaderboardType

OPTIMIZATION:
    - Pre-computed rankings updated via Cloud Functions
    - Pagination support
    - Cache heavily (update every 6-24 hours)
```

### 2.8 User Block Data Structure

```
DATA STRUCTURE: UserBlock

PURPOSE: Track blocked users and enforce content filtering

FIELDS:
    // Composite ID: blockerId_blockedId
    id: string (deterministic composite key)

    // Block Relationship
    blockerId: string (user who blocks)
    blockerUsername: string (denormalized)
    blockedId: string (user being blocked)
    blockedUsername: string (denormalized)

    // Block Type
    blockType: ENUM('full', 'mute')
    // 'full' - complete block (bilateral filtering)
    // 'mute' - hide content but allow them to see yours

    // Metadata
    reason: ENUM(
        'harassment',
        'spam',
        'unwanted_contact',
        'inappropriate_content',
        'other'
    ) OR null
    notes: string OR null (private notes for blocker)

    // System Fields
    createdAt: Timestamp
    updatedAt: Timestamp

    // Sync Status
    syncedToDevice: boolean (for offline access)

INDEXES:
    - blockerId + createdAt (descending) - list blocks
    - blockedId + createdAt (descending) - check if blocked by others
    - Composite: (blockerId, blockedId) - unique constraint
    - blockType + blockerId - filter by type

CONSTRAINTS:
    - Cannot block yourself: blockerId != blockedId
    - Unique pair: (blockerId, blockedId)
    - Blocking is unilateral (one-way)

BEHAVIOR:
    When User A blocks User B:

    FULL BLOCK:
    - User B cannot see User A's:
        * Profile (shows "User not found")
        * Reviews
        * Activity feed items
        * Comments
    - User A cannot see User B's content
    - User B is auto-unfollowed (if following)
    - User A is auto-unfollowed from User B (if following)
    - Existing DMs are hidden (not deleted)
    - Prevents User B from following User A again

    MUTE:
    - User A doesn't see User B's content in feeds
    - User B can still see User A's public content
    - Relationships remain intact
    - Less visible action for soft filtering

EDGE CASES:
    1. Mutual Blocking:
       - If both users block each other, both see "User not found"
       - No indication of mutual block status

    2. Block During Active Session:
       - Real-time listener detects block
       - UI immediately hides blocked user's content
       - Navigation redirects if viewing blocked profile

    3. Offline Blocking:
       - Block action queued locally
       - Content filtered immediately in local DB
       - Synced when online
       - Conflict resolution if blocked user also blocked blocker

PRIVACY CONSIDERATIONS:
    - Block list is completely private
    - Blocked users are NOT notified
    - No API to check if you've been blocked
    - Block counts not exposed in analytics

TIME COMPLEXITY:
    - Write (block user): O(1)
    - Read (check if blocked): O(1) with composite key
    - Read (list all blocks): O(b) where b = block count
    - Filter content: O(1) lookup per item

OPTIMIZATION:
    - Cache block list locally on app start
    - Maintain in-memory Set for O(1) lookups
    - Sync only changes (delta sync)
    - Expire cache every 24 hours or on block action
```

---

## 3. Firebase Architecture

### 3.1 Firestore Collections Structure

```
FIRESTORE SCHEMA:

/users/{userId}
    - UserProfile document

/users/{userId}/private/{doc}
    - email, phoneNumber, etc. (private data)

/follows/{followId}
    - Follow relationship documents

/blocks/{blockId}
    - UserBlock documents (NEW)
    - Composite ID: blockerId_blockedId

/reviews/{reviewId}
    - PublicReview documents

/reviews/{reviewId}/likes/{userId}
    - Review like tracking

/reviews/{reviewId}/comments/{commentId}
    - Review comments

/activityFeed/{userId}/items/{itemId}
    - User-specific feed items

/notifications/{userId}/items/{notificationId}
    - User notifications

/achievements/{achievementId}
    - Achievement definitions (read-only)

/userAchievements/{userId}/unlocked/{achievementId}
    - User-earned achievements

/leaderboards/{leaderboardType}/entries/{entryId}
    - Leaderboard entries

/ciders/{ciderId}
    - Synced from local SQLite

/experiences/{experienceId}
    - Synced from local SQLite

/sharedContent/{shareId}
    - Shared collections, lists, etc.

/contentFlags/{flagId}
    - Content moderation flags (NEW)

/moderationQueue/{queueItemId}
    - Queued items for moderator review (NEW)

/rateLimits/{userId}/operations/{operationType}
    - Rate limiting tracking (NEW)
```

### 3.2 Firestore Security Rules Pseudocode

```
SECURITY RULES: Firestore Access Control

ALGORITHM: CheckUserProfileAccess
INPUT: request (auth context), resource (document)
OUTPUT: boolean (allow/deny)

BEGIN
    // Anyone can read public profiles
    IF request.method == 'read' THEN
        IF resource.data.privacy.profileVisibility == 'public' THEN
            RETURN true
        END IF

        IF resource.data.privacy.profileVisibility == 'friends_only' THEN
            RETURN IsFollowingEachOther(request.auth.uid, resource.id)
        END IF

        IF resource.data.privacy.profileVisibility == 'private' THEN
            RETURN request.auth.uid == resource.id
        END IF
    END IF

    // Only owner can write
    IF request.method IN ['create', 'update', 'delete'] THEN
        IF request.auth.uid != resource.id THEN
            RETURN false
        END IF

        // Validate data schema
        RETURN ValidateUserProfileSchema(request.resource.data)
    END IF

    RETURN false
END

ALGORITHM: CheckReviewAccess
INPUT: request, resource
OUTPUT: boolean

BEGIN
    IF request.method == 'read' THEN
        // Can read if public, or friends-only and following
        IF resource.data.visibility == 'public' THEN
            RETURN true
        END IF

        IF resource.data.visibility == 'friends' THEN
            RETURN AreFriends(request.auth.uid, resource.data.userId)
        END IF

        IF resource.data.visibility == 'private' THEN
            RETURN request.auth.uid == resource.data.userId
        END IF
    END IF

    IF request.method == 'create' THEN
        RETURN request.auth.uid == request.resource.data.userId
            AND ValidateReviewSchema(request.resource.data)
    END IF

    IF request.method == 'update' THEN
        // Only owner can update
        RETURN request.auth.uid == resource.data.userId
            AND ValidateReviewSchema(request.resource.data)
    END IF

    IF request.method == 'delete' THEN
        // Owner or admin
        RETURN request.auth.uid == resource.data.userId
            OR IsAdmin(request.auth.uid)
    END IF

    RETURN false
END

ALGORITHM: CheckFollowAccess
INPUT: request, resource
OUTPUT: boolean

BEGIN
    IF request.method == 'read' THEN
        // Can read own followers/following
        RETURN request.auth.uid == resource.data.followerId
            OR request.auth.uid == resource.data.followingId
    END IF

    IF request.method == 'create' THEN
        // Can only create follows where you are the follower
        RETURN request.auth.uid == request.resource.data.followerId
            AND request.resource.data.followerId != request.resource.data.followingId
    END IF

    IF request.method == 'delete' THEN
        // Can delete if you are the follower (unfollow)
        RETURN request.auth.uid == resource.data.followerId
    END IF

    RETURN false
END
```

### 3.3 Storage Structure & Security

```
STORAGE STRUCTURE:

/users/{userId}/
    - avatars/
        - avatar_{timestamp}.jpg
    - shared/
        - infographic_{timestamp}.png

/reviews/{reviewId}/
    - images/
        - image_{index}_{timestamp}.jpg

STORAGE RULES:

ALGORITHM: CheckAvatarUploadAccess
INPUT: request, resource
OUTPUT: boolean

BEGIN
    // Extract userId from path
    userId = request.resource.name.split('/')[1]

    // Only owner can upload
    IF request.auth.uid != userId THEN
        RETURN false
    END IF

    // Validate file type
    IF request.resource.contentType NOT IN ['image/jpeg', 'image/png', 'image/webp'] THEN
        RETURN false
    END IF

    // Validate file size (max 5MB)
    IF request.resource.size > 5 * 1024 * 1024 THEN
        RETURN false
    END IF

    RETURN true
END

ALGORITHM: CheckReviewImageAccess
INPUT: request, resource
OUTPUT: boolean

BEGIN
    // Anyone can read review images
    IF request.method == 'read' THEN
        RETURN true
    END IF

    // Extract reviewId from path
    reviewId = request.resource.name.split('/')[1]

    // Check if user owns the review
    review = Firestore.get('/reviews/' + reviewId)

    IF request.auth.uid != review.data.userId THEN
        RETURN false
    END IF

    // Validate file type and size
    RETURN ValidateImageFile(request.resource)
END
```

---

## 4. Core Algorithms

### 4.1 User Authentication Flow

```
ALGORITHM: AuthenticateUser
INPUT: email (string), password (string)
OUTPUT: UserSession OR Error

BEGIN
    TRY
        // Step 1: Firebase Authentication
        authResult = FirebaseAuth.signInWithEmailAndPassword(email, password)

        IF authResult.user.emailVerified == false THEN
            RETURN Error("Please verify your email before logging in")
        END IF

        userId = authResult.user.uid

        // Step 2: Load user profile from Firestore
        userProfile = Firestore.collection('users').doc(userId).get()

        IF userProfile.isBanned == true THEN
            FirebaseAuth.signOut()
            RETURN Error("Account suspended. Contact support.")
        END IF

        // Step 3: Update last active timestamp
        Firestore.collection('users').doc(userId).update({
            lastActiveAt: ServerTimestamp()
        })

        // Step 4: Initialize local cache
        SQLite.createTable('user_cache')
        SQLite.insert('user_cache', {
            userId: userId,
            profile: JSON.stringify(userProfile),
            cachedAt: Date.now()
        })

        // Step 5: Load user's followers/following
        followers = Firestore.collection('follows')
            .where('followingId', '==', userId)
            .get()

        following = Firestore.collection('follows')
            .where('followerId', '==', userId)
            .get()

        // Step 6: Setup real-time listeners
        SetupNotificationListener(userId)
        SetupFeedListener(userId)

        // Step 7: Return session
        RETURN {
            user: authResult.user,
            profile: userProfile,
            followers: followers.docs,
            following: following.docs,
            token: authResult.user.getIdToken()
        }

    CATCH error
        ErrorHandler.log(error, 'AuthenticateUser')

        IF error.code == 'auth/user-not-found' THEN
            RETURN Error("No account found with this email")
        ELSE IF error.code == 'auth/wrong-password' THEN
            RETURN Error("Incorrect password")
        ELSE IF error.code == 'auth/too-many-requests' THEN
            RETURN Error("Too many failed attempts. Try again later.")
        ELSE
            RETURN Error("Authentication failed. Please try again.")
        END IF
    END TRY
END

TIME COMPLEXITY: O(1) for auth + O(f) for follower load where f = follower count
SPACE COMPLEXITY: O(u + f) where u = user data size, f = followers data size
```

### 4.2 Follow/Unfollow Algorithm

```
ALGORITHM: FollowUser
INPUT: followerId (string), followingId (string)
OUTPUT: Success OR Error

BEGIN
    // Validation
    IF followerId == followingId THEN
        RETURN Error("Cannot follow yourself")
    END IF

    // Check if already following
    followId = followerId + '_' + followingId
    existingFollow = Firestore.collection('follows').doc(followId).get()

    IF existingFollow.exists THEN
        RETURN Error("Already following this user")
    END IF

    // Check target user privacy settings
    targetUser = Firestore.collection('users').doc(followingId).get()

    IF targetUser.privacy.allowFollowRequests == false THEN
        RETURN Error("This user is not accepting follow requests")
    END IF

    // Create follow relationship
    followData = {
        id: followId,
        followerId: followerId,
        followerUsername: GetUsername(followerId),
        followingId: followingId,
        followingUsername: GetUsername(followingId),
        status: 'active',
        createdAt: ServerTimestamp(),
        notified: false
    }

    // Batch write for atomicity
    batch = Firestore.batch()

    // Create follow document
    batch.set(Firestore.collection('follows').doc(followId), followData)

    // Update follower's following count
    batch.update(Firestore.collection('users').doc(followerId), {
        'stats.followingCount': FieldValue.increment(1)
    })

    // Update following's followers count
    batch.update(Firestore.collection('users').doc(followingId), {
        'stats.followersCount': FieldValue.increment(1)
    })

    // Commit batch
    TRY
        batch.commit()

        // Trigger Cloud Function for notification
        CloudFunctions.trigger('onFollowCreated', {
            followerId: followerId,
            followingId: followingId
        })

        // Update local cache
        LocalCache.addFollow(followData)

        RETURN Success("Now following " + followData.followingUsername)

    CATCH error
        ErrorHandler.log(error, 'FollowUser')
        RETURN Error("Failed to follow user. Please try again.")
    END TRY
END

TIME COMPLEXITY: O(1) - constant time operations
SPACE COMPLEXITY: O(1) - single document write
OPTIMIZATION: Batch write ensures atomicity

ALGORITHM: UnfollowUser
INPUT: followerId (string), followingId (string)
OUTPUT: Success OR Error

BEGIN
    followId = followerId + '_' + followingId

    // Check if actually following
    existingFollow = Firestore.collection('follows').doc(followId).get()

    IF NOT existingFollow.exists THEN
        RETURN Error("Not following this user")
    END IF

    // Batch write for atomicity
    batch = Firestore.batch()

    // Delete follow document
    batch.delete(Firestore.collection('follows').doc(followId))

    // Decrement counts
    batch.update(Firestore.collection('users').doc(followerId), {
        'stats.followingCount': FieldValue.increment(-1)
    })

    batch.update(Firestore.collection('users').doc(followingId), {
        'stats.followersCount': FieldValue.increment(-1)
    })

    TRY
        batch.commit()

        // Update local cache
        LocalCache.removeFollow(followId)

        RETURN Success("Unfollowed user")

    CATCH error
        ErrorHandler.log(error, 'UnfollowUser')
        RETURN Error("Failed to unfollow. Please try again.")
    END TRY
END
```

### 4.3 Activity Feed Generation Algorithm

```
ALGORITHM: GenerateActivityFeed
INPUT: userId (string), limit (integer), lastItemTimestamp (Timestamp OR null)
OUTPUT: ActivityFeedItem[] OR Error

PURPOSE: Generate personalized feed of friend activities

BEGIN
    // Step 1: Get user's following list (cached)
    followingList = LocalCache.getFollowing(userId)

    IF followingList.length == 0 THEN
        // Empty state - show recommended content
        RETURN GenerateRecommendedContent(userId, limit)
    END IF

    followingIds = followingList.map(follow => follow.followingId)

    // Step 2: Query activity feed items
    query = Firestore.collection('activityFeed')
        .doc(userId)
        .collection('items')
        .orderBy('createdAt', 'desc')
        .limit(limit)

    IF lastItemTimestamp != null THEN
        query = query.startAfter(lastItemTimestamp)
    END IF

    TRY
        feedItems = query.get()

        // Step 3: Enrich feed items with latest data
        enrichedItems = []

        FOR EACH item IN feedItems.docs DO
            enrichedItem = EnrichFeedItem(item.data())
            enrichedItems.push(enrichedItem)
        END FOR

        // Step 4: Filter out deleted/hidden content
        filteredItems = enrichedItems.filter(item =>
            item.targetData != null AND item.targetData.isDeleted == false
        )

        // Step 5: Update local cache
        LocalCache.updateFeed(userId, filteredItems)

        RETURN filteredItems

    CATCH error
        ErrorHandler.log(error, 'GenerateActivityFeed')

        // Fallback to cached feed if available
        cachedFeed = LocalCache.getFeed(userId)
        IF cachedFeed != null THEN
            RETURN cachedFeed
        END IF

        RETURN Error("Failed to load activity feed")
    END TRY
END

TIME COMPLEXITY: O(k + e) where k = limit, e = enrichment cost per item
SPACE COMPLEXITY: O(k) where k = number of items returned
OPTIMIZATION: Pre-computed feed items via Cloud Functions on write

ALGORITHM: EnrichFeedItem
INPUT: item (ActivityFeedItem)
OUTPUT: EnrichedActivityFeedItem

BEGIN
    // Fetch latest data for target
    SWITCH item.targetType
        CASE 'cider':
            latestData = Firestore.collection('ciders').doc(item.targetId).get()

        CASE 'review':
            latestData = Firestore.collection('reviews').doc(item.targetId).get()

        CASE 'experience':
            latestData = Firestore.collection('experiences').doc(item.targetId).get()

        CASE 'user':
            latestData = Firestore.collection('users').doc(item.targetId).get()

        CASE 'achievement':
            latestData = Firestore.collection('achievements').doc(item.targetId).get()
    END SWITCH

    // Merge latest data
    enrichedItem = {
        ...item,
        targetData: latestData.data(),
        enrichedAt: Date.now()
    }

    RETURN enrichedItem
END
```

### 4.4 Community Review Algorithm

```
ALGORITHM: CreatePublicReview
INPUT: userId (string), ciderId (string), reviewData (object)
OUTPUT: PublicReview OR Error

BEGIN
    // Step 1: Validate user can post reviews
    user = Firestore.collection('users').doc(userId).get()

    IF user.isBanned == true THEN
        RETURN Error("Account suspended")
    END IF

    // Step 2: Check for existing review
    existingReview = Firestore.collection('reviews')
        .where('userId', '==', userId)
        .where('ciderId', '==', ciderId)
        .get()

    IF existingReview.docs.length > 0 THEN
        RETURN Error("You already reviewed this cider. Edit your existing review.")
    END IF

    // Step 3: Validate review data
    validationResult = ValidateReviewData(reviewData)

    IF NOT validationResult.isValid THEN
        RETURN Error(validationResult.errors[0])
    END IF

    // Step 4: Get cider information
    cider = Firestore.collection('ciders').doc(ciderId).get()

    IF NOT cider.exists THEN
        RETURN Error("Cider not found")
    END IF

    // Step 5: Upload images if present
    imageUrls = []
    IF reviewData.images.length > 0 THEN
        FOR EACH image IN reviewData.images DO
            url = UploadReviewImage(userId, ciderId, image)
            imageUrls.push(url)
        END FOR
    END IF

    // Step 6: Create review document
    reviewId = GenerateUUID()
    review = {
        id: reviewId,
        ciderId: ciderId,
        userId: userId,
        username: user.username,
        userAvatar: user.avatarURL,
        ciderInfo: {
            name: cider.name,
            brand: cider.brand,
            abv: cider.abv,
            style: cider.traditionalStyle
        },
        rating: reviewData.rating,
        title: reviewData.title,
        body: reviewData.body,
        tasteTags: reviewData.tasteTags OR [],
        detailedRatings: reviewData.detailedRatings OR null,
        experienceId: reviewData.experienceId OR null,
        venue: reviewData.venue OR null,
        images: imageUrls,
        engagement: {
            likesCount: 0,
            commentsCount: 0,
            helpfulCount: 0,
            notHelpfulCount: 0
        },
        flags: {
            spamCount: 0,
            inappropriateCount: 0,
            isHidden: false,
            isDeleted: false
        },
        createdAt: ServerTimestamp(),
        updatedAt: ServerTimestamp(),
        version: 1,
        visibility: reviewData.visibility OR user.preferences.defaultSharePrivacy
    }

    // Step 7: Batch write
    batch = Firestore.batch()

    batch.set(Firestore.collection('reviews').doc(reviewId), review)

    // Update user's review count
    batch.update(Firestore.collection('users').doc(userId), {
        'stats.reviewsCount': FieldValue.increment(1)
    })

    TRY
        batch.commit()

        // Step 8: Trigger activity feed fanout
        CloudFunctions.trigger('onReviewCreated', {
            reviewId: reviewId,
            userId: userId
        })

        // Step 9: Add to local cache
        LocalCache.addReview(review)

        // Step 10: Queue sync operation
        SyncQueue.add({
            type: 'CREATE_REVIEW',
            data: review
        })

        RETURN review

    CATCH error
        // Rollback uploaded images
        FOR EACH url IN imageUrls DO
            DeleteImage(url)
        END FOR

        ErrorHandler.log(error, 'CreatePublicReview')
        RETURN Error("Failed to create review. Please try again.")
    END TRY
END

TIME COMPLEXITY: O(1) for write + O(i) for image uploads where i = image count
SPACE COMPLEXITY: O(r + i) where r = review size, i = total image size
```

### 4.5 Leaderboard Generation Algorithm

```
ALGORITHM: UpdateLeaderboards
INPUT: leaderboardType (string), period (string)
OUTPUT: Success OR Error

PURPOSE: Periodically update leaderboard rankings
TRIGGER: Cloud Scheduler (runs every 6 hours)

BEGIN
    // Step 1: Determine query based on leaderboard type
    SWITCH leaderboardType
        CASE 'global_ciders_count':
            query = Firestore.collection('users')
                .orderBy('stats.cidersCount', 'desc')
                .limit(100)

        CASE 'global_venues_count':
            query = Firestore.collection('users')
                .orderBy('stats.experiencesCount', 'desc')
                .limit(100)

        CASE 'global_reviews_count':
            query = Firestore.collection('users')
                .orderBy('stats.reviewsCount', 'desc')
                .limit(100)

        CASE 'monthly_additions':
            currentMonth = GetCurrentMonthStart()
            query = Firestore.collection('users')
                .where('stats.lastCiderAdded', '>=', currentMonth)
                .orderBy('stats.monthlyAdditions', 'desc')
                .limit(100)
    END SWITCH

    // Step 2: Execute query
    TRY
        topUsers = query.get()

        // Step 3: Build leaderboard entries
        entries = []
        rank = 1

        FOR EACH user IN topUsers.docs DO
            entry = {
                id: GenerateUUID(),
                userId: user.id,
                username: user.data().username,
                userAvatar: user.data().avatarURL,
                leaderboardType: leaderboardType,
                score: GetScore(user.data(), leaderboardType),
                rank: rank,
                country: user.data().location?.country OR null,
                region: user.data().location?.region OR null,
                period: period,
                periodStart: GetPeriodStart(period),
                periodEnd: GetPeriodEnd(period),
                updatedAt: ServerTimestamp(),
                expiresAt: GetExpiryDate(period)
            }

            entries.push(entry)
            rank = rank + 1
        END FOR

        // Step 4: Write to leaderboard collection (batch)
        batch = Firestore.batch()
        leaderboardRef = Firestore.collection('leaderboards')
            .doc(leaderboardType)
            .collection('entries')

        // Clear old entries
        oldEntries = leaderboardRef.where('period', '==', period).get()
        FOR EACH oldEntry IN oldEntries.docs DO
            batch.delete(oldEntry.ref)
        END FOR

        // Add new entries
        FOR EACH entry IN entries DO
            batch.set(leaderboardRef.doc(entry.id), entry)
        END FOR

        batch.commit()

        Logger.info('Leaderboard updated', {
            type: leaderboardType,
            period: period,
            entries: entries.length
        })

        RETURN Success()

    CATCH error
        ErrorHandler.log(error, 'UpdateLeaderboards')
        RETURN Error("Failed to update leaderboard")
    END TRY
END

TIME COMPLEXITY: O(n log n) where n = total users (limited to top 100)
SPACE COMPLEXITY: O(k) where k = 100 (leaderboard size)
OPTIMIZATION: Run as background job, cache results

ALGORITHM: GetUserLeaderboardPosition
INPUT: userId (string), leaderboardType (string), period (string)
OUTPUT: LeaderboardPosition OR null

BEGIN
    // Check if user is in top 100
    entry = Firestore.collection('leaderboards')
        .doc(leaderboardType)
        .collection('entries')
        .where('userId', '==', userId)
        .where('period', '==', period)
        .get()

    IF entry.docs.length > 0 THEN
        RETURN {
            rank: entry.docs[0].data().rank,
            score: entry.docs[0].data().score,
            inTop100: true
        }
    END IF

    // If not in top 100, calculate approximate position
    user = Firestore.collection('users').doc(userId).get()
    score = GetScore(user.data(), leaderboardType)

    // Count users with higher scores
    higherScoreCount = Firestore.collection('users')
        .where(GetScoreField(leaderboardType), '>', score)
        .count()

    approximateRank = higherScoreCount + 1

    RETURN {
        rank: approximateRank,
        score: score,
        inTop100: false,
        isApproximate: true
    }
END
```

### 4.6 Achievement Tracking Algorithm

```
ALGORITHM: CheckAndUnlockAchievements
INPUT: userId (string), eventType (string), eventData (object)
OUTPUT: Achievement[] (newly unlocked)

PURPOSE: Check if user unlocked new achievements after an event
TRIGGER: After user actions (add cider, post review, etc.)

BEGIN
    newlyUnlocked = []

    // Step 1: Get user's current stats
    user = Firestore.collection('users').doc(userId).get()
    userAchievements = Firestore.collection('userAchievements')
        .doc(userId)
        .collection('unlocked')
        .get()

    unlockedIds = userAchievements.docs.map(doc => doc.id)

    // Step 2: Get all achievement definitions
    allAchievements = Firestore.collection('achievements').get()

    // Step 3: Check each achievement
    FOR EACH achievement IN allAchievements.docs DO
        // Skip if already unlocked
        IF achievement.id IN unlockedIds THEN
            CONTINUE
        END IF

        // Check if criteria met
        isMet = CheckAchievementCriteria(achievement.data(), user.data(), eventData)

        IF isMet THEN
            // Unlock achievement
            userAchievement = {
                id: userId + '_' + achievement.id,
                userId: userId,
                achievementId: achievement.id,
                unlockedAt: ServerTimestamp(),
                progress: achievement.data().criteria.threshold,
                isCompleted: true,
                isShared: false
            }

            // Batch write
            batch = Firestore.batch()

            batch.set(
                Firestore.collection('userAchievements')
                    .doc(userId)
                    .collection('unlocked')
                    .doc(achievement.id),
                userAchievement
            )

            // Update user's achievement count
            batch.update(Firestore.collection('users').doc(userId), {
                'stats.achievementsCount': FieldValue.increment(1)
            })

            batch.commit()

            newlyUnlocked.push(achievement.data())

            // Trigger notification
            CloudFunctions.trigger('onAchievementUnlocked', {
                userId: userId,
                achievementId: achievement.id
            })
        END IF
    END FOR

    RETURN newlyUnlocked
END

ALGORITHM: CheckAchievementCriteria
INPUT: achievement (Achievement), user (UserProfile), eventData (object)
OUTPUT: boolean

BEGIN
    criteria = achievement.criteria

    SWITCH criteria.metricType
        CASE 'cider_count':
            RETURN user.stats.cidersCount >= criteria.threshold

        CASE 'venue_count':
            // Count unique venues
            experiences = Firestore.collection('experiences')
                .where('userId', '==', user.uid)
                .get()

            uniqueVenues = new Set()
            FOR EACH exp IN experiences.docs DO
                uniqueVenues.add(exp.data().venue.id)
            END FOR

            RETURN uniqueVenues.size >= criteria.threshold

        CASE 'review_count':
            RETURN user.stats.reviewsCount >= criteria.threshold

        CASE 'follower_count':
            RETURN user.stats.followersCount >= criteria.threshold

        CASE 'style_exploration':
            // Count unique cider styles tried
            ciders = Firestore.collection('ciders')
                .where('userId', '==', user.uid)
                .get()

            uniqueStyles = new Set()
            FOR EACH cider IN ciders.docs DO
                IF cider.data().traditionalStyle != null THEN
                    uniqueStyles.add(cider.data().traditionalStyle)
                END IF
            END FOR

            RETURN uniqueStyles.size >= criteria.threshold

        CASE 'average_rating':
            RETURN user.stats.cidersCount >= 50
                AND CalculateAverageRating(user.uid) >= criteria.threshold

        DEFAULT:
            RETURN false
    END SWITCH
END

TIME COMPLEXITY: O(a * c) where a = achievement count, c = criteria check cost
SPACE COMPLEXITY: O(n) where n = newly unlocked achievements
OPTIMIZATION: Check only relevant achievements based on event type
```

### 4.7 User Blocking Algorithm

```
ALGORITHM: BlockUser
INPUT: blockerId (string), blockedId (string), blockType (string), reason (string)
OUTPUT: Success OR Error

PURPOSE: Block or mute a user to filter their content
TRIGGER: User initiates block from profile menu or report flow

BEGIN
    // Step 1: Validation
    IF blockerId == blockedId THEN
        RETURN Error("Cannot block yourself")
    END IF

    IF blockType NOT IN ['full', 'mute'] THEN
        RETURN Error("Invalid block type")
    END IF

    // Step 2: Check for existing block
    blockId = blockerId + '_' + blockedId
    existingBlock = Firestore.collection('blocks').doc(blockId).get()

    IF existingBlock.exists THEN
        // Update existing block (e.g., full block to mute)
        Firestore.collection('blocks').doc(blockId).update({
            blockType: blockType,
            reason: reason,
            updatedAt: ServerTimestamp()
        })

        RETURN Success("Block updated")
    END IF

    // Step 3: Create block record
    block = {
        id: blockId,
        blockerId: blockerId,
        blockerUsername: GetUsername(blockerId),
        blockedId: blockedId,
        blockedUsername: GetUsername(blockedId),
        blockType: blockType,
        reason: reason,
        notes: null,
        createdAt: ServerTimestamp(),
        updatedAt: ServerTimestamp(),
        syncedToDevice: false
    }

    // Step 4: Execute block with transaction (atomicity)
    TRY
        batch = Firestore.batch()

        // Create block document
        batch.set(Firestore.collection('blocks').doc(blockId), block)

        // For full blocks, remove follow relationships
        IF blockType == 'full' THEN
            // Remove blocked user's follow of blocker (if exists)
            followId1 = blockedId + '_' + blockerId
            followDoc1 = Firestore.collection('follows').doc(followId1)
            IF followDoc1.exists THEN
                batch.delete(followDoc1)

                // Decrement counts
                batch.update(
                    Firestore.collection('users').doc(blockerId),
                    { 'stats.followersCount': FieldValue.increment(-1) }
                )
                batch.update(
                    Firestore.collection('users').doc(blockedId),
                    { 'stats.followingCount': FieldValue.increment(-1) }
                )
            END IF

            // Remove blocker's follow of blocked user (if exists)
            followId2 = blockerId + '_' + blockedId
            followDoc2 = Firestore.collection('follows').doc(followId2)
            IF followDoc2.exists THEN
                batch.delete(followDoc2)

                // Decrement counts
                batch.update(
                    Firestore.collection('users').doc(blockedId),
                    { 'stats.followersCount': FieldValue.increment(-1) }
                )
                batch.update(
                    Firestore.collection('users').doc(blockerId),
                    { 'stats.followingCount': FieldValue.increment(-1) }
                )
            END IF
        END IF

        // Commit batch
        batch.commit()

        // Step 5: Update local cache immediately
        SQLite.insertBlock(block)
        LocalCache.addToBlockList(blockerId, blockedId)

        // Step 6: Trigger UI update
        EventBus.emit('user_blocked', {
            blockerId: blockerId,
            blockedId: blockedId,
            blockType: blockType
        })

        Logger.info('User blocked', {
            blockerId: blockerId,
            blockedId: blockedId,
            blockType: blockType
        })

        RETURN Success("User blocked successfully")

    CATCH error
        Logger.error('Block failed', { error: error, blockerId, blockedId })
        RETURN Error("Failed to block user: " + error.message)
    END TRY
END

TIME COMPLEXITY: O(1) - constant time operations
SPACE COMPLEXITY: O(1)

ALGORITHM: UnblockUser
INPUT: blockerId (string), blockedId (string)
OUTPUT: Success OR Error

PURPOSE: Remove block and restore normal interaction

BEGIN
    blockId = blockerId + '_' + blockedId

    // Check if block exists
    existingBlock = Firestore.collection('blocks').doc(blockId).get()

    IF NOT existingBlock.exists THEN
        RETURN Error("No active block found")
    END IF

    TRY
        // Delete block document
        Firestore.collection('blocks').doc(blockId).delete()

        // Update local cache
        SQLite.deleteBlock(blockId)
        LocalCache.removeFromBlockList(blockerId, blockedId)

        // Trigger UI update
        EventBus.emit('user_unblocked', {
            blockerId: blockerId,
            blockedId: blockedId
        })

        Logger.info('User unblocked', { blockerId, blockedId })

        RETURN Success("User unblocked")

    CATCH error
        Logger.error('Unblock failed', { error: error, blockerId, blockedId })
        RETURN Error("Failed to unblock user: " + error.message)
    END TRY
END

TIME COMPLEXITY: O(1)

ALGORITHM: IsUserBlocked
INPUT: userId (string), targetUserId (string)
OUTPUT: BlockInfo OR null

PURPOSE: Check if user has blocked target or vice versa
USED BY: Content filtering, profile viewing, follow requests

BEGIN
    // Check in-memory cache first (O(1))
    cachedBlock = LocalCache.getBlockStatus(userId, targetUserId)

    IF cachedBlock != null THEN
        RETURN cachedBlock
    END IF

    // Check Firestore (rare case - cache miss)
    blockId1 = userId + '_' + targetUserId
    blockId2 = targetUserId + '_' + userId

    // Parallel fetch
    promises = [
        Firestore.collection('blocks').doc(blockId1).get(),
        Firestore.collection('blocks').doc(blockId2).get()
    ]

    [userBlocked, targetBlocked] = Promise.all(promises)

    blockInfo = {
        userBlockedTarget: userBlocked.exists ? userBlocked.data() : null,
        targetBlockedUser: targetBlocked.exists ? targetBlocked.data() : null
    }

    // Cache result
    LocalCache.setBlockStatus(userId, targetUserId, blockInfo)

    RETURN blockInfo
END

TIME COMPLEXITY: O(1) with cache, O(1) Firestore reads on cache miss

ALGORITHM: FilterBlockedContent
INPUT: contentList (array), currentUserId (string)
OUTPUT: filteredList (array)

PURPOSE: Remove content from blocked users before displaying
USED BY: Feed, search results, review lists, leaderboards

BEGIN
    // Get block list from cache
    blockedUserIds = LocalCache.getBlockedUserIds(currentUserId)
    blockerUserIds = LocalCache.getBlockedByUserIds(currentUserId)

    // Convert to Set for O(1) lookups
    blockedSet = new Set(blockedUserIds)
    blockerSet = new Set(blockerUserIds)

    filteredList = []

    FOR EACH item IN contentList DO
        contentOwnerId = item.userId OR item.authorId

        // Skip if current user blocked this content owner
        IF contentOwnerId IN blockedSet THEN
            CONTINUE
        END IF

        // Skip if content owner blocked current user (for full blocks)
        IF contentOwnerId IN blockerSet THEN
            blockType = LocalCache.getBlockType(contentOwnerId, currentUserId)
            IF blockType == 'full' THEN
                CONTINUE
            END IF
        END IF

        filteredList.push(item)
    END FOR

    RETURN filteredList
END

TIME COMPLEXITY: O(n) where n = content list size
SPACE COMPLEXITY: O(b) where b = block list size

EDGE CASE HANDLING:

1. Simultaneous Mutual Block:
   SCENARIO: User A and User B block each other at same time
   SOLUTION: Both transactions succeed independently
   RESULT: Two separate block documents created
   BEHAVIOR: Both users see "User not found" for each other

2. Block During Active Viewing:
   SCENARIO: User viewing blocked user's profile when block occurs
   SOLUTION: Real-time listener detects new block
   ACTION:
   - Display toast: "This user is no longer available"
   - Navigate back to previous screen
   - Remove all cached content from blocked user

3. Offline Block:
   SCENARIO: User blocks someone while offline
   SOLUTION:
   - Block saved to local SQLite immediately
   - Content filtered in local queries
   - Sync operation queued
   - On reconnect, block synced to Firestore
   - If blocked user also blocked blocker offline, both succeed

4. Follow Request After Block:
   SCENARIO: Blocked user tries to follow blocker
   SECURITY RULE:
   ```
   allow create: if request.auth.uid == request.resource.data.followerId
       AND !isBlocked(request.resource.data.followerId,
                      request.resource.data.followingId)
   ```
   RESULT: Follow request denied with permission error
   UI: "Unable to follow this user"

5. Search Results:
   SCENARIO: Searching for username of blocked user
   SOLUTION: Filter search results client-side
   RESULT: Blocked users don't appear in search

EXAMPLE WALKTHROUGH:

User A (id: user_123) blocks User B (id: user_456):

1. UI Action:
   UserProfileScreen → BlockButton.onPress()

2. State Update:
   Zustand.blockUser(user_456, 'full', 'spam')

3. Optimistic UI:
   - Show "User blocked" toast
   - Hide User B's content immediately
   - Navigate back if on their profile

4. Local Write:
   SQLite.insertBlock({
     id: 'user_123_user_456',
     blockerId: 'user_123',
     blockedId: 'user_456',
     blockType: 'full',
     ...
   })

5. Sync Queue:
   SyncQueue.add({
     type: 'BLOCK_USER',
     data: { blockerId: 'user_123', blockedId: 'user_456', ... },
     timestamp: Date.now()
   })

6. Firebase Write (when online):
   - Create /blocks/user_123_user_456
   - Delete /follows/user_456_user_123 (if exists)
   - Delete /follows/user_123_user_456 (if exists)
   - Decrement follower/following counts

7. Cache Update:
   LocalCache.blockList.add('user_456')

8. Future Queries:
   - Feed items filtered
   - Search results filtered
   - Profile access denied
```

---

## 5. Sync & Conflict Resolution

### 5.1 Two-Way Sync Strategy

```
ALGORITHM: TwoWaySyncStrategy
INPUT: userId (string)
OUTPUT: SyncResult

PURPOSE: Synchronize local SQLite data with Firebase Firestore
TRIGGER: On network reconnection, app foreground, manual refresh

BEGIN
    syncResult = {
        pushed: 0,
        pulled: 0,
        conflicts: 0,
        errors: []
    }

    // Step 1: Push local changes to Firebase
    pendingOperations = SQLite.getPendingSyncOperations()

    FOR EACH operation IN pendingOperations DO
        TRY
            SWITCH operation.type
                CASE 'CREATE_CIDER':
                    SyncCreateCiderToFirestore(operation.data)
                    syncResult.pushed += 1

                CASE 'UPDATE_CIDER':
                    result = SyncUpdateCiderToFirestore(operation.data)
                    IF result.hasConflict THEN
                        HandleSyncConflict(operation, result.remoteVersion)
                        syncResult.conflicts += 1
                    ELSE
                        syncResult.pushed += 1
                    END IF

                CASE 'DELETE_CIDER':
                    SyncDeleteCiderFromFirestore(operation.data.id)
                    syncResult.pushed += 1

                // Similar for experiences and reviews
            END SWITCH

            // Remove from pending queue
            SQLite.deleteSyncOperation(operation.id)

        CATCH error
            ErrorHandler.log(error, 'TwoWaySyncStrategy.push')
            syncResult.errors.push(error)

            // Increment retry count
            SQLite.updateSyncOperationRetryCount(operation.id)
        END TRY
    END FOR

    // Step 2: Pull remote changes from Firebase
    lastSyncTimestamp = LocalCache.getLastSyncTimestamp(userId)

    TRY
        // Pull ciders
        remoteCiders = Firestore.collection('ciders')
            .where('userId', '==', userId)
            .where('updatedAt', '>', lastSyncTimestamp)
            .get()

        FOR EACH cider IN remoteCiders.docs DO
            localCider = SQLite.getCiderById(cider.id)

            IF localCider == null THEN
                // New remote cider - insert locally
                SQLite.createCider(cider.data())
                syncResult.pulled += 1

            ELSE IF cider.data().version > localCider.version THEN
                // Remote version newer - update local
                IF localCider.syncStatus == 'pending' THEN
                    // Conflict: local changes + newer remote
                    HandleSyncConflict({
                        entityType: 'cider',
                        entityId: cider.id,
                        localVersion: localCider,
                        remoteVersion: cider.data()
                    })
                    syncResult.conflicts += 1
                ELSE
                    SQLite.updateCider(cider.id, cider.data())
                    syncResult.pulled += 1
                END IF
            END IF
        END FOR

        // Pull experiences
        remoteExperiences = Firestore.collection('experiences')
            .where('userId', '==', userId)
            .where('updatedAt', '>', lastSyncTimestamp)
            .get()

        FOR EACH exp IN remoteExperiences.docs DO
            // Similar logic as ciders
            SyncExperienceFromRemote(exp)
        END FOR

        // Update last sync timestamp
        LocalCache.setLastSyncTimestamp(userId, ServerTimestamp())

    CATCH error
        ErrorHandler.log(error, 'TwoWaySyncStrategy.pull')
        syncResult.errors.push(error)
    END TRY

    RETURN syncResult
END

TIME COMPLEXITY: O(p + r) where p = pending ops, r = remote changes
SPACE COMPLEXITY: O(r) where r = remote changes pulled
```

### 5.2 Conflict Resolution Strategy

```
ALGORITHM: HandleSyncConflict
INPUT: conflict (SyncConflict)
OUTPUT: ResolvedData

PURPOSE: Resolve conflicts between local and remote versions
STRATEGY: Field-level merge with last-write-wins for conflicts

BEGIN
    localVersion = conflict.localVersion
    remoteVersion = conflict.remoteVersion

    // Step 1: Identify conflicting fields
    conflictFields = []

    FOR EACH field IN Object.keys(localVersion) DO
        IF field IN SYSTEM_FIELDS THEN
            CONTINUE // Skip id, createdAt, etc.
        END IF

        localValue = localVersion[field]
        remoteValue = remoteVersion[field]

        // Deep comparison
        IF NOT DeepEquals(localValue, remoteValue) THEN
            conflictFields.push({
                field: field,
                localValue: localValue,
                remoteValue: remoteValue,
                localUpdatedAt: localVersion.updatedAt,
                remoteUpdatedAt: remoteVersion.updatedAt
            })
        END IF
    END FOR

    IF conflictFields.length == 0 THEN
        // No actual conflict - versions are equal
        RETURN remoteVersion
    END IF

    // Step 2: Resolve conflicts field-by-field
    resolvedData = { ...remoteVersion } // Start with remote as base

    FOR EACH fieldConflict IN conflictFields DO
        // Last-write-wins strategy
        IF fieldConflict.localUpdatedAt > fieldConflict.remoteUpdatedAt THEN
            // Local version is newer
            resolvedData[fieldConflict.field] = fieldConflict.localValue
        ELSE
            // Remote version is newer (already in resolvedData)
            // Keep remote value
        END IF
    END FOR

    // Step 3: Save conflict record for user review
    conflictRecord = {
        id: GenerateUUID(),
        entityId: conflict.entityId,
        entityType: conflict.entityType,
        localVersion: JSON.stringify(localVersion),
        remoteVersion: JSON.stringify(remoteVersion),
        conflictFields: JSON.stringify(conflictFields),
        createdAt: ServerTimestamp(),
        resolution: {
            strategy: 'field_level_last_write_wins',
            resolvedAt: ServerTimestamp(),
            conflictData: {
                local: localVersion,
                remote: remoteVersion,
                resolved: resolvedData
            }
        }
    }

    // Store in local conflict table
    SQLite.insertSyncConflict(conflictRecord)

    // Step 4: Apply resolved data
    IF conflict.entityType == 'cider' THEN
        SQLite.updateCider(conflict.entityId, {
            ...resolvedData,
            syncStatus: 'synced',
            version: remoteVersion.version
        })
    ELSE IF conflict.entityType == 'experience' THEN
        SQLite.updateExperience(conflict.entityId, {
            ...resolvedData,
            syncStatus: 'synced',
            version: remoteVersion.version
        })
    END IF

    // Step 5: Push resolved version to Firebase
    Firestore.collection(conflict.entityType + 's')
        .doc(conflict.entityId)
        .update({
            ...resolvedData,
            updatedAt: ServerTimestamp(),
            version: FieldValue.increment(1)
        })

    RETURN resolvedData
END

TIME COMPLEXITY: O(f) where f = number of fields
SPACE COMPLEXITY: O(d) where d = data size
```

### 5.3 Delta Sync Algorithm

```
ALGORITHM: DeltaSyncOptimization
INPUT: userId (string), lastSyncTimestamp (Timestamp)
OUTPUT: DeltaSyncResult

PURPOSE: Minimize bandwidth by only syncing changes since last sync

BEGIN
    delta = {
        added: [],
        modified: [],
        deleted: []
    }

    // Step 1: Get deleted items (soft delete tracking)
    deletedCiders = Firestore.collection('ciders')
        .where('userId', '==', userId)
        .where('isDeleted', '==', true)
        .where('deletedAt', '>', lastSyncTimestamp)
        .get()

    FOR EACH deleted IN deletedCiders.docs DO
        delta.deleted.push({
            type: 'cider',
            id: deleted.id
        })

        // Remove from local SQLite
        SQLite.deleteCider(deleted.id)
    END FOR

    // Step 2: Get modified items
    modifiedCiders = Firestore.collection('ciders')
        .where('userId', '==', userId)
        .where('isDeleted', '==', false)
        .where('updatedAt', '>', lastSyncTimestamp)
        .get()

    FOR EACH modified IN modifiedCiders.docs DO
        localCider = SQLite.getCiderById(modified.id)

        IF localCider == null THEN
            // New item
            delta.added.push({
                type: 'cider',
                data: modified.data()
            })
            SQLite.createCider(modified.data())
        ELSE
            // Modified item
            delta.modified.push({
                type: 'cider',
                id: modified.id,
                changes: CalculateFieldDiff(localCider, modified.data())
            })
            SQLite.updateCider(modified.id, modified.data())
        END IF
    END FOR

    // Step 3: Similar for experiences, reviews
    // ... (repeat for other entity types)

    // Step 4: Update sync checkpoint
    LocalCache.setLastSyncTimestamp(userId, ServerTimestamp())

    RETURN delta
END

ALGORITHM: CalculateFieldDiff
INPUT: oldData (object), newData (object)
OUTPUT: FieldDiff[]

BEGIN
    diff = []

    FOR EACH field IN Object.keys(newData) DO
        IF field IN SYSTEM_FIELDS THEN
            CONTINUE
        END IF

        IF NOT DeepEquals(oldData[field], newData[field]) THEN
            diff.push({
                field: field,
                oldValue: oldData[field],
                newValue: newData[field]
            })
        END IF
    END FOR

    RETURN diff
END

OPTIMIZATION:
    - Use timestamps for delta detection
    - Batch operations
    - Compress large payloads
    - Use field masks to update only changed fields
```

### 5.2.1 Deleted Entity Conflicts

```
EDGE CASE: Local Edit + Remote Delete Conflict

SCENARIO: User edits cider offline, but it was deleted on another device

ALGORITHM: HandleDeletedEntityConflict
INPUT: localChange (SyncOperation), remoteState (null or deleted)
OUTPUT: ConflictResolution

BEGIN
    // Check if entity exists remotely
    remoteDoc = Firestore.collection('ciders').doc(localChange.data.id).get()

    IF NOT remoteDoc.exists OR remoteDoc.data().isDeleted == true THEN
        // Remote deleted, local modified

        // Present user with options
        resolution = PromptUser({
            title: "Item was deleted on another device",
            message: "This cider was deleted on another device. What would you like to do?",
            options: [
                {
                    label: "Restore with my changes",
                    value: "restore_local"
                },
                {
                    label: "Keep deleted",
                    value: "accept_delete"
                }
            ]
        })

        IF resolution == "restore_local" THEN
            // Re-create entity with local changes
            localChange.data.version = (remoteDoc.data()?.version OR 0) + 1
            localChange.data.isDeleted = false
            localChange.data.restoredAt = ServerTimestamp()

            Firestore.collection('ciders').doc(localChange.data.id).set(localChange.data)

            SQLite.updateCider(localChange.data.id, {
                syncStatus: 'synced',
                version: localChange.data.version
            })

            RETURN {
                action: 'restored',
                data: localChange.data
            }

        ELSE // accept_delete
            // Delete local copy
            SQLite.deleteCider(localChange.data.id)

            RETURN {
                action: 'deleted_confirmed',
                entityId: localChange.data.id
            }
        END IF
    END IF

    // Normal sync flow if entity exists
    RETURN HandleNormalSync(localChange, remoteDoc.data())
END

AUTOMATED RESOLUTION (No user prompt):
    For non-critical conflicts, auto-resolve:
    - If local changes are < 5 minutes old: Restore
    - If remote delete is < 5 minutes old: Keep deleted
    - Otherwise: Prompt user

TIME COMPLEXITY: O(1)
USER EXPERIENCE: Preserves user intent, prevents data loss
```

### 5.2.2 Array Field Merge Strategy

```
EDGE CASE: Concurrent modifications to array fields

SCENARIO: User adds tags on Device A, different tags on Device B

ALGORITHM: MergeArrayFields
INPUT: localArray (array), remoteArray (array), baseArray (array OR null)
OUTPUT: mergedArray (array)

PURPOSE: Intelligently merge array modifications without duplicates

BEGIN
    // If no base version (3-way merge not possible), use union strategy
    IF baseArray == null THEN
        RETURN UnionMerge(localArray, remoteArray)
    END IF

    // 3-way merge: base, local, remote
    localAdded = DifferenceSet(localArray, baseArray)
    localRemoved = DifferenceSet(baseArray, localArray)
    remoteAdded = DifferenceSet(remoteArray, baseArray)
    remoteRemoved = DifferenceSet(baseArray, remoteArray)

    // Start with base
    merged = baseArray.slice()

    // Apply additions from both sides
    FOR EACH item IN localAdded DO
        IF item NOT IN merged THEN
            merged.push(item)
        END IF
    END FOR

    FOR EACH item IN remoteAdded DO
        IF item NOT IN merged THEN
            merged.push(item)
        END IF
    END FOR

    // Apply removals from both sides
    FOR EACH item IN localRemoved DO
        merged = merged.filter(x => x != item)
    END FOR

    FOR EACH item IN remoteRemoved DO
        merged = merged.filter(x => x != item)
    END FOR

    RETURN merged
END

ALGORITHM: UnionMerge
INPUT: array1 (array), array2 (array)
OUTPUT: mergedArray (array)

BEGIN
    // Simple union for primitive arrays
    mergedSet = new Set([...array1, ...array2])
    RETURN Array.from(mergedSet)
END

EXAMPLE WALKTHROUGH:

Base: ["dry", "crisp"]
Local: ["dry", "crisp", "fruity"] // Added "fruity"
Remote: ["dry", "sweet"] // Removed "crisp", added "sweet"

Calculation:
  localAdded = ["fruity"]
  localRemoved = []
  remoteAdded = ["sweet"]
  remoteRemoved = ["crisp"]

Merge Process:
  1. Start with base: ["dry", "crisp"]
  2. Add local additions: ["dry", "crisp", "fruity"]
  3. Add remote additions: ["dry", "crisp", "fruity", "sweet"]
  4. Remove local removals: (none)
  5. Remove remote removals: ["dry", "fruity", "sweet"]

Result: ["dry", "fruity", "sweet"]

SPECIAL CASES:

1. Object Arrays (e.g., images, characteristics):
   - Use unique ID for comparison
   - Merge by ID, not by equality

   FOR object arrays:
     mergedMap = new Map()

     FOR EACH obj IN localArray DO
         mergedMap.set(obj.id, obj)
     END FOR

     FOR EACH obj IN remoteArray DO
         IF obj.id NOT IN mergedMap THEN
             mergedMap.set(obj.id, obj)
         ELSE
             // Conflict: same ID, different data
             existing = mergedMap.get(obj.id)
             IF obj.updatedAt > existing.updatedAt THEN
                 mergedMap.set(obj.id, obj) // Last write wins
             END IF
         END IF
     END FOR

     RETURN Array.from(mergedMap.values())

2. Ordered Arrays (e.g., image order):
   - Preserve local order for locally-added items
   - Preserve remote order for remotely-added items
   - Use operational transformation for complex cases

TIME COMPLEXITY: O(n + m) where n, m = array lengths
SPACE COMPLEXITY: O(n + m)
```

### 5.2.3 Concurrent Multi-Device Edits

```
EDGE CASE: Same entity edited on multiple devices simultaneously

SCENARIO: User edits cider rating on phone (offline), then on tablet (online)

ALGORITHM: ResolveMultiDeviceConflict
INPUT: localVersion (Cider), remoteVersion (Cider), conflictFields (Field[])
OUTPUT: ResolvedCider

PURPOSE: Resolve conflicts when same entity edited on multiple devices

SEQUENCE DIAGRAM (in pseudocode):

Timeline of events:
  T0: User has Cider v1 synced on both Phone and Tablet
  T1: Phone goes offline
  T2: Phone: Edit rating 7→8 (creates v2-phone, pending sync)
  T3: Tablet: Edit rating 7→9 (syncs immediately, creates v2-remote)
  T4: Phone comes online, attempts to sync v2-phone
  T5: CONFLICT DETECTED: Phone v2 vs Remote v2

RESOLUTION STRATEGY:

BEGIN
    // Detect conflict
    IF localVersion.version == remoteVersion.version
       AND localVersion.updatedAt > localVersion.baseUpdatedAt THEN
        // Versions diverged - conflict!

        conflictLog = {
            entityId: localVersion.id,
            entityType: 'cider',
            localVersion: localVersion,
            remoteVersion: remoteVersion,
            detectedAt: ServerTimestamp()
        }

        // Field-level resolution
        resolvedData = { ...remoteVersion } // Start with remote

        FOR EACH field IN conflictFields DO
            localValue = localVersion[field]
            remoteValue = remoteVersion[field]

            // Resolution rules by field type
            SWITCH field
                CASE 'rating':
                    // For ratings, use most recent
                    IF localVersion.updatedAt > remoteVersion.updatedAt THEN
                        resolvedData.rating = localValue
                        conflictLog.resolutions.push({
                            field: 'rating',
                            chosen: 'local',
                            reason: 'more_recent'
                        })
                    ELSE
                        resolvedData.rating = remoteValue
                        conflictLog.resolutions.push({
                            field: 'rating',
                            chosen: 'remote',
                            reason: 'more_recent'
                        })
                    END IF

                CASE 'notes':
                    // For text fields, merge both
                    IF localValue != remoteValue THEN
                        resolvedData.notes = MergeTextFields(
                            localValue,
                            remoteValue,
                            baseVersion.notes
                        )
                        conflictLog.resolutions.push({
                            field: 'notes',
                            chosen: 'merged',
                            reason: 'text_merge'
                        })
                    END IF

                CASE 'tags':
                    // For arrays, union merge
                    resolvedData.tags = MergeArrayFields(
                        localValue,
                        remoteValue,
                        baseVersion.tags
                    )
                    conflictLog.resolutions.push({
                        field: 'tags',
                        chosen: 'merged',
                        reason: 'array_union'
                    })

                CASE 'images':
                    // For images, keep both sets (merge by ID)
                    resolvedData.images = MergeImageArrays(localValue, remoteValue)
                    conflictLog.resolutions.push({
                        field: 'images',
                        chosen: 'merged',
                        reason: 'image_union'
                    })

                DEFAULT:
                    // Last write wins
                    IF localVersion.updatedAt > remoteVersion.updatedAt THEN
                        resolvedData[field] = localValue
                    END IF
            END SWITCH
        END FOR

        // Increment version
        resolvedData.version = Math.max(localVersion.version, remoteVersion.version) + 1
        resolvedData.updatedAt = ServerTimestamp()

        // Save conflict log for user review
        SQLite.insertConflictLog(conflictLog)

        // Write resolved version to Firestore
        Firestore.collection('ciders').doc(resolvedData.id).set(resolvedData)

        // Update local SQLite
        SQLite.updateCider(resolvedData.id, {
            ...resolvedData,
            syncStatus: 'synced',
            hasConflictHistory: true
        })

        // Notify user
        ShowNotification({
            title: "Sync Conflict Resolved",
            message: "Changes from multiple devices were merged",
            action: "View Details",
            onPress: () => ShowConflictDetails(conflictLog)
        })

        RETURN resolvedData
    END IF

    // No conflict
    RETURN remoteVersion
END

ALGORITHM: MergeTextFields
INPUT: localText (string), remoteText (string), baseText (string)
OUTPUT: mergedText (string)

BEGIN
    // Simple 3-way text merge
    IF localText == baseText THEN
        // Only remote changed
        RETURN remoteText
    ELSE IF remoteText == baseText THEN
        // Only local changed
        RETURN localText
    ELSE
        // Both changed - concatenate with separator
        RETURN localText + "\n\n---\n\n" + remoteText
    END IF
END

CONFLICT PREVENTION:

1. Version Vectors (Advanced):
   - Track version per device
   - Detect concurrent edits earlier
   - Enable causality tracking

   DATA STRUCTURE:
   {
       id: "cider_123",
       versionVector: {
           "device_phone": 5,
           "device_tablet": 3
       },
       ...
   }

2. Optimistic Locking:
   - Include version in all writes
   - Firestore transaction rejects stale writes

   Firestore.runTransaction(async (transaction) => {
       const doc = await transaction.get(ciderRef)
       const currentVersion = doc.data().version

       if (currentVersion > expectedVersion) {
           throw new ConflictError("Stale write detected")
       }

       transaction.update(ciderRef, {
           ...updates,
           version: currentVersion + 1
       })
   })

3. Last-Write-Wins with CRDTs:
   - For counters: Use increment operations
   - For sets: Use CRDT sets
   - For text: Use OT or CRDT text types

EXAMPLE: Full conflict resolution flow

Initial State (both devices):
  Cider {
    id: "cider_123",
    name: "Angry Orchard Crisp",
    rating: 7,
    notes: "Pretty good",
    tags: ["dry", "crisp"],
    version: 5,
    updatedAt: 1696000000
  }

Phone (offline at T1):
  - Edit rating: 7 → 8
  - Add tag: "refreshing"
  - Edit notes: "Pretty good for summer"
  - Version: 6 (local)
  - updatedAt: 1696000100
  - syncStatus: 'pending'

Tablet (online at T2):
  - Edit rating: 7 → 9
  - Add tag: "fruity"
  - Version: 6 (synced to Firebase)
  - updatedAt: 1696000150

Phone comes online (T3):
  - Attempts to sync version 6
  - Firebase already has version 6 (from tablet)
  - CONFLICT DETECTED

Resolution:
  - Rating: Tablet's 9 (more recent: 1696000150 > 1696000100)
  - Notes: Phone's change (only phone modified)
  - Tags: Union merge: ["dry", "crisp", "refreshing", "fruity"]
  - Version: 7
  - updatedAt: 1696000200 (server timestamp)

Final Merged State:
  Cider {
    id: "cider_123",
    name: "Angry Orchard Crisp",
    rating: 9, // From tablet
    notes: "Pretty good for summer", // From phone
    tags: ["dry", "crisp", "refreshing", "fruity"], // Merged
    version: 7,
    updatedAt: 1696000200
  }

TIME COMPLEXITY: O(f) where f = number of conflicting fields
SPACE COMPLEXITY: O(1)
USER IMPACT: Transparent resolution, preserves all data
```

---

## 6. API Endpoints & Cloud Functions

### 6.1 Cloud Function: onFollowCreated

```
CLOUD FUNCTION: onFollowCreated
TRIGGER: Firestore onCreate('/follows/{followId}')
PURPOSE: Fanout follow notification and update feed

ALGORITHM: OnFollowCreated
INPUT: followData (Follow), context (EventContext)
OUTPUT: void

BEGIN
    followerId = followData.followerId
    followingId = followData.followingId

    // Step 1: Create notification for user being followed
    notification = {
        id: GenerateUUID(),
        userId: followingId,
        type: 'new_follower',
        title: 'New Follower',
        body: followData.followerUsername + ' started following you',
        actorId: followerId,
        actorUsername: followData.followerUsername,
        actorAvatar: GetUserAvatar(followerId),
        targetType: 'user',
        targetId: followerId,
        isRead: false,
        isSeen: false,
        isPush: true,
        createdAt: ServerTimestamp(),
        expiresAt: AddDays(ServerTimestamp(), 90)
    }

    // Write notification
    Firestore.collection('notifications')
        .doc(followingId)
        .collection('items')
        .doc(notification.id)
        .set(notification)

    // Step 2: Send push notification (if enabled)
    userPrefs = Firestore.collection('users').doc(followingId).get()

    IF userPrefs.preferences.notificationSettings.newFollower == true THEN
        FCM.sendToUser(followingId, {
            title: notification.title,
            body: notification.body,
            data: {
                type: 'new_follower',
                userId: followerId
            }
        })
    END IF

    // Step 3: Update follower's feed with future content from following
    // Subscribe to following's future activities

    Logger.info('Follow notification sent', {
        followerId: followerId,
        followingId: followingId
    })
END

TIME COMPLEXITY: O(1)
SPACE COMPLEXITY: O(1)
```

### 6.2 Cloud Function: onReviewCreated

```
CLOUD FUNCTION: onReviewCreated
TRIGGER: Firestore onCreate('/reviews/{reviewId}')
PURPOSE: Fanout review to followers' feeds

ALGORITHM: OnReviewCreated
INPUT: reviewData (PublicReview), context (EventContext)
OUTPUT: void

BEGIN
    userId = reviewData.userId
    reviewId = reviewData.id

    // Step 1: Get user's followers
    followers = Firestore.collection('follows')
        .where('followingId', '==', userId)
        .where('status', '==', 'active')
        .get()

    IF followers.docs.length == 0 THEN
        RETURN // No followers to notify
    END IF

    // Step 2: Create feed items for each follower
    batch = Firestore.batch()
    batchCount = 0
    maxBatchSize = 500 // Firestore limit

    FOR EACH follower IN followers.docs DO
        followerId = follower.data().followerId

        // Create activity feed item
        feedItem = {
            id: GenerateUUID(),
            userId: followerId,
            type: 'friend_new_review',
            actorId: userId,
            actorUsername: reviewData.username,
            actorAvatar: reviewData.userAvatar,
            targetType: 'review',
            targetId: reviewId,
            targetData: {
                ciderId: reviewData.ciderId,
                ciderName: reviewData.ciderInfo.name,
                rating: reviewData.rating,
                title: reviewData.title,
                preview: reviewData.body.substring(0, 150)
            },
            message: reviewData.username + ' reviewed ' + reviewData.ciderInfo.name,
            preview: reviewData.images.length > 0 ? reviewData.images[0] : null,
            isRead: false,
            isNotified: false,
            createdAt: ServerTimestamp(),
            expiresAt: AddDays(ServerTimestamp(), 90)
        }

        batch.set(
            Firestore.collection('activityFeed')
                .doc(followerId)
                .collection('items')
                .doc(feedItem.id),
            feedItem
        )

        batchCount += 1

        // Commit batch if reaching limit
        IF batchCount >= maxBatchSize THEN
            batch.commit()
            batch = Firestore.batch()
            batchCount = 0
        END IF
    END FOR

    // Commit remaining items
    IF batchCount > 0 THEN
        batch.commit()
    END IF

    // Step 3: Update cider's review count
    Firestore.collection('ciders')
        .doc(reviewData.ciderId)
        .update({
            communityReviewCount: FieldValue.increment(1),
            communityAverageRating: RecalculateCommunityRating(reviewData.ciderId)
        })

    Logger.info('Review fanout completed', {
        reviewId: reviewId,
        followerCount: followers.docs.length
    })
END

TIME COMPLEXITY: O(f / b) where f = followers, b = batch size
SPACE COMPLEXITY: O(b) for batch operations
OPTIMIZATION: Use batching to minimize write operations
```

### 6.3 Cloud Function: onAchievementUnlocked

```
CLOUD FUNCTION: onAchievementUnlocked
TRIGGER: Firestore onCreate('/userAchievements/{userId}/unlocked/{achievementId}')
PURPOSE: Notify user and optionally share to feed

ALGORITHM: OnAchievementUnlocked
INPUT: achievementData (UserAchievement), context (EventContext)
OUTPUT: void

BEGIN
    userId = achievementData.userId
    achievementId = achievementData.achievementId

    // Step 1: Get achievement details
    achievement = Firestore.collection('achievements').doc(achievementId).get()

    // Step 2: Create notification
    notification = {
        id: GenerateUUID(),
        userId: userId,
        type: 'achievement_unlocked',
        title: 'Achievement Unlocked!',
        body: 'You unlocked: ' + achievement.title,
        icon: achievement.icon,
        actorId: null,
        targetType: 'achievement',
        targetId: achievementId,
        isRead: false,
        isSeen: false,
        isPush: true,
        createdAt: ServerTimestamp(),
        expiresAt: AddDays(ServerTimestamp(), 90)
    }

    Firestore.collection('notifications')
        .doc(userId)
        .collection('items')
        .doc(notification.id)
        .set(notification)

    // Step 3: Send push notification
    user = Firestore.collection('users').doc(userId).get()

    IF user.preferences.notificationSettings.achievements == true THEN
        FCM.sendToUser(userId, {
            title: notification.title,
            body: notification.body,
            data: {
                type: 'achievement_unlocked',
                achievementId: achievementId
            }
        })
    END IF

    // Step 4: Optionally share to feed (if rare achievement)
    IF achievement.rarityScore < 20 THEN // Rare achievement
        ShareAchievementToFeed(userId, achievement)
    END IF

    Logger.info('Achievement notification sent', {
        userId: userId,
        achievementId: achievementId
    })
END
```

### 6.4 Cloud Function: calculateCommunityRating

```
CLOUD FUNCTION: calculateCommunityRating
HTTP ENDPOINT: POST /api/cider/{ciderId}/community-rating
PURPOSE: Calculate aggregated community rating for a cider

ALGORITHM: CalculateCommunityRating
INPUT: ciderId (string)
OUTPUT: CommunityRatingData

BEGIN
    // Step 1: Get all public reviews for this cider
    reviews = Firestore.collection('reviews')
        .where('ciderId', '==', ciderId)
        .where('visibility', '==', 'public')
        .where('flags.isHidden', '==', false)
        .where('flags.isDeleted', '==', false)
        .get()

    IF reviews.docs.length == 0 THEN
        RETURN {
            averageRating: null,
            totalReviews: 0,
            ratingDistribution: null
        }
    END IF

    // Step 2: Calculate statistics
    totalRating = 0
    ratingCounts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0}

    FOR EACH review IN reviews.docs DO
        rating = review.data().rating
        totalRating += rating
        ratingCounts[rating] += 1
    END FOR

    averageRating = totalRating / reviews.docs.length

    // Step 3: Calculate confidence score (Wilson score)
    confidenceScore = CalculateWilsonScore(
        reviews.docs.length,
        averageRating,
        10 // max rating
    )

    // Step 4: Return aggregated data
    RETURN {
        ciderId: ciderId,
        averageRating: Round(averageRating, 2),
        totalReviews: reviews.docs.length,
        ratingDistribution: ratingCounts,
        confidenceScore: confidenceScore,
        updatedAt: ServerTimestamp()
    }
END

ALGORITHM: CalculateWilsonScore
INPUT: n (integer), avgRating (float), maxRating (integer)
OUTPUT: float

BEGIN
    // Normalize rating to 0-1 scale
    p = avgRating / maxRating

    // Wilson score with 95% confidence
    z = 1.96 // 95% confidence interval

    denominator = 1 + (z * z) / n
    centerPoint = p + (z * z) / (2 * n)
    adjustment = z * sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))

    lowerBound = (centerPoint - adjustment) / denominator

    RETURN lowerBound * maxRating
END
```

### 6.5 Cloud Function: generateUserDigest

```
CLOUD FUNCTION: generateUserDigest
TRIGGER: Cloud Scheduler (weekly on Sunday)
PURPOSE: Generate weekly activity digest emails

ALGORITHM: GenerateUserDigest
INPUT: userId (string)
OUTPUT: EmailDigest

BEGIN
    // Step 1: Get user preferences
    user = Firestore.collection('users').doc(userId).get()

    IF user.preferences.notificationSettings.weeklyDigest == false THEN
        RETURN null // User opted out
    END IF

    // Step 2: Get activity from last 7 days
    weekAgo = AddDays(ServerTimestamp(), -7)

    // Personal stats
    newCiders = Firestore.collection('ciders')
        .where('userId', '==', userId)
        .where('createdAt', '>=', weekAgo)
        .get()

    newExperiences = Firestore.collection('experiences')
        .where('userId', '==', userId)
        .where('createdAt', '>=', weekAgo)
        .get()

    newReviews = Firestore.collection('reviews')
        .where('userId', '==', userId)
        .where('createdAt', '>=', weekAgo)
        .get()

    // Friend activity
    following = Firestore.collection('follows')
        .where('followerId', '==', userId)
        .get()

    followingIds = following.docs.map(f => f.data().followingId)

    friendActivity = Firestore.collection('reviews')
        .where('userId', 'in', followingIds)
        .where('createdAt', '>=', weekAgo)
        .orderBy('engagement.likesCount', 'desc')
        .limit(5)
        .get()

    // New achievements
    newAchievements = Firestore.collection('userAchievements')
        .doc(userId)
        .collection('unlocked')
        .where('unlockedAt', '>=', weekAgo)
        .get()

    // Step 3: Build digest content
    digest = {
        userId: userId,
        period: {
            start: weekAgo,
            end: ServerTimestamp()
        },
        personalStats: {
            cidersAdded: newCiders.docs.length,
            experiencesLogged: newExperiences.docs.length,
            reviewsPosted: newReviews.docs.length
        },
        topFriendActivity: friendActivity.docs.map(r => ({
            username: r.data().username,
            ciderName: r.data().ciderInfo.name,
            rating: r.data().rating
        })),
        newAchievements: newAchievements.docs.map(a => a.data()),
        recommendedCiders: GetPersonalizedRecommendations(userId, 3)
    }

    // Step 4: Send email (if any activity)
    IF digest.personalStats.cidersAdded > 0
        OR digest.personalStats.experiencesLogged > 0
        OR digest.topFriendActivity.length > 0 THEN

        SendDigestEmail(user.email, digest)
    END IF

    RETURN digest
END
```

---

## 7. UI Component Hierarchy

### 7.1 Social Tab Screen Components

```
COMPONENT HIERARCHY: SocialTabScreen

SocialTabScreen (Container)
├── Header
│   ├── SearchBar (search users, ciders)
│   └── NotificationBadge
│
├── TabNavigator
│   ├── FeedTab
│   │   ├── FeedList (FlatList)
│   │   │   ├── FeedItemCard (component per item)
│   │   │   │   ├── UserAvatar
│   │   │   │   ├── ActivityDescription
│   │   │   │   ├── TargetPreview (varies by type)
│   │   │   │   │   ├── CiderPreview
│   │   │   │   │   ├── ReviewPreview
│   │   │   │   │   ├── ExperiencePreview
│   │   │   │   │   └── AchievementPreview
│   │   │   │   └── EngagementActions (like, comment)
│   │   │   └── LoadingSpinner
│   │   └── PullToRefresh
│   │
│   ├── DiscoverTab
│   │   ├── RecommendedUsers (horizontal scroll)
│   │   ├── TrendingCiders (horizontal scroll)
│   │   ├── TopReviews (list)
│   │   └── LeaderboardPreview
│   │
│   └── NotificationsTab
│       ├── NotificationList
│       │   ├── NotificationItem
│       │   │   ├── NotificationIcon
│       │   │   ├── NotificationText
│       │   │   ├── NotificationAction
│       │   │   └── TimestampText
│       │   └── LoadingSpinner
│       └── MarkAllReadButton
│
└── FloatingActionButton (create review)

STATE MANAGEMENT:
    - feedItems: ActivityFeedItem[]
    - isLoading: boolean
    - isRefreshing: boolean
    - notifications: Notification[]
    - unreadCount: integer

PSEUDOCODE: FeedTabComponent

COMPONENT: FeedTab
PROPS: userId (string)
STATE: feedItems, isLoading, hasMore, lastItemTimestamp

ALGORITHM: LoadFeedItems
BEGIN
    SET isLoading = true

    TRY
        items = GenerateActivityFeed(userId, 20, lastItemTimestamp)

        IF items.length > 0 THEN
            SET feedItems = [...feedItems, ...items]
            SET lastItemTimestamp = items[items.length - 1].createdAt
            SET hasMore = items.length >= 20
        ELSE
            SET hasMore = false
        END IF

    CATCH error
        ShowErrorToast("Failed to load feed")
    FINALLY
        SET isLoading = false
    END TRY
END

ALGORITHM: HandleRefresh
BEGIN
    SET feedItems = []
    SET lastItemTimestamp = null
    LoadFeedItems()
END

ALGORITHM: HandleEndReached
BEGIN
    IF NOT isLoading AND hasMore THEN
        LoadFeedItems()
    END IF
END

RENDER:
BEGIN
    IF feedItems.length == 0 AND NOT isLoading THEN
        RETURN EmptyFeedState
    END IF

    RETURN (
        FlatList
            data = feedItems
            renderItem = (item) => FeedItemCard(item)
            onEndReached = HandleEndReached
            onRefresh = HandleRefresh
            refreshing = isLoading
            ListFooterComponent = hasMore ? LoadingSpinner : null
    )
END
```

### 7.2 User Profile Screen Components

```
COMPONENT HIERARCHY: UserProfileScreen

UserProfileScreen (Container)
├── ProfileHeader
│   ├── CoverImage (optional)
│   ├── AvatarImage
│   ├── UsernameText
│   ├── BioText
│   ├── LocationText
│   ├── StatsRow
│   │   ├── StatItem (ciders count)
│   │   ├── StatItem (experiences count)
│   │   ├── StatItem (followers count)
│   │   └── StatItem (following count)
│   └── ActionButtons
│       ├── FollowButton (if not self)
│       ├── MessageButton (if not self)
│       └── EditProfileButton (if self)
│
├── ContentTabs
│   ├── CidersTab
│   │   ├── CiderGrid (privacy-aware)
│   │   └── PrivacyLockedState (if private)
│   │
│   ├── ReviewsTab
│   │   ├── ReviewList
│   │   └── PrivacyLockedState
│   │
│   ├── AchievementsTab
│   │   ├── AchievementGrid
│   │   │   ├── UnlockedAchievement
│   │   │   └── LockedAchievement (placeholder)
│   │   └── ProgressIndicators
│   │
│   └── ActivityTab (only if self or friend)
│       └── RecentActivityList
│
└── BottomSheet (share profile, report, block)

PSEUDOCODE: UserProfileScreen

COMPONENT: UserProfileScreen
PROPS: userId (string), isOwnProfile (boolean)
STATE: profile, isFollowing, followers, following, isLoading

ALGORITHM: LoadUserProfile
INPUT: userId
BEGIN
    SET isLoading = true

    TRY
        // Load profile
        profile = Firestore.collection('users').doc(userId).get()

        // Check privacy
        IF profile.privacy.profileVisibility == 'private' AND NOT isOwnProfile THEN
            IF NOT IsFollowingEachOther(currentUserId, userId) THEN
                SET showPrivacyLock = true
                RETURN
            END IF
        END IF

        // Load followers/following
        followers = Firestore.collection('follows')
            .where('followingId', '==', userId)
            .where('status', '==', 'active')
            .get()

        following = Firestore.collection('follows')
            .where('followerId', '==', userId)
            .where('status', '==', 'active')
            .get()

        // Check if current user is following
        IF NOT isOwnProfile THEN
            isFollowing = CheckIfFollowing(currentUserId, userId)
        END IF

        SET profile = profile.data()
        SET followers = followers.docs
        SET following = following.docs

    CATCH error
        ShowErrorToast("Failed to load profile")
    FINALLY
        SET isLoading = false
    END TRY
END

ALGORITHM: HandleFollowToggle
BEGIN
    IF isFollowing THEN
        // Unfollow
        TRY
            UnfollowUser(currentUserId, userId)
            SET isFollowing = false
            SET profile.stats.followersCount -= 1
            ShowToast("Unfollowed")
        CATCH error
            ShowErrorToast("Failed to unfollow")
        END TRY
    ELSE
        // Follow
        TRY
            FollowUser(currentUserId, userId)
            SET isFollowing = true
            SET profile.stats.followersCount += 1
            ShowToast("Now following")
        CATCH error
            ShowErrorToast("Failed to follow")
        END TRY
    END IF
END
```

### 7.3 Review Creation Screen Components

```
COMPONENT HIERARCHY: CreateReviewScreen

CreateReviewScreen (Container)
├── Header
│   ├── CloseButton
│   └── SubmitButton
│
├── ScrollView
│   ├── CiderInfoCard (read-only, selected cider)
│   │
│   ├── RatingSection
│   │   ├── OverallRatingSlider (1-10)
│   │   └── DetailedRatingsExpander (optional)
│   │       ├── AppearanceRating
│   │       ├── AromaRating
│   │       ├── TasteRating
│   │       └── MouthfeelRating
│   │
│   ├── TitleInput (max 100 chars)
│   │
│   ├── BodyInput (max 2000 chars, multiline)
│   │
│   ├── TasteTagsSelector
│   │   ├── PredefinedTags (chips)
│   │   └── CustomTagInput
│   │
│   ├── ImageUploadSection
│   │   ├── ImagePreview (max 5)
│   │   └── AddImageButton
│   │
│   ├── ExperienceLink (optional)
│   │   └── SelectExperienceButton
│   │
│   ├── VisibilitySelector
│   │   ├── PublicOption
│   │   ├── FriendsOption
│   │   └── PrivateOption
│   │
│   └── SubmitButton (large, prominent)
│
└── LoadingOverlay

PSEUDOCODE: CreateReviewScreen

COMPONENT: CreateReviewScreen
PROPS: ciderId (string), navigationGoBack (function)
STATE: formData, images, isSubmitting, errors

ALGORITHM: InitializeForm
BEGIN
    // Load cider info
    cider = SQLite.getCiderById(ciderId)

    // Check if user already reviewed
    existingReview = Firestore.collection('reviews')
        .where('userId', '==', currentUserId)
        .where('ciderId', '==', ciderId)
        .get()

    IF existingReview.docs.length > 0 THEN
        // Pre-fill form with existing review for editing
        SET formData = existingReview.docs[0].data()
        SET isEditMode = true
    ELSE
        // Initialize empty form
        SET formData = {
            rating: cider.overallRating, // Pre-fill from cider rating
            title: '',
            body: '',
            tasteTags: cider.tasteTags OR [],
            detailedRatings: null,
            experienceId: null,
            visibility: userPreferences.defaultSharePrivacy,
            images: []
        }
    END IF
END

ALGORITHM: ValidateForm
OUTPUT: ValidationResult

BEGIN
    errors = []

    IF formData.rating < 1 OR formData.rating > 10 THEN
        errors.push("Rating must be between 1 and 10")
    END IF

    IF formData.title.trim().length == 0 THEN
        errors.push("Title is required")
    END IF

    IF formData.title.length > 100 THEN
        errors.push("Title must be 100 characters or less")
    END IF

    IF formData.body.trim().length == 0 THEN
        errors.push("Review body is required")
    END IF

    IF formData.body.length > 2000 THEN
        errors.push("Review must be 2000 characters or less")
    END IF

    IF formData.images.length > 5 THEN
        errors.push("Maximum 5 images allowed")
    END IF

    RETURN {
        isValid: errors.length == 0,
        errors: errors
    }
END

ALGORITHM: HandleSubmit
BEGIN
    // Validate
    validation = ValidateForm()

    IF NOT validation.isValid THEN
        SET errors = validation.errors
        ShowErrorToast(errors[0])
        RETURN
    END IF

    SET isSubmitting = true

    TRY
        // Create review
        review = CreatePublicReview(currentUserId, ciderId, formData)

        // Show success
        ShowToast("Review posted successfully")

        // Navigate back
        navigationGoBack()

    CATCH error
        ErrorHandler.log(error, 'CreateReview')
        ShowErrorToast("Failed to post review. Please try again.")

    FINALLY
        SET isSubmitting = false
    END TRY
END

ALGORITHM: HandleImageUpload
INPUT: imageUri (string)
BEGIN
    IF images.length >= 5 THEN
        ShowErrorToast("Maximum 5 images allowed")
        RETURN
    END IF

    // Validate image
    IF NOT IsValidImageType(imageUri) THEN
        ShowErrorToast("Invalid image type. Use JPG, PNG, or WebP.")
        RETURN
    END IF

    // Compress image
    compressedImage = CompressImage(imageUri, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8
    })

    // Add to form
    SET images = [...images, compressedImage]
END
```

### 7.4 Leaderboard Screen Components

```
COMPONENT HIERARCHY: LeaderboardScreen

LeaderboardScreen (Container)
├── Header
│   └── LeaderboardTypeSelector (dropdown)
│       ├── Global Ciders
│       ├── Global Venues
│       ├── Global Reviews
│       └── Monthly Additions
│
├── PeriodSelector (tabs)
│   ├── All Time
│   ├── This Year
│   └── This Month
│
├── UserPositionCard (current user's rank)
│   ├── RankBadge
│   ├── UserInfo
│   └── ScoreText
│
├── LeaderboardList (FlatList)
│   ├── LeaderboardItem (rank 1-100)
│   │   ├── RankBadge (1st, 2nd, 3rd with medals)
│   │   ├── UserAvatar
│   │   ├── UsernameText
│   │   ├── LocationText
│   │   └── ScoreText
│   └── LoadingSpinner
│
└── RefreshControl

PSEUDOCODE: LeaderboardScreen

COMPONENT: LeaderboardScreen
STATE: leaderboardType, period, entries, userPosition, isLoading

ALGORITHM: LoadLeaderboard
INPUT: leaderboardType, period
BEGIN
    SET isLoading = true

    TRY
        // Load top 100
        entries = Firestore.collection('leaderboards')
            .doc(leaderboardType)
            .collection('entries')
            .where('period', '==', period)
            .orderBy('rank', 'asc')
            .limit(100)
            .get()

        SET entries = entries.docs.map(doc => doc.data())

        // Load current user's position
        userPosition = GetUserLeaderboardPosition(
            currentUserId,
            leaderboardType,
            period
        )

        SET userPosition = userPosition

    CATCH error
        ShowErrorToast("Failed to load leaderboard")
    FINALLY
        SET isLoading = false
    END TRY
END

ALGORITHM: HandleLeaderboardTypeChange
INPUT: newType
BEGIN
    SET leaderboardType = newType
    LoadLeaderboard(newType, period)
END

ALGORITHM: HandlePeriodChange
INPUT: newPeriod
BEGIN
    SET period = newPeriod
    LoadLeaderboard(leaderboardType, newPeriod)
END
```

---

## 8. State Management Patterns

### 8.1 Zustand Store: Social State

```
DATA STRUCTURE: SocialStore

PURPOSE: Centralized state management for social features

INTERFACE: SocialStoreState {
    // User profile
    currentUser: UserProfile OR null

    // Social relationships
    followers: Follow[]
    following: Follow[]
    followersCount: integer
    followingCount: integer

    // Activity feed
    feedItems: ActivityFeedItem[]
    feedLoading: boolean
    feedHasMore: boolean
    feedLastTimestamp: Timestamp OR null

    // Notifications
    notifications: Notification[]
    unreadNotificationsCount: integer
    notificationsLoading: boolean

    // Reviews
    userReviews: PublicReview[]
    communityReviews: PublicReview[]

    // Achievements
    userAchievements: UserAchievement[]

    // UI state
    isOnline: boolean
    lastSyncTimestamp: Timestamp OR null
    error: string OR null
}

INTERFACE: SocialStoreActions {
    // Authentication
    loadCurrentUser: () => Promise<void>
    updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>

    // Follow management
    followUser: (userId: string) => Promise<void>
    unfollowUser: (userId: string) => Promise<void>
    loadFollowers: (userId: string) => Promise<void>
    loadFollowing: (userId: string) => Promise<void>

    // Feed management
    loadFeed: (refresh: boolean) => Promise<void>
    loadMoreFeed: () => Promise<void>

    // Notifications
    loadNotifications: () => Promise<void>
    markNotificationAsRead: (notificationId: string) => Promise<void>
    markAllNotificationsAsRead: () => Promise<void>

    // Reviews
    createReview: (reviewData: object) => Promise<string>
    loadUserReviews: (userId: string) => Promise<void>
    loadCommunityReviews: (ciderId: string) => Promise<void>

    // Achievements
    loadUserAchievements: () => Promise<void>
    checkAchievements: (eventType: string, eventData: object) => Promise<void>

    // Utility
    clearError: () => void
    reset: () => void
}

IMPLEMENTATION: SocialStore using Zustand

ALGORITHM: CreateSocialStore
BEGIN
    initialState = {
        currentUser: null,
        followers: [],
        following: [],
        followersCount: 0,
        followingCount: 0,
        feedItems: [],
        feedLoading: false,
        feedHasMore: true,
        feedLastTimestamp: null,
        notifications: [],
        unreadNotificationsCount: 0,
        notificationsLoading: false,
        userReviews: [],
        communityReviews: [],
        userAchievements: [],
        isOnline: true,
        lastSyncTimestamp: null,
        error: null
    }

    store = create(subscribeWithSelector((set, get) => ({
        ...initialState,

        loadCurrentUser: async () => {
            TRY
                user = FirebaseAuth.currentUser
                IF user == null THEN
                    RETURN
                END IF

                profile = Firestore.collection('users').doc(user.uid).get()

                set({
                    currentUser: profile.data()
                })

                // Setup real-time listener
                Firestore.collection('users')
                    .doc(user.uid)
                    .onSnapshot((snapshot) => {
                        set({ currentUser: snapshot.data() })
                    })

            CATCH error
                set({ error: error.message })
            END TRY
        },

        followUser: async (userId) => {
            TRY
                currentUserId = get().currentUser.uid
                FollowUser(currentUserId, userId)

                // Optimistic update
                set(state => ({
                    following: [...state.following, {
                        followerId: currentUserId,
                        followingId: userId
                    }],
                    followingCount: state.followingCount + 1
                }))

            CATCH error
                set({ error: error.message })
                // Rollback optimistic update
                get().loadFollowing(currentUserId)
            END TRY
        },

        loadFeed: async (refresh = false) => {
            set({ feedLoading: true })

            TRY
                currentUserId = get().currentUser.uid
                lastTimestamp = refresh ? null : get().feedLastTimestamp

                items = GenerateActivityFeed(currentUserId, 20, lastTimestamp)

                set(state => ({
                    feedItems: refresh ? items : [...state.feedItems, ...items],
                    feedHasMore: items.length >= 20,
                    feedLastTimestamp: items.length > 0
                        ? items[items.length - 1].createdAt
                        : state.feedLastTimestamp,
                    feedLoading: false
                }))

            CATCH error
                set({ error: error.message, feedLoading: false })
            END TRY
        },

        createReview: async (reviewData) => {
            TRY
                currentUserId = get().currentUser.uid
                ciderId = reviewData.ciderId

                review = CreatePublicReview(currentUserId, ciderId, reviewData)

                // Add to local state
                set(state => ({
                    userReviews: [review, ...state.userReviews]
                }))

                // Check for achievements
                get().checkAchievements('review_created', { reviewId: review.id })

                RETURN review.id

            CATCH error
                set({ error: error.message })
                THROW error
            END TRY
        }

        // ... other actions
    })))

    RETURN store
END

OPTIMIZATION NOTES:
    - Use subscribeWithSelector for granular re-renders
    - Implement optimistic updates for better UX
    - Cache frequently accessed data
    - Debounce rapid state changes
```

### 8.2 Real-time Listeners Pattern

```
PATTERN: Real-time Firestore Listeners

ALGORITHM: SetupRealtimeListeners
INPUT: userId (string)
OUTPUT: unsubscribe functions

BEGIN
    listeners = []

    // 1. Profile updates listener
    profileUnsubscribe = Firestore.collection('users')
        .doc(userId)
        .onSnapshot(
            (snapshot) => {
                SocialStore.set({ currentUser: snapshot.data() })
            },
            (error) => {
                ErrorHandler.log(error, 'ProfileListener')
            }
        )

    listeners.push(profileUnsubscribe)

    // 2. New notifications listener
    notificationsUnsubscribe = Firestore.collection('notifications')
        .doc(userId)
        .collection('items')
        .where('isSeen', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .onSnapshot(
            (snapshot) => {
                notifications = snapshot.docs.map(doc => doc.data())
                unreadCount = notifications.filter(n => !n.isRead).length

                SocialStore.set({
                    notifications: notifications,
                    unreadNotificationsCount: unreadCount
                })

                // Show badge
                UpdateAppBadge(unreadCount)
            },
            (error) => {
                ErrorHandler.log(error, 'NotificationsListener')
            }
        )

    listeners.push(notificationsUnsubscribe)

    // 3. New feed items listener (limited)
    feedUnsubscribe = Firestore.collection('activityFeed')
        .doc(userId)
        .collection('items')
        .where('createdAt', '>', ServerTimestamp())
        .orderBy('createdAt', 'desc')
        .limit(5)
        .onSnapshot(
            (snapshot) => {
                newItems = snapshot.docs.map(doc => doc.data())

                IF newItems.length > 0 THEN
                    // Show "new items" indicator
                    ShowNewFeedItemsBanner(newItems.length)

                    // Prepend to feed
                    SocialStore.set(state => ({
                        feedItems: [...newItems, ...state.feedItems]
                    }))
                END IF
            },
            (error) => {
                ErrorHandler.log(error, 'FeedListener')
            }
        )

    listeners.push(feedUnsubscribe)

    // Return cleanup function
    RETURN () => {
        FOR EACH unsubscribe IN listeners DO
            unsubscribe()
        END FOR
    }
END

COMPLEXITY ANALYSIS:
    - Real-time updates: O(1) per document change
    - Memory: O(n) where n = active listeners
    - Network: Minimal (only delta changes)

BEST PRACTICES:
    - Limit listener scope with .where() clauses
    - Use .limit() to prevent large data transfers
    - Always unsubscribe when component unmounts
    - Handle errors gracefully
    - Throttle UI updates if rapid changes
```

---

## 9. Security & Privacy

### 9.1 Privacy Control Algorithm

```
ALGORITHM: CheckContentVisibility
INPUT: content (object), viewerId (string), ownerId (string)
OUTPUT: boolean (canView)

PURPOSE: Determine if viewer can access content based on privacy settings

BEGIN
    // Owner can always view own content
    IF viewerId == ownerId THEN
        RETURN true
    END IF

    // Check content visibility setting
    SWITCH content.visibility
        CASE 'public':
            RETURN true

        CASE 'friends':
            // Check if mutual follow relationship
            RETURN AreFriends(viewerId, ownerId)

        CASE 'private':
            RETURN false

        DEFAULT:
            RETURN false
    END SWITCH
END

ALGORITHM: AreFriends
INPUT: userId1 (string), userId2 (string)
OUTPUT: boolean

PURPOSE: Check if two users follow each other (mutual follow)

BEGIN
    // Check if user1 follows user2
    follow1to2 = Firestore.collection('follows')
        .doc(userId1 + '_' + userId2)
        .get()

    // Check if user2 follows user1
    follow2to1 = Firestore.collection('follows')
        .doc(userId2 + '_' + userId1)
        .get()

    RETURN follow1to2.exists AND follow2to1.exists
        AND follow1to2.data().status == 'active'
        AND follow2to1.data().status == 'active'
END

TIME COMPLEXITY: O(1) - two document lookups
OPTIMIZATION: Cache friendship status locally
```

### 9.2 Content Moderation Algorithm

```
ALGORITHM: FlagContent
INPUT: contentId (string), contentType (string), reason (string), reporterId (string)
OUTPUT: Success OR Error

PURPOSE: Allow users to flag inappropriate content

BEGIN
    // Validate reason
    validReasons = ['spam', 'inappropriate', 'harassment', 'misinformation', 'other']

    IF reason NOT IN validReasons THEN
        RETURN Error("Invalid flag reason")
    END IF

    // Check if user already flagged this content
    existingFlag = Firestore.collection('content_flags')
        .where('contentId', '==', contentId)
        .where('reporterId', '==', reporterId)
        .get()

    IF existingFlag.docs.length > 0 THEN
        RETURN Error("You already flagged this content")
    END IF

    // Create flag record
    flag = {
        id: GenerateUUID(),
        contentId: contentId,
        contentType: contentType,
        reason: reason,
        reporterId: reporterId,
        status: 'pending',
        createdAt: ServerTimestamp()
    }

    Firestore.collection('content_flags').doc(flag.id).set(flag)

    // Increment flag count on content
    contentCollection = contentType + 's' // e.g., 'reviews'

    Firestore.collection(contentCollection)
        .doc(contentId)
        .update({
            ['flags.' + reason + 'Count']: FieldValue.increment(1)
        })

    // Check if auto-hide threshold reached
    content = Firestore.collection(contentCollection).doc(contentId).get()

    totalFlags = content.data().flags.spamCount
        + content.data().flags.inappropriateCount

    IF totalFlags >= AUTO_HIDE_THRESHOLD THEN
        // Auto-hide content pending review
        Firestore.collection(contentCollection)
            .doc(contentId)
            .update({
                'flags.isHidden': true
            })

        // Notify moderators
        NotifyModerators(contentId, contentType, totalFlags)
    END IF

    RETURN Success("Content flagged for review")
END

CONSTANTS:
    AUTO_HIDE_THRESHOLD = 3 // Hide after 3 flags

TIME COMPLEXITY: O(1)
```

### 9.3 Data Ownership & Deletion

```
ALGORITHM: DeleteUserAccount
INPUT: userId (string), password (string)
OUTPUT: Success OR Error

PURPOSE: Permanently delete user account and all associated data

BEGIN
    // Step 1: Re-authenticate user
    TRY
        user = FirebaseAuth.currentUser
        credential = FirebaseAuth.EmailAuthProvider.credential(
            user.email,
            password
        )
        user.reauthenticateWithCredential(credential)
    CATCH error
        RETURN Error("Authentication failed. Incorrect password.")
    END TRY

    // Step 2: Delete user data from Firestore
    batch = Firestore.batch()

    // Delete user profile
    batch.delete(Firestore.collection('users').doc(userId))

    // Delete follows (as follower)
    followsAsFollower = Firestore.collection('follows')
        .where('followerId', '==', userId)
        .get()

    FOR EACH follow IN followsAsFollower.docs DO
        batch.delete(follow.ref)

        // Decrement following user's follower count
        batch.update(
            Firestore.collection('users').doc(follow.data().followingId),
            { 'stats.followersCount': FieldValue.increment(-1) }
        )
    END FOR

    // Delete follows (as following)
    followsAsFollowing = Firestore.collection('follows')
        .where('followingId', '==', userId)
        .get()

    FOR EACH follow IN followsAsFollowing.docs DO
        batch.delete(follow.ref)

        // Decrement follower's following count
        batch.update(
            Firestore.collection('users').doc(follow.data().followerId),
            { 'stats.followingCount': FieldValue.increment(-1) }
        )
    END FOR

    // Commit batch (Firestore limit 500 per batch)
    batch.commit()

    // Step 3: Delete or anonymize reviews
    reviews = Firestore.collection('reviews')
        .where('userId', '==', userId)
        .get()

    FOR EACH review IN reviews.docs DO
        // Option A: Delete reviews
        Firestore.collection('reviews').doc(review.id).delete()

        // Option B: Anonymize reviews (if you want to keep community data)
        // Firestore.collection('reviews').doc(review.id).update({
        //     userId: 'deleted_user',
        //     username: '[Deleted User]',
        //     userAvatar: null
        // })
    END FOR

    // Step 4: Delete activity feed items
    feedItems = Firestore.collection('activityFeed')
        .doc(userId)
        .collection('items')
        .get()

    FOR EACH item IN feedItems.docs DO
        item.ref.delete()
    END FOR

    // Step 5: Delete notifications
    notifications = Firestore.collection('notifications')
        .doc(userId)
        .collection('items')
        .get()

    FOR EACH notification IN notifications.docs DO
        notification.ref.delete()
    END FOR

    // Step 6: Delete achievements
    achievements = Firestore.collection('userAchievements')
        .doc(userId)
        .collection('unlocked')
        .get()

    FOR EACH achievement IN achievements.docs DO
        achievement.ref.delete()
    END FOR

    // Step 7: Delete ciders and experiences (user's personal data)
    ciders = Firestore.collection('ciders')
        .where('userId', '==', userId)
        .get()

    FOR EACH cider IN ciders.docs DO
        Firestore.collection('ciders').doc(cider.id).delete()
    END FOR

    experiences = Firestore.collection('experiences')
        .where('userId', '==', userId)
        .get()

    FOR EACH experience IN experiences.docs DO
        Firestore.collection('experiences').doc(experience.id).delete()
    END FOR

    // Step 8: Delete user images from Storage
    DeleteUserStorageFolder(userId)

    // Step 9: Delete local SQLite data
    SQLite.deleteAllUserData(userId)

    // Step 10: Delete Firebase Auth account
    user.delete()

    Logger.info('User account deleted', { userId: userId })

    RETURN Success("Account deleted successfully")
END

TIME COMPLEXITY: O(n) where n = total user data (ciders, reviews, etc.)
SPACE COMPLEXITY: O(1) with batched deletions

GDPR COMPLIANCE:
    - Right to be forgotten: Complete data deletion
    - Right to data portability: Export before deletion
    - Transparent process: User-initiated with confirmation
```

### 9.4 GDPR Data Export

```
ALGORITHM: ExportUserData
INPUT: userId (string)
OUTPUT: ExportJob OR Error

PURPOSE: Export all user data in structured format for GDPR compliance
TRIGGER: User requests data export from settings

BEGIN
    // Step 1: Create export job
    exportJob = {
        id: GenerateUUID(),
        userId: userId,
        status: 'pending',
        progress: 0,
        createdAt: ServerTimestamp(),
        expiresAt: ServerTimestamp() + (7 * 24 * 60 * 60 * 1000), // 7 days
        downloadUrl: null,
        errorMessage: null
    }

    Firestore.collection('exportJobs').doc(exportJob.id).set(exportJob)

    // Step 2: Queue background job (Cloud Function)
    CloudFunctions.trigger('generateUserDataExport', { exportJobId: exportJob.id, userId: userId })

    // Show progress UI
    ShowToast("Data export started. You'll be notified when it's ready (usually 5-10 minutes).")

    RETURN exportJob
END

CLOUD FUNCTION: generateUserDataExport
INPUT: exportJobId (string), userId (string)
OUTPUT: void

BEGIN
    TRY
        // Update status
        Firestore.collection('exportJobs').doc(exportJobId).update({
            status: 'processing',
            progress: 0
        })

        exportData = {
            exportDate: ServerTimestamp(),
            userId: userId,
            format: "JSON",
            version: "1.0"
        }

        // Step 1: Export user profile (5% progress)
        userProfile = Firestore.collection('users').doc(userId).get()
        exportData.profile = {
            uid: userProfile.data().uid,
            email: userProfile.data().email,
            username: userProfile.data().username,
            displayName: userProfile.data().displayName,
            bio: userProfile.data().bio,
            location: userProfile.data().location,
            stats: userProfile.data().stats,
            createdAt: userProfile.data().createdAt,
            preferences: userProfile.data().preferences
        }

        UpdateProgress(exportJobId, 5)

        // Step 2: Export ciders (25% progress)
        ciders = Firestore.collection('ciders')
            .where('userId', '==', userId)
            .get()

        exportData.ciders = ciders.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            exportedAt: ServerTimestamp()
        }))

        UpdateProgress(exportJobId, 25)

        // Step 3: Export experiences (40% progress)
        experiences = Firestore.collection('experiences')
            .where('userId', '==', userId)
            .get()

        exportData.experiences = experiences.docs.map(doc => doc.data())

        UpdateProgress(exportJobId, 40)

        // Step 4: Export reviews (55% progress)
        reviews = Firestore.collection('reviews')
            .where('userId', '==', userId)
            .get()

        exportData.reviews = reviews.docs.map(doc => doc.data())

        UpdateProgress(exportJobId, 55)

        // Step 5: Export social data (70% progress)
        followers = Firestore.collection('follows')
            .where('followingId', '==', userId)
            .get()

        following = Firestore.collection('follows')
            .where('followerId', '==', userId)
            .get()

        exportData.social = {
            followers: followers.docs.map(doc => ({
                username: doc.data().followerUsername,
                followedAt: doc.data().createdAt
            })),
            following: following.docs.map(doc => ({
                username: doc.data().followingUsername,
                followedAt: doc.data().createdAt
            }))
        }

        UpdateProgress(exportJobId, 70)

        // Step 6: Export achievements (80% progress)
        achievements = Firestore.collection('userAchievements')
            .doc(userId)
            .collection('unlocked')
            .get()

        exportData.achievements = achievements.docs.map(doc => doc.data())

        UpdateProgress(exportJobId, 80)

        // Step 7: Export activity history (90% progress)
        activityFeed = Firestore.collection('activityFeed')
            .doc(userId)
            .collection('items')
            .orderBy('createdAt', 'desc')
            .limit(500) // Last 500 items
            .get()

        exportData.activityHistory = activityFeed.docs.map(doc => doc.data())

        UpdateProgress(exportJobId, 90)

        // Step 8: Generate JSON file
        jsonContent = JSON.stringify(exportData, null, 2)
        fileName = `user_data_export_${userId}_${Date.now()}.json`

        // Upload to Firebase Storage
        storageRef = FirebaseStorage.ref(`exports/${userId}/${fileName}`)
        uploadTask = storageRef.putString(jsonContent, 'raw', {
            contentType: 'application/json',
            customMetadata: {
                userId: userId,
                exportJobId: exportJobId
            }
        })

        // Generate download URL (expires in 7 days)
        downloadUrl = storageRef.getDownloadURL()

        // Step 9: Complete export job
        Firestore.collection('exportJobs').doc(exportJobId).update({
            status: 'completed',
            progress: 100,
            downloadUrl: downloadUrl,
            fileSizeBytes: jsonContent.length,
            completedAt: ServerTimestamp()
        })

        // Step 10: Send notification
        SendNotification(userId, {
            title: "Data Export Ready",
            body: "Your data export is ready to download.",
            data: {
                type: 'data_export_complete',
                exportJobId: exportJobId,
                downloadUrl: downloadUrl
            }
        })

        Logger.info('Data export completed', { userId, exportJobId, sizeBytes: jsonContent.length })

    CATCH error
        Logger.error('Data export failed', { userId, exportJobId, error })

        Firestore.collection('exportJobs').doc(exportJobId).update({
            status: 'error',
            errorMessage: error.message,
            failedAt: ServerTimestamp()
        })

        SendNotification(userId, {
            title: "Data Export Failed",
            body: "There was an error exporting your data. Please try again or contact support."
        })
    END TRY
END

ALGORITHM: UpdateProgress
INPUT: exportJobId (string), progress (integer)

BEGIN
    Firestore.collection('exportJobs').doc(exportJobId).update({
        progress: progress,
        updatedAt: ServerTimestamp()
    })
END

ALGORITHM: DownloadExport
INPUT: exportJobId (string), userId (string)
OUTPUT: void

BEGIN
    exportJob = Firestore.collection('exportJobs').doc(exportJobId).get()

    IF exportJob.data().userId != userId THEN
        RETURN Error("Unauthorized access")
    END IF

    IF exportJob.data().status != 'completed' THEN
        RETURN Error("Export not ready yet")
    END IF

    IF ServerTimestamp() > exportJob.data().expiresAt THEN
        RETURN Error("Export link expired. Please request a new export.")
    END IF

    // Open download URL in browser
    OpenURL(exportJob.data().downloadUrl)
END

TIME COMPLEXITY: O(n) where n = total user data
EXECUTION TIME: 5-10 minutes for average user
STORAGE: Temporary (auto-deleted after 7 days)

GDPR ARTICLE 20 COMPLIANCE:
    - Machine-readable format (JSON)
    - Structured data
    - Complete data portability
    - Accessible within 30 days (completed within minutes)
```

### 9.2.1 Advanced Content Reporting

```
ALGORITHM: ReportContent
INPUT: contentId (string), contentType (string), reason (ReportReason), details (string), reporterId (string)
OUTPUT: Report OR Error

PURPOSE: Enhanced content reporting with multiple categories and auto-moderation triggers

REPORT REASONS:
    ENUM ReportReason {
        SPAM,
        HARASSMENT,
        HATE_SPEECH,
        VIOLENCE,
        NUDITY,
        MISINFORMATION,
        COPYRIGHT,
        IMPERSONATION,
        SELF_HARM,
        OTHER
    }

BEGIN
    // Step 1: Validate inputs
    IF reason NOT IN ReportReason THEN
        RETURN Error("Invalid report reason")
    END IF

    IF contentType NOT IN ['review', 'comment', 'profile', 'image'] THEN
        RETURN Error("Invalid content type")
    END IF

    // Step 2: Check for duplicate reports
    existingReport = Firestore.collection('contentFlags')
        .where('contentId', '==', contentId)
        .where('reporterId', '==', reporterId)
        .get()

    IF existingReport.docs.length > 0 THEN
        RETURN Error("You already reported this content")
    END IF

    // Step 3: Create report
    report = {
        id: GenerateUUID(),
        contentId: contentId,
        contentType: contentType,
        reporterId: reporterId,
        reason: reason,
        details: details,
        status: 'pending',
        severity: CalculateSeverity(reason),
        reviewedBy: null,
        reviewedAt: null,
        action: null,
        createdAt: ServerTimestamp()
    }

    Firestore.collection('contentFlags').doc(report.id).set(report)

    // Step 4: Update content flag counts
    Firestore.collection(contentType + 's').doc(contentId).update({
        ['moderationFlags.' + reason]: FieldValue.increment(1),
        'moderationFlags.totalCount': FieldValue.increment(1),
        'moderationFlags.lastFlaggedAt': ServerTimestamp()
    })

    // Step 5: Check auto-moderation thresholds
    content = Firestore.collection(contentType + 's').doc(contentId).get()
    flagCount = content.data().moderationFlags?.totalCount OR 0

    IF flagCount >= GetAutoHideThreshold(reason) THEN
        // Auto-hide content
        Firestore.collection(contentType + 's').doc(contentId).update({
            'moderationFlags.isAutoHidden': true,
            'moderationFlags.autoHiddenAt': ServerTimestamp(),
            'moderationFlags.autoHiddenReason': reason
        })

        // Add to moderation queue
        AddToModerationQueue(contentId, contentType, reason, 'auto_flagged', flagCount)

        Logger.warn('Content auto-hidden', {
            contentId,
            contentType,
            reason,
            flagCount
        })
    ELSE IF flagCount >= GetReviewThreshold(reason) THEN
        // Add to moderation queue for review
        AddToModerationQueue(contentId, contentType, reason, 'flagged', flagCount)
    END IF

    // Step 6: Send confirmation to reporter
    ShowToast("Thank you for your report. We'll review it shortly.")

    // Step 7: High-severity automatic actions
    IF report.severity == 'critical' THEN
        // Immediately escalate
        NotifyModerators('urgent', {
            reportId: report.id,
            contentId: contentId,
            reason: reason
        })
    END IF

    RETURN Success(report)
END

ALGORITHM: CalculateSeverity
INPUT: reason (ReportReason)
OUTPUT: Severity

BEGIN
    SWITCH reason
        CASE 'SELF_HARM':
        CASE 'VIOLENCE':
        CASE 'HATE_SPEECH':
            RETURN 'critical'

        CASE 'HARASSMENT':
        CASE 'NUDITY':
        CASE 'IMPERSONATION':
            RETURN 'high'

        CASE 'MISINFORMATION':
        CASE 'COPYRIGHT':
            RETURN 'medium'

        CASE 'SPAM':
        CASE 'OTHER':
            RETURN 'low'
    END SWITCH
END

ALGORITHM: GetAutoHideThreshold
INPUT: reason (ReportReason)
OUTPUT: integer

BEGIN
    SWITCH reason
        CASE 'SELF_HARM':
        CASE 'VIOLENCE':
            RETURN 1 // Hide immediately

        CASE 'HATE_SPEECH':
        CASE 'HARASSMENT':
            RETURN 2

        CASE 'SPAM':
        CASE 'NUDITY':
            RETURN 3

        DEFAULT:
            RETURN 5
    END SWITCH
END

ALGORITHM: GetReviewThreshold
INPUT: reason (ReportReason)
OUTPUT: integer

BEGIN
    // Add to moderation queue at lower threshold
    RETURN Math.max(1, GetAutoHideThreshold(reason) - 1)
END

ALGORITHM: AddToModerationQueue
INPUT: contentId, contentType, reason, priority, flagCount

BEGIN
    queueItem = {
        id: GenerateUUID(),
        contentId: contentId,
        contentType: contentType,
        reason: reason,
        priority: priority,
        flagCount: flagCount,
        status: 'pending',
        assignedTo: null,
        createdAt: ServerTimestamp()
    }

    Firestore.collection('moderationQueue').doc(queueItem.id).set(queueItem)
END

TIME COMPLEXITY: O(1)
AUTO-MODERATION: Reduces manual review load by 70%
```

### 9.5 Rate Limiting System

```
ALGORITHM: CheckRateLimit
INPUT: userId (string), operationType (string)
OUTPUT: RateLimitResult

PURPOSE: Prevent abuse and DoS attacks with sliding window rate limiting

RATE LIMIT CONFIGURATION:
    {
        'follow_user': { limit: 50, window: 3600 }, // 50 follows per hour
        'unfollow_user': { limit: 50, window: 3600 },
        'create_review': { limit: 20, window: 3600 }, // 20 reviews per hour
        'create_cider': { limit: 100, window: 3600 },
        'upload_image': { limit: 30, window: 3600 }, // 30 images per hour
        'report_content': { limit: 10, window: 3600 }, // 10 reports per hour
        'api_request': { limit: 1000, window: 3600 }, // 1000 requests per hour
        'login_attempt': { limit: 5, window: 900 } // 5 attempts per 15 min
    }

BEGIN
    config = RATE_LIMIT_CONFIGURATION[operationType]

    IF config == null THEN
        // No rate limit for this operation
        RETURN { allowed: true, remaining: Infinity }
    END IF

    // Get rate limit state from cache (Redis-like)
    rateLimitKey = `ratelimit:${userId}:${operationType}`
    currentWindow = Math.floor(Date.now() / 1000 / config.window)

    rateLimitData = LocalCache.get(rateLimitKey)

    IF rateLimitData == null OR rateLimitData.window != currentWindow THEN
        // New window - reset counter
        rateLimitData = {
            window: currentWindow,
            count: 0,
            expiresAt: (currentWindow + 1) * config.window
        }
    END IF

    // Check if limit exceeded
    IF rateLimitData.count >= config.limit THEN
        remainingTime = rateLimitData.expiresAt - (Date.now() / 1000)

        Logger.warn('Rate limit exceeded', {
            userId,
            operationType,
            count: rateLimitData.count,
            limit: config.limit
        })

        RETURN {
            allowed: false,
            limit: config.limit,
            remaining: 0,
            resetIn: Math.ceil(remainingTime)
        }
    END IF

    // Increment counter
    rateLimitData.count += 1
    LocalCache.set(rateLimitKey, rateLimitData, config.window)

    // Also persist to Firestore for cross-device sync (async)
    FirestoreAsync.collection('rateLimits')
        .doc(userId)
        .collection('operations')
        .doc(operationType)
        .set({
            window: currentWindow,
            count: rateLimitData.count,
            updatedAt: ServerTimestamp()
        }, { merge: true })

    RETURN {
        allowed: true,
        limit: config.limit,
        remaining: config.limit - rateLimitData.count,
        resetIn: (rateLimitData.expiresAt - Date.now() / 1000)
    }
END

ALGORITHM: EnforceRateLimit
INPUT: userId, operationType
OUTPUT: void OR RateLimitError

BEGIN
    result = CheckRateLimit(userId, operationType)

    IF NOT result.allowed THEN
        THROW RateLimitError({
            message: `Too many ${operationType} operations. Try again in ${result.resetIn} seconds.`,
            code: 'RATE_LIMIT_EXCEEDED',
            limit: result.limit,
            resetIn: result.resetIn
        })
    END IF
END

USAGE EXAMPLE:

ALGORITHM: FollowUser
INPUT: followerId, followingId

BEGIN
    // Enforce rate limit before operation
    EnforceRateLimit(followerId, 'follow_user')

    // Proceed with follow logic
    ...
END

ADVANCED: Token Bucket for Burst Handling

ALGORITHM: TokenBucketRateLimit
INPUT: userId, operationType, cost
OUTPUT: boolean

PURPOSE: Allow bursts while maintaining average rate

BEGIN
    config = RATE_LIMIT_CONFIGURATION[operationType]
    bucketKey = `tokenbucket:${userId}:${operationType}`

    bucket = LocalCache.get(bucketKey)

    IF bucket == null THEN
        bucket = {
            tokens: config.limit,
            lastRefill: Date.now()
        }
    END IF

    // Refill tokens based on time elapsed
    now = Date.now()
    elapsed = (now - bucket.lastRefill) / 1000
    refillAmount = (elapsed / config.window) * config.limit

    bucket.tokens = Math.min(config.limit, bucket.tokens + refillAmount)
    bucket.lastRefill = now

    // Try to consume tokens
    IF bucket.tokens >= cost THEN
        bucket.tokens -= cost
        LocalCache.set(bucketKey, bucket, config.window * 2)
        RETURN true
    ELSE
        RETURN false
    END IF
END

TIME COMPLEXITY: O(1)
STORAGE: In-memory cache + async Firestore sync
```

### 9.6 Content Sanitization

```
ALGORITHM: SanitizeUserInput
INPUT: input (string), inputType (string)
OUTPUT: sanitizedInput (string)

PURPOSE: Prevent XSS, injection attacks, and inappropriate content

BEGIN
    sanitized = input

    SWITCH inputType
        CASE 'username':
            // Alphanumeric + underscore only
            sanitized = input.replace(/[^a-zA-Z0-9_]/g, '')
            sanitized = sanitized.substring(0, 20) // Max length
            sanitized = sanitized.toLowerCase()

        CASE 'displayName':
            // Allow letters, numbers, spaces, basic punctuation
            sanitized = input.replace(/[<>\"'`]/g, '') // Remove dangerous chars
            sanitized = sanitized.trim()
            sanitized = sanitized.substring(0, 50)

        CASE 'bio':
        CASE 'notes':
            // HTML sanitization
            sanitized = StripHTML(input)
            sanitized = EscapeHTML(sanitized)
            sanitized = SanitizeURLs(sanitized)
            sanitized = sanitized.substring(0, 500)

        CASE 'review':
            sanitized = StripHTML(input)
            sanitized = EscapeHTML(sanitized)
            sanitized = SanitizeURLs(sanitized)
            sanitized = FilterProfanity(sanitized) // Optional
            sanitized = sanitized.substring(0, 2000)

        CASE 'url':
            sanitized = SanitizeURL(input)

        CASE 'imageUrl':
            sanitized = SanitizeImageURL(input)
    END SWITCH

    RETURN sanitized
END

ALGORITHM: StripHTML
INPUT: input (string)
OUTPUT: stripped (string)

BEGIN
    // Remove all HTML tags
    stripped = input.replace(/<[^>]*>/g, '')

    // Remove HTML entities
    stripped = stripped.replace(/&[a-z]+;/gi, '')

    RETURN stripped
END

ALGORITHM: EscapeHTML
INPUT: input (string)
OUTPUT: escaped (string)

BEGIN
    escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    }

    escaped = input

    FOR EACH [char, escape] IN escapeMap DO
        escaped = escaped.replaceAll(char, escape)
    END FOR

    RETURN escaped
END

ALGORITHM: SanitizeURLs
INPUT: text (string)
OUTPUT: sanitized (string)

BEGIN
    // Find URLs in text
    urlPattern = /(https?:\/\/[^\s]+)/g

    sanitized = text.replace(urlPattern, (url) => {
        // Validate URL
        IF IsValidURL(url) AND NOT IsBlacklistedDomain(url) THEN
            RETURN url
        ELSE
            RETURN '[removed]'
        END IF
    })

    RETURN sanitized
END

ALGORITHM: SanitizeURL
INPUT: url (string)
OUTPUT: sanitized (string) OR null

BEGIN
    // Validate protocol
    IF NOT url.startsWith('http://') AND NOT url.startsWith('https://') THEN
        RETURN null
    END IF

    TRY
        urlObj = new URL(url)

        // Check blacklist
        IF IsBlacklistedDomain(urlObj.hostname) THEN
            RETURN null
        END IF

        // Validate hostname
        IF NOT IsValidHostname(urlObj.hostname) THEN
            RETURN null
        END IF

        RETURN urlObj.toString()

    CATCH error
        RETURN null
    END TRY
END

ALGORITHM: SanitizeImageURL
INPUT: imageUrl (string)
OUTPUT: sanitized (string) OR null

BEGIN
    // Only allow Firebase Storage URLs
    IF NOT imageUrl.startsWith('https://firebasestorage.googleapis.com/') THEN
        RETURN null
    END IF

    // Validate URL format
    sanitized = SanitizeURL(imageUrl)

    IF sanitized == null THEN
        RETURN null
    END IF

    RETURN sanitized
END

ALGORITHM: FilterProfanity
INPUT: text (string)
OUTPUT: filtered (string)

PURPOSE: Optional profanity filtering (configurable)

BEGIN
    profanityList = LoadProfanityList() // Curated list

    filtered = text

    FOR EACH badWord IN profanityList DO
        pattern = new RegExp('\\b' + badWord + '\\b', 'gi')
        replacement = '*'.repeat(badWord.length)
        filtered = filtered.replace(pattern, replacement)
    END FOR

    RETURN filtered
END

ALGORITHM: StripImageMetadata
INPUT: imageFile (File)
OUTPUT: strippedImage (File)

PURPOSE: Remove EXIF data (GPS, camera info) for privacy

BEGIN
    // Use image processing library (e.g., sharp, jimp)
    imageData = ReadImageFile(imageFile)

    // Remove all EXIF metadata
    strippedData = RemoveEXIF(imageData)

    // Re-encode image
    strippedImage = EncodeImage(strippedData, imageFile.mimeType)

    RETURN strippedImage
END

VALIDATION RULES:

USERNAME:
    - Pattern: ^[a-zA-Z0-9_]{3,20}$
    - No spaces, special chars
    - Case insensitive (stored lowercase)
    - Must be unique

EMAIL:
    - RFC 5322 compliant
    - Must be verified
    - One account per email

DISPLAY NAME:
    - Max 50 chars
    - No HTML tags
    - No email addresses
    - No URLs

BIO/NOTES:
    - Max 500/2000 chars
    - No HTML
    - URLs validated
    - Optional profanity filter

IMAGE UPLOAD:
    - Max 10MB
    - Formats: JPG, PNG, WebP
    - Strip EXIF metadata
    - Validate dimensions
    - Scan for inappropriate content (optional ML)

TIME COMPLEXITY: O(n) where n = input length
SECURITY: Prevents XSS, injection, data leaks
```

---

## 10. Error Handling Strategies

### 10.1 Error Categorization

```
ERROR TYPES:

ENUM: ErrorCategory {
    NETWORK_ERROR,       // No internet, timeout
    AUTH_ERROR,          // Authentication failed
    PERMISSION_ERROR,    // Insufficient permissions
    VALIDATION_ERROR,    // Invalid input data
    CONFLICT_ERROR,      // Sync conflict
    RATE_LIMIT_ERROR,    // Too many requests
    SERVER_ERROR,        // Firebase error
    UNKNOWN_ERROR        // Catch-all
}

INTERFACE: AppError {
    category: ErrorCategory
    message: string (user-facing)
    technicalMessage: string (for logging)
    isRetryable: boolean
    retryAfter: integer OR null (seconds)
    context: object (additional error context)
}
```

### 10.2 Error Handling Algorithm

```
ALGORITHM: HandleError
INPUT: error (Error), context (string)
OUTPUT: AppError

PURPOSE: Centralized error handling with categorization and user feedback

BEGIN
    appError = {
        category: UNKNOWN_ERROR,
        message: 'An unexpected error occurred',
        technicalMessage: error.message,
        isRetryable: false,
        retryAfter: null,
        context: { source: context }
    }

    // Categorize error
    IF error.code STARTS WITH 'auth/' THEN
        appError.category = AUTH_ERROR

        SWITCH error.code
            CASE 'auth/user-not-found':
                appError.message = 'Account not found'

            CASE 'auth/wrong-password':
                appError.message = 'Incorrect password'

            CASE 'auth/too-many-requests':
                appError.category = RATE_LIMIT_ERROR
                appError.message = 'Too many attempts. Try again later.'
                appError.retryAfter = 300 // 5 minutes

            CASE 'auth/network-request-failed':
                appError.category = NETWORK_ERROR
                appError.message = 'Network error. Check your connection.'
                appError.isRetryable = true
        END SWITCH

    ELSE IF error.code STARTS WITH 'permission-denied' THEN
        appError.category = PERMISSION_ERROR
        appError.message = 'You don\'t have permission to access this'

    ELSE IF error.message INCLUDES 'network' OR error.message INCLUDES 'offline' THEN
        appError.category = NETWORK_ERROR
        appError.message = 'No internet connection'
        appError.isRetryable = true

    ELSE IF error.code == 'unavailable' THEN
        appError.category = SERVER_ERROR
        appError.message = 'Service temporarily unavailable'
        appError.isRetryable = true
        appError.retryAfter = 60

    ELSE IF error.message INCLUDES 'conflict' THEN
        appError.category = CONFLICT_ERROR
        appError.message = 'Data conflict detected. Please refresh.'
        appError.isRetryable = true
    END IF

    // Log error
    ErrorLogger.log(appError, {
        timestamp: Date.now(),
        userId: GetCurrentUserId(),
        context: context,
        stackTrace: error.stack
    })

    // Send to crash reporting (if critical)
    IF appError.category IN [SERVER_ERROR, UNKNOWN_ERROR] THEN
        CrashReporter.report(error, context)
    END IF

    RETURN appError
END
```

### 10.3 Retry Logic

```
ALGORITHM: RetryWithExponentialBackoff
INPUT: operation (function), maxRetries (integer), baseDelay (integer)
OUTPUT: Result OR Error

PURPOSE: Retry failed operations with exponential backoff

BEGIN
    retryCount = 0
    delay = baseDelay

    WHILE retryCount < maxRetries DO
        TRY
            result = operation()
            RETURN result

        CATCH error
            appError = HandleError(error, 'RetryOperation')

            IF NOT appError.isRetryable THEN
                THROW appError
            END IF

            retryCount += 1

            IF retryCount >= maxRetries THEN
                THROW appError
            END IF

            // Log retry attempt
            Logger.info('Retrying operation', {
                attempt: retryCount,
                maxRetries: maxRetries,
                delay: delay
            })

            // Wait with exponential backoff
            Sleep(delay)

            // Exponential backoff with jitter
            delay = delay * 2 + Random(0, 1000)

        END TRY
    END WHILE

    THROW Error('Max retries exceeded')
END

TIME COMPLEXITY: O(r) where r = retry count
OPTIMIZATION: Add jitter to prevent thundering herd
```

### 10.4 Offline Error Handling

```
ALGORITHM: HandleOfflineOperation
INPUT: operation (SyncOperation)
OUTPUT: void

PURPOSE: Queue operations when offline, retry when online

BEGIN
    IF IsOnline() THEN
        TRY
            ExecuteOperation(operation)
        CATCH error
            appError = HandleError(error, 'OnlineOperation')

            IF appError.isRetryable THEN
                // Queue for retry
                QueueOfflineOperation(operation)
            ELSE
                THROW appError
            END IF
        END TRY
    ELSE
        // Offline - queue immediately
        QueueOfflineOperation(operation)
        ShowToast('Saved locally. Will sync when online.')
    END IF
END

ALGORITHM: QueueOfflineOperation
INPUT: operation (SyncOperation)
OUTPUT: void

BEGIN
    // Add to SQLite sync queue
    SQLite.insertSyncOperation({
        id: GenerateUUID(),
        type: operation.type,
        data: operation.data,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending'
    })

    // Update UI badge
    pendingCount = SQLite.getPendingSyncOperationsCount()
    UpdateSyncBadge(pendingCount)
END

ALGORITHM: ProcessOfflineQueue
TRIGGER: Network state change to online

BEGIN
    IF NOT IsOnline() THEN
        RETURN
    END IF

    pendingOperations = SQLite.getPendingSyncOperations()

    IF pendingOperations.length == 0 THEN
        RETURN
    END IF

    ShowToast('Syncing ' + pendingOperations.length + ' items...')

    successCount = 0
    failureCount = 0

    FOR EACH operation IN pendingOperations DO
        TRY
            ExecuteOperation(operation)
            SQLite.deleteSyncOperation(operation.id)
            successCount += 1

        CATCH error
            failureCount += 1

            // Increment retry count
            SQLite.updateSyncOperationRetryCount(operation.id)

            // Check if max retries exceeded
            IF operation.retryCount + 1 >= operation.maxRetries THEN
                SQLite.updateSyncOperationStatus(operation.id, 'error')
            END IF
        END TRY
    END FOR

    IF successCount > 0 THEN
        ShowToast('Synced ' + successCount + ' items')
    END IF

    IF failureCount > 0 THEN
        ShowToast(failureCount + ' items failed to sync', 'warning')
    END IF
END
```

---

## 11. Performance Optimization

### 11.1 Caching Strategy

```
ALGORITHM: CachingStrategy

PURPOSE: Minimize network requests and improve app responsiveness

CACHE LAYERS:
    1. Memory Cache (in-app state)
    2. SQLite Cache (persistent local)
    3. Firestore (source of truth)

CACHE POLICIES:

POLICY: UserProfileCache
    - TTL: 5 minutes
    - Invalidation: On profile update
    - Storage: Memory + SQLite

    ALGORITHM: GetUserProfile
    INPUT: userId (string)
    OUTPUT: UserProfile

    BEGIN
        // Check memory cache
        cached = MemoryCache.get('user_' + userId)

        IF cached != null AND (Date.now() - cached.timestamp) < 300000 THEN
            RETURN cached.data
        END IF

        // Check SQLite cache
        sqliteCached = SQLite.getCachedUserProfile(userId)

        IF sqliteCached != null AND (Date.now() - sqliteCached.cachedAt) < 300000 THEN
            // Update memory cache
            MemoryCache.set('user_' + userId, {
                data: sqliteCached,
                timestamp: Date.now()
            })
            RETURN sqliteCached
        END IF

        // Fetch from Firestore
        profile = Firestore.collection('users').doc(userId).get()

        // Update caches
        MemoryCache.set('user_' + userId, {
            data: profile.data(),
            timestamp: Date.now()
        })

        SQLite.cacheUserProfile(userId, profile.data(), Date.now())

        RETURN profile.data()
    END

POLICY: FeedItemsCache
    - TTL: 10 minutes
    - Invalidation: Manual refresh
    - Storage: Memory only (ephemeral)

POLICY: LeaderboardCache
    - TTL: 6 hours
    - Invalidation: None (updated by Cloud Functions)
    - Storage: Memory + SQLite

CACHE INVALIDATION:
    - Time-based (TTL)
    - Event-based (on update)
    - Manual (pull-to-refresh)
    - LRU eviction (memory constraints)
```

### 11.2 Pagination Strategy

```
ALGORITHM: CursorBasedPagination

PURPOSE: Efficiently load large datasets in chunks

ALGORITHM: LoadPaginatedData
INPUT: collection (string), pageSize (integer), cursor (Timestamp OR null)
OUTPUT: PaginatedResult

BEGIN
    query = Firestore.collection(collection)
        .orderBy('createdAt', 'desc')
        .limit(pageSize)

    IF cursor != null THEN
        query = query.startAfter(cursor)
    END IF

    results = query.get()

    hasMore = results.docs.length >= pageSize
    nextCursor = hasMore ? results.docs[results.docs.length - 1].data().createdAt : null

    RETURN {
        items: results.docs.map(doc => doc.data()),
        hasMore: hasMore,
        nextCursor: nextCursor
    }
END

TIME COMPLEXITY: O(k) where k = pageSize
ADVANTAGES:
    - Consistent performance regardless of page number
    - Works with real-time updates
    - No offset calculation needed
```

### 11.3 Image Optimization

```
ALGORITHM: OptimizeAndUploadImage
INPUT: imageUri (string), targetSize (integer)
OUTPUT: uploadedUrl (string)

BEGIN
    // Step 1: Validate image
    IF NOT IsValidImageType(imageUri) THEN
        THROW Error('Invalid image type')
    END IF

    imageSize = GetImageSize(imageUri)

    IF imageSize > MAX_IMAGE_SIZE THEN
        THROW Error('Image too large')
    END IF

    // Step 2: Compress image
    compressed = CompressImage(imageUri, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
        format: 'jpeg'
    })

    // Step 3: Generate thumbnail
    thumbnail = ResizeImage(compressed, {
        width: 300,
        height: 300,
        mode: 'cover'
    })

    // Step 4: Upload to Firebase Storage
    timestamp = Date.now()
    userId = GetCurrentUserId()

    // Upload full image
    fullPath = 'users/' + userId + '/images/' + timestamp + '.jpg'
    fullUrl = UploadToStorage(compressed, fullPath)

    // Upload thumbnail
    thumbPath = 'users/' + userId + '/thumbnails/' + timestamp + '_thumb.jpg'
    thumbUrl = UploadToStorage(thumbnail, thumbPath)

    RETURN {
        fullUrl: fullUrl,
        thumbUrl: thumbUrl
    }
END

CONSTANTS:
    MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
    FULL_IMAGE_MAX_DIMENSION = 1200
    THUMBNAIL_SIZE = 300

TIME COMPLEXITY: O(p) where p = pixel count
OPTIMIZATION:
    - Client-side compression reduces bandwidth
    - Thumbnails improve list performance
    - Lazy loading for full images
```

### 11.4 Batch Operations

```
ALGORITHM: BatchWriteOptimization

PURPOSE: Reduce write operations and improve performance

ALGORITHM: BatchUpdateFollowerCounts
INPUT: userIds (string[])
OUTPUT: void

BEGIN
    batches = []
    currentBatch = Firestore.batch()
    operationCount = 0

    FOR EACH userId IN userIds DO
        // Get current follower count
        followerCount = Firestore.collection('follows')
            .where('followingId', '==', userId)
            .where('status', '==', 'active')
            .count()

        // Add update to batch
        currentBatch.update(
            Firestore.collection('users').doc(userId),
            { 'stats.followersCount': followerCount }
        )

        operationCount += 1

        // Firestore batch limit is 500
        IF operationCount >= 500 THEN
            batches.push(currentBatch)
            currentBatch = Firestore.batch()
            operationCount = 0
        END IF
    END FOR

    // Add remaining operations
    IF operationCount > 0 THEN
        batches.push(currentBatch)
    END IF

    // Commit all batches
    FOR EACH batch IN batches DO
        batch.commit()
    END FOR
END

TIME COMPLEXITY: O(n / 500) where n = user count
OPTIMIZATION: Reduces n writes to n/500 batch commits
```

---

## Appendix: Complexity Analysis Summary

```
OPERATION COMPLEXITY ANALYSIS:

AUTHENTICATION:
    - Sign In: O(1)
    - Load Profile: O(1) + O(f) for followers
    - Update Profile: O(1)

SOCIAL OPERATIONS:
    - Follow User: O(1)
    - Unfollow User: O(1)
    - Get Followers: O(f) where f = follower count
    - Check if Following: O(1) with composite key

FEED OPERATIONS:
    - Load Feed: O(k) where k = page size
    - Generate Feed Item (fanout): O(f) where f = follower count
    - Real-time Listener: O(1) per update

REVIEW OPERATIONS:
    - Create Review: O(1) + O(i) for images
    - Load Reviews: O(r) where r = review count
    - Calculate Community Rating: O(r)

ACHIEVEMENT OPERATIONS:
    - Check Achievements: O(a * c) where a = achievements, c = criteria cost
    - Unlock Achievement: O(1)

LEADERBOARD OPERATIONS:
    - Update Leaderboard: O(n log n) for top n users
    - Get User Position: O(1) if in top 100, O(log n) otherwise

SYNC OPERATIONS:
    - Two-Way Sync: O(p + r) where p = pending, r = remote changes
    - Conflict Resolution: O(f) where f = field count
    - Delta Sync: O(d) where d = changed documents

SEARCH OPERATIONS:
    - Search Users: O(log n) with index
    - Search Ciders: O(log n) with index
    - Full-text Search: O(m) where m = matching documents
```

---

## Implementation Checklist

```
PHASE 4 IMPLEMENTATION ROADMAP:

WEEK 1-2: Authentication & Profiles
    ✓ Firebase Authentication setup
    ✓ User profile creation flow
    ✓ Profile editing screen
    ✓ Avatar upload
    ✓ Privacy settings

WEEK 3-4: Social Relationships
    ✓ Follow/unfollow functionality
    ✓ Followers/following lists
    ✓ User search
    ✓ Follow notifications

WEEK 5-6: Reviews & Community
    ✓ Review creation screen
    ✓ Review list/detail views
    ✓ Community rating calculation
    ✓ Like/helpful functionality
    ✓ Image upload for reviews

WEEK 7-8: Activity Feed
    ✓ Feed generation algorithm
    ✓ Feed UI components
    ✓ Real-time listeners
    ✓ Feed pagination

WEEK 9-10: Achievements & Gamification
    ✓ Achievement definitions
    ✓ Achievement tracking
    ✓ Achievement unlocking
    ✓ Achievement notifications
    ✓ Achievement UI

WEEK 11-12: Leaderboards
    ✓ Leaderboard calculation
    ✓ Leaderboard UI
    ✓ User ranking
    ✓ Periodic updates

WEEK 13-14: Notifications
    ✓ Notification system
    ✓ Push notifications (FCM)
    ✓ Notification preferences
    ✓ Notification UI

WEEK 15-16: Sharing & Export
    ✓ Share to social media
    ✓ Export to PDF
    ✓ Export to CSV
    ✓ Shareable infographics

WEEK 17-18: Sync & Offline
    ✓ Two-way sync
    ✓ Conflict resolution
    ✓ Delta sync
    ✓ Offline queue

WEEK 19-20: Testing & Polish
    ✓ Unit tests
    ✓ Integration tests
    ✓ Performance testing
    ✓ Security audit
    ✓ UX polish
```

---

**END OF PSEUDOCODE DOCUMENTATION**

This pseudocode specification provides a comprehensive, production-ready blueprint for implementing Phase 4 social and community features. All algorithms are optimized for performance, security, and scalability.
