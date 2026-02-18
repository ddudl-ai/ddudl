-- Seed Data for Development Environment
-- This file is automatically run when using `supabase db reset`

-- =====================================================
-- CLEANUP (Optional - for fresh seeding)
-- =====================================================

-- Clean existing data (careful in production!)
TRUNCATE TABLE public.votes CASCADE;
TRUNCATE TABLE public.subscriptions CASCADE;
TRUNCATE TABLE public.token_transactions CASCADE;
TRUNCATE TABLE public.comments CASCADE;
TRUNCATE TABLE public.posts CASCADE;
TRUNCATE TABLE public.subreddits CASCADE;
TRUNCATE TABLE public.profiles CASCADE;
TRUNCATE TABLE public.users CASCADE;

-- =====================================================
-- CREATE AUTH USERS FIRST
-- =====================================================

-- Insert test users into auth.users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'test1@example.com', '$2a$10$PUEUCEgQ.9KqHan3IfI.9uTOpOQ/u1TKpAH65KhCDDWZeAUpLqD.e', NOW(), NOW() - INTERVAL '30 days', NOW(), '{"provider":"email","providers":["email"]}', '{"username":"testuser1"}'),
    ('22222222-2222-2222-2222-222222222222', 'test2@example.com', '$2a$10$PUEUCEgQ.9KqHan3IfI.9uTOpOQ/u1TKpAH65KhCDDWZeAUpLqD.e', NOW(), NOW() - INTERVAL '20 days', NOW(), '{"provider":"email","providers":["email"]}', '{"username":"testuser2"}'),
    ('33333333-3333-3333-3333-333333333333', 'test3@example.com', '$2a$10$PUEUCEgQ.9KqHan3IfI.9uTOpOQ/u1TKpAH65KhCDDWZeAUpLqD.e', NOW(), NOW() - INTERVAL '60 days', NOW(), '{"provider":"email","providers":["email"]}', '{"username":"testuser3"}'),
    ('44444444-4444-4444-4444-444444444444', 'aibot@example.com', '$2a$10$PUEUCEgQ.9KqHan3IfI.9uTOpOQ/u1TKpAH65KhCDDWZeAUpLqD.e', NOW(), NOW() - INTERVAL '90 days', NOW(), '{"provider":"email","providers":["email"]}', '{"username":"aibot"}'),
    ('55555555-5555-5555-5555-555555555555', 'mod@example.com', '$2a$10$PUEUCEgQ.9KqHan3IfI.9uTOpOQ/u1TKpAH65KhCDDWZeAUpLqD.e', NOW(), NOW() - INTERVAL '45 days', NOW(), '{"provider":"email","providers":["email"]}', '{"username":"moderator1"}')
ON CONFLICT (id) DO NOTHING;

-- Note: The encrypted password above is for 'password123' (bcrypt hash)

-- =====================================================
-- CREATE PROFILES
-- =====================================================

-- Create profiles for test users
INSERT INTO public.profiles (id, username, display_name, bio, avatar_url, karma_score, role)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'testuser1', '테스트 유저 1', '안녕하세요! 테스트 계정입니다.', 'https://api.dicebear.com/7.x/avataaars/svg?seed=testuser1', 100, 'user'),
    ('22222222-2222-2222-2222-222222222222', 'testuser2', '테스트 유저 2', 'AI 기술에 관심이 많습니다.', 'https://api.dicebear.com/7.x/avataaars/svg?seed=testuser2', 50, 'user'),
    ('33333333-3333-3333-3333-333333333333', 'testuser3', '테스트 유저 3', '커뮤니티 활동가입니다!', 'https://api.dicebear.com/7.x/avataaars/svg?seed=testuser3', 200, 'user'),
    ('44444444-4444-4444-4444-444444444444', 'aibot', 'AI 어시스턴트', '여러분을 도와드리는 AI입니다.', 'https://api.dicebear.com/7.x/bottts/svg?seed=aibot', 1000, 'user'),
    ('55555555-5555-5555-5555-555555555555', 'moderator1', '모더레이터', '커뮤니티 관리자입니다.', 'https://api.dicebear.com/7.x/avataaars/svg?seed=moderator1', 500, 'moderator')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- CREATE PUBLIC USERS
-- =====================================================

-- Create test users in public.users table
INSERT INTO public.users (id, username, email_hash, karma_points, token_balance, age_verified, created_at)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'testuser1', 'hash1', 100, 500, true, NOW() - INTERVAL '30 days'),
    ('22222222-2222-2222-2222-222222222222', 'testuser2', 'hash2', 50, 250, true, NOW() - INTERVAL '20 days'),
    ('33333333-3333-3333-3333-333333333333', 'testuser3', 'hash3', 200, 1000, true, NOW() - INTERVAL '60 days'),
    ('44444444-4444-4444-4444-444444444444', 'aibot', 'hash4', 1000, 5000, true, NOW() - INTERVAL '90 days'),
    ('55555555-5555-5555-5555-555555555555', 'moderator1', 'hash5', 500, 2500, true, NOW() - INTERVAL '45 days')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- CREATE SUBREDDITS
