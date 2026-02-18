# Master System UI Components Specification for v0

## Overview
Korean Reddit-like platform master (moderator) dashboard system with AI-powered moderation features. All text should be in Korean except for technical terms.

## Design Requirements
- Modern, clean interface using shadcn/ui components
- Dark mode support
- Responsive design for desktop and tablet
- Real-time updates indication
- Korean language UI with proper typography

## Component 1: Master Dashboard (마스터 대시보드)

### Prompt for v0:
```
Create a comprehensive master dashboard for a Korean Reddit-like platform. The dashboard should display:

1. Top Stats Cards (4 cards in a row):
   - 총 게시물 (Total Posts) - with growth percentage
   - 활성 사용자 (Active Users) - with online indicator
   - 대기중 검토 (Pending Review) - with priority badges
   - AI 정확도 (AI Accuracy) - with percentage chart

2. Main Content Area (2-column layout):
   Left Column (60%):
   - Real-time Activity Feed showing recent posts/comments with:
     - User avatar and username
     - Content preview (truncated)
     - AI moderation score badge (0-100)
     - Quick action buttons (승인/거부/검토)
   
   Right Column (40%):
   - Moderation Queue Summary with priority indicators
   - Top Violations Chart (bar chart)
   - Recent Master Actions log

3. Navigation Tabs:
   - 개요 (Overview)
   - 모더레이션 (Moderation)
   - 정책 설정 (Policy Settings)
   - 분석 (Analytics)
   - 알림 (Notifications) with badge

Use shadcn/ui components, Tailwind CSS, and include Korean text. Add subtle animations and hover effects. Include time period selector (24시간, 7일, 30일).
```

## Component 2: Moderation Queue (모더레이션 큐)

### Prompt for v0:
```
Create a moderation queue interface for Korean Reddit platform masters. Include:

1. Filter Bar:
   - Status filters: 대기중(Pending), 승인됨(Approved), 거부됨(Rejected), 에스컬레이션(Escalated)
   - Priority: 긴급(Critical), 높음(High), 보통(Medium), 낮음(Low)
   - Type: 게시물(Posts), 댓글(Comments), 사용자(Users)
   - Search box

2. Queue List (Table/Card hybrid view):
   Each item shows:
   - Priority indicator (colored dot)
   - Content type icon
   - Content preview with highlighted violation
   - Author info (username, karma, account age)
   - AI Analysis panel:
     - Confidence score (progress bar)
     - Detected violations (tags)
     - AI reasoning (collapsible)
   - Report details (if user-reported)
   - Action buttons:
     - 승인 (Approve) - green
     - 거부 (Reject) - red
     - 에스컬레이션 (Escalate) - yellow
     - 세부사항 보기 (View Details)

3. Bulk Actions:
   - Select all checkbox
   - Bulk approve/reject buttons
   - Assign to master dropdown

4. Quick Stats:
   - Queue size indicator
   - Average response time
   - AI override rate

Use card-based design with hover states, loading skeletons, and smooth transitions. Include pagination or infinite scroll.
```

## Component 3: Policy Settings (정책 설정)

### Prompt for v0:
```
Design a policy settings interface for subreddit masters. Create:

1. Settings Sections (Accordion layout):
   
   a) 기본 모더레이션 설정 (Basic Moderation):
   - 욕설 필터 수준: Slider (엄격/보통/관대)
   - AI 모더레이션: Toggle switch
   - AI 신뢰도 임계값: Slider (0-100%)
   - 자동 모더레이션: Toggle switch
   
   b) 스팸 방지 (Spam Protection):
   - 링크 제한: Number input
   - 반복 임계값: Slider
   - 신규 사용자 제한: Toggle
   
   c) 사용자 제한 (User Restrictions):
   - 최소 카르마 (게시물): Number input
   - 최소 카르마 (댓글): Number input
   - 계정 나이 제한: Days input
   - 이메일 인증 필수: Toggle
   
   d) 금지어 관리 (Banned Words):
   - Tag input for banned words
   - Import/Export buttons
   - Regex pattern support toggle

2. Custom Rules Builder:
   - IF condition selector (dropdown)
   - THEN action selector (dropdown)
   - Add rule button
   - Rules list with edit/delete

3. Policy Conflict Warnings:
   - Alert cards showing conflicts with platform policies
   - Resolution options

4. Save Changes:
   - Save button with confirmation
   - Reset to defaults button
   - Change history log

Use form components with proper validation, helper text in Korean, and visual feedback for changes.
```

## Component 4: Master Analytics Dashboard (분석 대시보드)

### Prompt for v0:
```
Create an analytics dashboard for subreddit masters showing:

1. Time Period Selector:
   - Quick select: 오늘, 어제, 지난 7일, 지난 30일
   - Custom date range picker

2. Charts Grid (2x2):
   - 게시물 트렌드 (Line chart) - Posts over time
   - 사용자 활동 (Area chart) - Active users by hour
   - 모더레이션 통계 (Donut chart) - AI vs Manual decisions
   - 위반 유형 분포 (Bar chart) - Violation categories

3. Top Content Section:
   - 인기 게시물 (Top Posts) - Table with title, author, score, engagement
   - 활발한 토론 (Hot Discussions) - Most commented posts
   - 트렌딩 키워드 (Trending Keywords) - Word cloud or tag list

4. User Insights:
   - 신규 vs 기존 사용자 (New vs Returning users)
   - 사용자 성장률 (User growth rate)
   - Top contributors list

5. Moderation Performance:
   - 평균 응답 시간 (Average response time)
   - False positive rate
   - 모더레이터 활동 (Moderator activity) - Actions per master

Use recharts or similar for charts, with tooltips showing detailed data. Include export buttons for reports (PDF/CSV).
```

