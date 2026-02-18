-- Align post/comment author references with public.users for anonymous participation

-- Ensure legacy post authors exist in users table
INSERT INTO public.users (id, username, email_hash, karma_points, age_verified)
SELECT DISTINCT p.author_id,
       COALESCE(p.author_name, 'legacy_post_' || LEFT(p.author_id::text, 8)),
       'migrated_post_' || p.author_id::text,
       0,
       TRUE
FROM public.posts p
LEFT JOIN public.users u ON u.id = p.author_id
WHERE p.author_id IS NOT NULL
  AND u.id IS NULL;

-- Ensure legacy comment authors exist in users table
INSERT INTO public.users (id, username, email_hash, karma_points, age_verified)
SELECT DISTINCT c.author_id,
       'legacy_comment_' || LEFT(c.author_id::text, 8),
       'migrated_comment_' || c.author_id::text,
       0,
       TRUE
FROM public.comments c
LEFT JOIN public.users u ON u.id = c.author_id
WHERE c.author_id IS NOT NULL
  AND u.id IS NULL;

-- Re-point foreign keys from profiles to users
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_author_id_fkey;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.comments
  DROP CONSTRAINT IF EXISTS comments_author_id_fkey;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Optionally align related indexes
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments(author_id);