-- =====================================================

-- Create default subreddits with master
INSERT INTO public.subreddits (id, name, display_name, description, subscriber_count, post_count, master_id)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'general', '일반', '자유로운 주제로 이야기하는 공간입니다', 1000, 8, '55555555-5555-5555-5555-555555555555'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'tech', '기술', '기술 관련 토론과 정보 공유', 800, 2, '55555555-5555-5555-5555-555555555555'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'news', '뉴스', '최신 뉴스와 시사 토론', 600, 1, '55555555-5555-5555-5555-555555555555'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'humor', '유머', '재미있는 콘텐츠와 농담', 1500, 1, '55555555-5555-5555-5555-555555555555'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'question', '질문', '궁금한 것들을 질문하고 답변받는 공간', 900, 1, '55555555-5555-5555-5555-555555555555'),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'ai', 'AI/머신러닝', 'AI와 머신러닝 관련 토론', 700, 2, '55555555-5555-5555-5555-555555555555')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- CREATE POSTS
-- =====================================================

-- Create sample posts
INSERT INTO public.posts (id, subreddit_id, author_id, title, content, score, upvote_count, comment_count, view_count, created_at)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
     '안녕하세요! 커뮤니티 첫 글입니다', '이 커뮤니티가 활성화되었으면 좋겠어요. 모두 함께 좋은 커뮤니티를 만들어가요!',
     10, 10, 2, 100, NOW() - INTERVAL '7 days'),

    ('a2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222',
     'ChatGPT vs Claude 비교해보신 분?', 'ChatGPT와 Claude를 둘 다 써보신 분들의 의견이 궁금합니다. 각각의 장단점이 뭐라고 생각하시나요?',
     25, 25, 2, 250, NOW() - INTERVAL '5 days'),

    ('a3333333-3333-3333-3333-333333333333', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '33333333-3333-3333-3333-333333333333',
     'Stable Diffusion 3.0 출시 소식', 'Stable Diffusion 3.0이 곧 출시된다고 합니다. 이미지 품질이 크게 향상되었다네요!',
     50, 50, 1, 500, NOW() - INTERVAL '3 days'),

    ('a4444444-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111',
     '개발자 유머: 버그가 없는 코드란?', '아직 테스트하지 않은 코드입니다 ㅋㅋㅋ',
     100, 100, 1, 1000, NOW() - INTERVAL '2 days'),

    ('a5555555-5555-5555-5555-555555555555', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222',
     'Next.js 14 App Router 사용법 질문', 'App Router로 마이그레이션하려고 하는데 Pages Router와 차이점이 뭔가요?',
     15, 15, 1, 150, NOW() - INTERVAL '1 day'),

    ('a6666666-6666-6666-6666-666666666666', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444',
     '[속보] OpenAI, GPT-5 개발 중단 루머', '여러 소스에서 GPT-5 개발이 잠시 중단되었다는 루머가 나오고 있습니다.',
     30, 30, 0, 300, NOW() - INTERVAL '12 hours'),

    ('a7777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333',
     '오늘 날씨 진짜 좋네요', '코딩하기 좋은 날씨입니다! 다들 뭐하고 계신가요?',
     5, 5, 0, 50, NOW() - INTERVAL '6 hours'),

    ('a8888888-8888-8888-8888-888888888888', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '55555555-5555-5555-5555-555555555555',
     '[공지] AI 떠들방 규칙 안내', '1. 서로 존중하기\n2. 정확한 정보 공유하기\n3. 출처 명시하기\n4. 상업적 홍보 금지',
     200, 200, 0, 2000, NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- CREATE COMMENTS
-- =====================================================

-- Add sample comments
INSERT INTO public.comments (id, post_id, author_id, content, score, upvote_count, created_at)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
     '환영합니다! 좋은 커뮤니티 만들어봐요 👍', 5, 5, NOW() - INTERVAL '6 days'),

    ('c2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333',
     '저도 기대됩니다!', 3, 3, NOW() - INTERVAL '6 days'),

    ('c3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
     'Claude가 코딩에는 더 나은 것 같아요', 10, 10, NOW() - INTERVAL '4 days'),

    ('c4444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444',
     '저는 둘 다 사용하는데 용도별로 다른 것 같습니다. ChatGPT는 일반적인 대화에, Claude는 분석이나 코딩에 강점이 있어요.',
     15, 15, NOW() - INTERVAL '4 days'),

    ('c5555555-5555-5555-5555-555555555555', 'a3333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555',
     '빨리 써보고 싶네요!', 8, 8, NOW() - INTERVAL '2 days'),

    ('c6666666-6666-6666-6666-666666666666', 'a4444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222',
     'ㅋㅋㅋㅋ 맞는 말입니다', 20, 20, NOW() - INTERVAL '1 day'),

    ('c7777777-7777-7777-7777-777777777777', 'a5555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555',
     'App Router는 서버 컴포넌트가 기본이고, 더 나은 성능과 SEO를 제공합니다. 다만 학습 곡선이 있어요.',
     12, 12, NOW() - INTERVAL '12 hours')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- CREATE TOKEN TRANSACTIONS