## Component 5: Master Notifications Center (알림 센터)

### Prompt for v0:
```
Design a notifications center for platform masters:

1. Notification List:
   - Priority indicators (색상 코드: 빨강-긴급, 노랑-높음, 파랑-보통)
   - Notification types with icons:
     - 큐 임계값 도달 (Queue threshold)
     - 정책 충돌 (Policy conflict)
     - AI 불확실성 (AI uncertainty)
     - 사용자 신고 (User report)
     - 시스템 알림 (System alert)
   
2. Each Notification Shows:
   - Title and message
   - Time ago (방금, 5분 전, 1시간 전, etc.)
   - Action required badge
   - Quick action buttons
   - Mark as read toggle

3. Filters:
   - 읽지 않음 (Unread only)
   - 조치 필요 (Action required)
   - Priority level selector

4. Bulk Actions:
   - Mark all as read
   - Clear all
   - Settings (notification preferences)

Use toast notifications for new items, badge counter, and smooth animations. Include empty state with illustration.
```

## Component 6: Moderation Action Modal (모더레이션 액션 모달)

### Prompt for v0:
```
Create a detailed moderation action modal that appears when reviewing content:

1. Content Display:
   - Full post/comment content
   - Author information card:
     - Username with karma badge
     - Account age
     - Previous violations count
     - User status badges
   
2. AI Analysis Section:
   - Confidence score with visual indicator
   - Detected issues with severity levels
   - AI reasoning explanation
   - Similar content patterns found

3. Action Form:
   - Primary action buttons:
     - ✅ 승인 (Approve)
     - ❌ 거부 (Reject)  
     - ⚠️ 에스컬레이션 (Escalate)
   
   - Additional actions (checkboxes):
     - 사용자 차단 (Ban user) with duration selector
     - 유사 콘텐츠 제거 (Remove similar content)
     - 정책 업데이트 (Update policy based on this case)
   
   - Reason textarea (required for reject/escalate)
   - Internal notes field

4. History Tab:
   - Previous actions on this user
   - Similar cases resolved
   - Policy precedents

Use a multi-step modal with tabs, form validation, and confirmation dialog for destructive actions.
```

## Component 7: Onboarding Flow (마스터 온보딩)

### Prompt for v0:
```
Design an onboarding flow for new subreddit masters:

1. Welcome Screen:
   - Welcome message: "서브레딧 마스터가 되신 것을 환영합니다!"
   - Role explanation
   - Estimated time: 10분
   - Start button

2. Step 1 - 역할 이해 (Understanding Your Role):
   - Interactive cards explaining permissions
   - Responsibility checklist
   - Platform policies overview
   - Quiz questions with instant feedback

3. Step 2 - 도구 사용법 (Tool Tutorial):
   - Interactive tour of dashboard
   - Hover tooltips
   - Try-it-yourself sandbox
   - Video tutorials (optional)

4. Step 3 - 정책 설정 (Initial Setup):
   - Guided policy configuration
   - Recommended settings based on subreddit type
   - Preview of how policies work

5. Step 4 - 실습 (Practice):
   - Sample moderation scenarios
   - Decision practice with feedback
   - Common mistakes to avoid

6. Completion:
   - Certificate of completion
   - Quick reference guide download
   - Support resources
   - "시작하기" button

Use a progress stepper, smooth transitions between steps, and gamification elements (badges, progress bar).
```

## Additional UI Requirements

### Common Components Needed:
- Korean date/time formatters
- Number formatting (1.2천, 3.5만)
- Loading states with Korean text
- Empty states with helpful messages
- Error boundaries with user-friendly messages
- Tooltips explaining features
- Keyboard shortcuts overlay

### Accessibility:
- ARIA labels in Korean
- Keyboard navigation support
- High contrast mode support
- Screen reader compatibility

### Performance:
- Virtualized lists for large datasets
- Optimistic UI updates
- Skeleton loaders
- Progressive loading

### Integration Points:
```typescript
// API endpoints to connect
/api/master/policies
/api/master/moderation
/api/master/dashboard
/api/master/analytics
/api/master/notifications

// Real-time subscriptions
supabase.channel('moderation-queue')
supabase.channel('master-notifications')
```

## Color Scheme
```css
/* Priority Colors */
--priority-critical: #ef4444; /* 빨강 */
--priority-high: #f59e0b;     /* 주황 */
--priority-medium: #3b82f6;   /* 파랑 */
--priority-low: #10b981;      /* 초록 */

/* Status Colors */
--status-pending: #6b7280;    /* 회색 */
--status-approved: #10b981;   /* 초록 */
--status-rejected: #ef4444;   /* 빨강 */
--status-escalated: #f59e0b;  /* 주황 */

/* AI Confidence */
--ai-high: #10b981;           /* >85% */
--ai-medium: #f59e0b;         /* 70-85% */
--ai-low: #ef4444;            /* <70% */
```

## Sample Data Structure for Testing
```json
{
  "queueItem": {
    "id": "uuid",
    "priority": "high",
    "type": "post",
    "content": "의심스러운 게시물 내용...",
    "author": {
      "username": "user123",
      "karma": 42,
      "accountAge": "3개월",
      "violations": 2
    },
    "ai": {
      "confidence": 78,
      "violations": ["욕설", "스팸"],
      "reasoning": "금지어 '***' 감지됨"
    },
    "reportedBy": "user456",
    "reportReason": "부적절한 내용",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

## Testing Scenarios
1. High volume queue (100+ items)
2. Real-time updates while viewing
3. Conflicting policy detection
4. Bulk moderation actions
5. Network failure handling
6. Permission denied scenarios

---

Use these specifications to create each component in v0. Focus on Korean UX/UI best practices, clean modern design, and efficient workflows for moderators managing large communities.