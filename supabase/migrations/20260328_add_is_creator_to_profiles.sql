-- =============================================================================
-- Migration: profiles に is_creator フラグを追加
-- =============================================================================

-- 1. カラム追加
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_creator BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. 既存データのバックフィル
--    すでに動画を1本以上投稿しているユーザーを is_creator = true にする
UPDATE profiles
SET is_creator = TRUE
WHERE id IN (
  SELECT DISTINCT creator_id FROM videos
);

-- 3. creator_evaluations の RLS ポリシーを更新
--    「認証済み & 自分の動画でない」→「is_creator=true & 認証済み & 自分の動画でない」
DROP POLICY IF EXISTS creator_evals_insert_auth ON creator_evaluations;

CREATE POLICY creator_evals_insert_auth ON creator_evaluations
  FOR INSERT
  WITH CHECK (
    auth.uid() = evaluator_id
    AND (
      SELECT is_creator FROM profiles WHERE id = auth.uid()
    ) = TRUE
    AND (
      SELECT creator_id FROM videos WHERE id = video_id
    ) <> auth.uid()
  );