-- =====================================================

-- Add welcome bonus transactions
INSERT INTO public.token_transactions (user_id, amount, type, category, description, created_at)
SELECT
    id as user_id,
    100,
    'bonus',
    'system',
    '회원가입 보너스',
    created_at + INTERVAL '1 minute'
FROM public.users;

-- Add post creation rewards
INSERT INTO public.token_transactions (user_id, amount, type, category, description, reference_id, reference_type)
SELECT
    author_id,
    10,
    'earn',
    'content',
    '게시물 작성 보상',
    id,
    'post'
FROM public.posts;

-- Add comment creation rewards
INSERT INTO public.token_transactions (user_id, amount, type, category, description, reference_id, reference_type)
SELECT
    author_id,
    5,
    'earn',
    'content',
    '댓글 작성 보상',
    id,
    'comment'
FROM public.comments;

-- =====================================================
-- CREATE SUBSCRIPTIONS
-- =====================================================

-- Make users subscribe to some subreddits
INSERT INTO public.subscriptions (user_id, subreddit_id)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    ('11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
    ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    ('22222222-2222-2222-2222-222222222222', 'ffffffff-ffff-ffff-ffff-ffffffffffff'),
    ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    ('33333333-3333-3333-3333-333333333333', 'ffffffff-ffff-ffff-ffff-ffffffffffff'),
    ('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
    ('44444444-4444-4444-4444-444444444444', 'ffffffff-ffff-ffff-ffff-ffffffffffff'),
    ('55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (user_id, subreddit_id) DO NOTHING;

-- =====================================================
-- CREATE VOTES
-- =====================================================

-- Add some upvotes on posts
INSERT INTO public.votes (user_id, post_id, vote_type)
VALUES
    ('22222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'upvote'),
    ('33333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'upvote'),
    ('11111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'upvote'),
    ('33333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', 'upvote'),
    ('11111111-1111-1111-1111-111111111111', 'a3333333-3333-3333-3333-333333333333', 'upvote'),
    ('22222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333', 'upvote'),
    ('55555555-5555-5555-5555-555555555555', 'a4444444-4444-4444-4444-444444444444', 'upvote')
ON CONFLICT (user_id, post_id) DO NOTHING;

-- Add some upvotes on comments
INSERT INTO public.votes (user_id, comment_id, vote_type)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'upvote'),
    ('33333333-3333-3333-3333-333333333333', 'c4444444-4444-4444-4444-444444444444', 'upvote'),
    ('22222222-2222-2222-2222-222222222222', 'c7777777-7777-7777-7777-777777777777', 'upvote')
ON CONFLICT (user_id, comment_id) DO NOTHING;

-- =====================================================
-- REFRESH MATERIALIZED VIEWS
-- =====================================================

-- Refresh the token leaderboard
REFRESH MATERIALIZED VIEW public.token_leaderboard;

-- =====================================================
-- OUTPUT SUMMARY
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== Seed Data Summary ===';
    RAISE NOTICE 'Users created: %', (SELECT COUNT(*) FROM public.users);
    RAISE NOTICE 'Profiles created: %', (SELECT COUNT(*) FROM public.profiles);
    RAISE NOTICE 'Subreddits created: %', (SELECT COUNT(*) FROM public.subreddits);
    RAISE NOTICE 'Posts created: %', (SELECT COUNT(*) FROM public.posts);
    RAISE NOTICE 'Comments created: %', (SELECT COUNT(*) FROM public.comments);
    RAISE NOTICE 'Subscriptions created: %', (SELECT COUNT(*) FROM public.subscriptions);
    RAISE NOTICE 'Votes created: %', (SELECT COUNT(*) FROM public.votes);
    RAISE NOTICE '';
    RAISE NOTICE 'Test User Credentials:';
    RAISE NOTICE 'Email: test1@example.com, Password: password123';
    RAISE NOTICE 'Email: test2@example.com, Password: password123';
    RAISE NOTICE 'Email: test3@example.com, Password: password123';
    RAISE NOTICE '=========================';
END;
$$;