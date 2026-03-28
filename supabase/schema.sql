-- ARENAデータベーススキーマ

-- ENUMs
CREATE TYPE theme_color AS ENUM ('orange', 'purple', 'teal', 'gray');
CREATE TYPE vote_type AS ENUM ('good', 'touched', 'shook');
CREATE TYPE round_status AS ENUM ('open', 'reviewing', 'published');
CREATE TYPE badge_category AS ENUM ('score', 'item', 'action', 'special');

-- プロフィールテーブル（auth.usersと1:1対応）
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  theme_color theme_color NOT NULL DEFAULT 'orange',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ラウンド（月次コンペ）テーブル
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  theme TEXT NOT NULL,
  description TEXT,
  status round_status NOT NULL DEFAULT 'open',
  is_competition BOOLEAN NOT NULL DEFAULT FALSE,
  submission_start TIMESTAMPTZ NOT NULL,
  submission_end TIMESTAMPTZ NOT NULL,
  review_start TIMESTAMPTZ NOT NULL,
  review_end TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 動画テーブル
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,      -- Supabase Storage内のパス
  thumbnail_path TEXT,                    -- サムネイル画像のパス（任意）
  duration_seconds INTEGER,
  -- スコア（結果発表後に集計）
  viewer_score NUMERIC(5,2),
  creator_score NUMERIC(5,2),
  judge_bonus NUMERIC(5,2),
  base_score NUMERIC(5,2),
  final_score NUMERIC(5,2),
  rank INTEGER,
  -- 投票集計（高速参照用）
  total_votes INTEGER NOT NULL DEFAULT 0,
  votes_good INTEGER NOT NULL DEFAULT 0,
  votes_touched INTEGER NOT NULL DEFAULT 0,
  votes_shook INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 1ラウンドに1人1作品
  UNIQUE(round_id, creator_id)
);

-- 視聴者投票テーブル
CREATE TABLE viewer_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type vote_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(video_id, voter_id)
);

-- クリエイター相互評価テーブル
CREATE TABLE creator_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attraction INTEGER NOT NULL CHECK (attraction BETWEEN 1 AND 5),
  transmission INTEGER NOT NULL CHECK (transmission BETWEEN 1 AND 5),
  completion INTEGER NOT NULL CHECK (completion BETWEEN 1 AND 5),
  originality INTEGER NOT NULL CHECK (originality BETWEEN 1 AND 5),
  afterglow INTEGER NOT NULL CHECK (afterglow BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(video_id, evaluator_id)
);

-- 審査員評価テーブル（コンペ回のみ）
CREATE TABLE judge_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bonus_score NUMERIC(4,2) NOT NULL CHECK (bonus_score BETWEEN 0 AND 15),
  critique TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(video_id, judge_id)
);

-- バッジ定義テーブル
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category badge_category NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ユーザーバッジ取得テーブル
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- インデックス
CREATE INDEX idx_videos_round_id ON videos(round_id);
CREATE INDEX idx_videos_creator_id ON videos(creator_id);
CREATE INDEX idx_videos_final_score ON videos(final_score DESC NULLS LAST);
CREATE INDEX idx_viewer_votes_video_id ON viewer_votes(video_id);
CREATE INDEX idx_viewer_votes_voter_id ON viewer_votes(voter_id);
CREATE INDEX idx_creator_evaluations_video_id ON creator_evaluations(video_id);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_viewer_votes_updated_at
  BEFORE UPDATE ON viewer_votes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_creator_evaluations_updated_at
  BEFORE UPDATE ON creator_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 新規ユーザー登録時にprofileを自動作成するトリガー
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 視聴者投票集計の自動更新トリガー
CREATE OR REPLACE FUNCTION update_video_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE videos SET
      total_votes = total_votes + 1,
      votes_good    = votes_good    + CASE WHEN NEW.vote_type = 'good'    THEN 1 ELSE 0 END,
      votes_touched = votes_touched + CASE WHEN NEW.vote_type = 'touched' THEN 1 ELSE 0 END,
      votes_shook   = votes_shook   + CASE WHEN NEW.vote_type = 'shook'   THEN 1 ELSE 0 END,
      updated_at = NOW()
    WHERE id = NEW.video_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE videos SET
      votes_good    = votes_good    + CASE WHEN NEW.vote_type='good'    THEN 1 ELSE 0 END - CASE WHEN OLD.vote_type='good'    THEN 1 ELSE 0 END,
      votes_touched = votes_touched + CASE WHEN NEW.vote_type='touched' THEN 1 ELSE 0 END - CASE WHEN OLD.vote_type='touched' THEN 1 ELSE 0 END,
      votes_shook   = votes_shook   + CASE WHEN NEW.vote_type='shook'   THEN 1 ELSE 0 END - CASE WHEN OLD.vote_type='shook'   THEN 1 ELSE 0 END,
      updated_at = NOW()
    WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE videos SET
      total_votes = total_votes - 1,
      votes_good    = votes_good    - CASE WHEN OLD.vote_type = 'good'    THEN 1 ELSE 0 END,
      votes_touched = votes_touched - CASE WHEN OLD.vote_type = 'touched' THEN 1 ELSE 0 END,
      votes_shook   = votes_shook   - CASE WHEN OLD.vote_type = 'shook'   THEN 1 ELSE 0 END,
      updated_at = NOW()
    WHERE id = OLD.video_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON viewer_votes
  FOR EACH ROW EXECUTE FUNCTION update_video_vote_counts();

