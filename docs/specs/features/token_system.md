# Token & Reward System Specification

**Consolidated from**: Features 004, 005
**Last Updated**: 2025-09-16

## Overview
The Token System ("DDL Token") gamifies the community experience by rewarding users for contributing content (posts, comments) and creating high-quality "valuable" posts. Tokens can be spent on marketplace items, badges, and profile customizations.

## Core Features

### 1. Earning Tokens
- **Base Rewards**:
  - **Post**: 10 DDL per published post.
  - **Comment**: 2 DDL per published comment.
- **AI Quality Bonus**:
  - **Concept**: AI assesses post quality within 30 seconds of publication.
  - **Reward**: 100 DDL bonus for "Valuable" posts.
  - **Notification**: Automated comment posted by the system to inform the user and community of the quality recognition.
- **Feedback**: Instant visual cues (animations, toasts) when tokens are earned.

### 2. Implementation Details (AI Assessment)
- **Timing**: Real-time or near real-time (target < 30s).
- **Transparency**: Assessment logs (internal) and automated public comments (external).
- **Fairness**: Independent evaluation per post; rate limits to prevent gaming/spam.

### 3. Token Economy & Usage
- **Marketplace**:
  - Cosmetics: Profile themes, avatar decorations.
  - Functional: Post highlighting/boosting.
  - Social: Gift tokens to others.
- **Achievements**: Badges unlockable at token milestones.
- **Profile**: Displays Total Earned, Current Balance, and Transaction History.

## Requirements

### Functional Requirements
- **FR-001**: Award 10 DDL for Posts, 2 DDL for Comments.
- **FR-002**: Trigger AI assessment for every new post.
- **FR-003**: Award 100 DDL bonus if AI Score > Threshold.
- **FR-004**: Post automated congratulatory comment for bonus awards.
- **FR-005**: Provide comprehensive transaction history (Earning, Spending, Bonuses).
- **FR-006**: Prevent abuse via rate limiting (e.g., max rewards per hour/day).
- **FR-007**: Support token spending flow (Purchase Item -> Deduct Balance -> Grant Item).

### Data Model Entities
- **TokenTransaction**: `id`, `user_id`, `amount`, `type` (EARN_POST, SPEND_STORE, BONUS_AI), `created_at`.
- **UserTokenProfile**: `user_id`, `balance`, `total_earned`.
- **QualityAssessment**: `post_id`, `score`, `is_valuable`, `processed_at`, `ai_reasoning`.