-- スコア計算関数
CREATE OR REPLACE FUNCTION calculate_viewer_score(
  good_votes INTEGER, touched_votes INTEGER, shook_votes INTEGER
) RETURNS NUMERIC AS $$
DECLARE
  total INTEGER;
  avg_score NUMERIC;
BEGIN
  total := good_votes + touched_votes + shook_votes;
  IF total = 0 THEN RETURN NULL; END IF;
  avg_score := (good_votes * 1.0 + touched_votes * 2.0 + shook_votes * 3.0) / total;
  RETURN ROUND((avg_score - 1.0) / 2.0 * 100.0, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- RLS（Row Level Security）ポリシー
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewer_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Rounds
CREATE POLICY "rounds_select_all" ON rounds FOR SELECT USING (true);

-- Videos
CREATE POLICY "videos_select_all" ON videos FOR SELECT USING (true);
CREATE POLICY "videos_insert_own" ON videos FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "videos_update_own" ON videos FOR UPDATE USING (auth.uid() = creator_id);

-- Viewer votes
CREATE POLICY "viewer_votes_select_all" ON viewer_votes FOR SELECT USING (true);
CREATE POLICY "viewer_votes_insert_auth" ON viewer_votes FOR INSERT WITH CHECK (auth.uid() = voter_id);
CREATE POLICY "viewer_votes_update_own" ON viewer_votes FOR UPDATE USING (auth.uid() = voter_id);

-- Creator evaluations
CREATE POLICY "creator_evals_select_all" ON creator_evaluations FOR SELECT USING (true);
CREATE POLICY "creator_evals_insert_auth" ON creator_evaluations FOR INSERT
  WITH CHECK (
    auth.uid() = evaluator_id AND
    video_id NOT IN (SELECT id FROM videos WHERE creator_id = auth.uid())
  );
CREATE POLICY "creator_evals_update_own" ON creator_evaluations FOR UPDATE USING (auth.uid() = evaluator_id);

-- Judge evaluations
CREATE POLICY "judge_evals_select_all" ON judge_evaluations FOR SELECT USING (true);

-- Badges
CREATE POLICY "badges_select_all" ON badges FOR SELECT USING (true);
CREATE POLICY "user_badges_select_all" ON user_badges FOR SELECT USING (true);

-- デフォルトバッジデータ
INSERT INTO badges (name, description, icon, category) VALUES
  ('初陣',       '初めてARENAに作品を投稿した',                '⚔️', 'action'),
  ('5回戦士',    '5回参加した',                                '🏟️', 'action'),
  ('10回戦士',   '10回参加した',                               '🔥', 'action'),
  ('初の80点超え','初めてスコア80点以上を獲得した',             '🎯', 'score'),
  ('連続上昇',   '3回連続でスコアが上昇した',                  '📈', 'score'),
  ('余韻の王',   '余韻部門で最高評価を獲得した',               '🌊', 'item'),
  ('独自性の鬼', '独自性部門で最高評価を獲得した',             '👁️', 'item'),
  ('引力の帝王', '引力部門で最高評価を獲得した',               '🧲', 'item'),
  ('コンペ優勝', 'コンペ回で1位を獲得した',                   '👑', 'special'),
  ('審査員特別賞','審査員から特別賞を受賞した',                '🏆', 'special');

-- ========================================
-- Supabase Storage バケット設定
-- ========================================
-- SupabaseダッシュボードのStorage UIまたは以下SQLで設定:

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  2147483648,  -- 2GB
  ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mpeg', 'video/x-matroska']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails',
  'thumbnails',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS ポリシー
CREATE POLICY "videos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');

CREATE POLICY "videos_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'videos' AND auth.role() = 'authenticated'
  );

CREATE POLICY "videos_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "thumbnails_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'thumbnails');

CREATE POLICY "thumbnails_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'thumbnails' AND auth.role() = 'authenticated'
  );

-- ========================================
-- Supabase Realtime 有効化
-- ========================================
-- Supabaseダッシュボード > Database > Replication で
-- 以下のテーブルを Realtime Publication に追加してください:
--   - videos  (total_votes のリアルタイム更新に使用)
--
-- または以下のSQLを実行:
ALTER PUBLICATION supabase_realtime ADD TABLE videos;
