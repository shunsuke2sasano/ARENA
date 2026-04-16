# ARENA

> **独りよがりでも、迎合でもない。伝わる強さで競う。**

実写映像クリエイターが、知名度ではなく作品の強さで競うWebサービスです。

---

## 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [既存サービスとの差別化](#既存サービスとの差別化)
3. [主な機能](#主な機能)
4. [評価システム](#評価システム)
5. [技術スタック](#技術スタック)
6. [セットアップ手順](#セットアップ手順)
7. [環境変数](#環境変数)
8. [ディレクトリ構成](#ディレクトリ構成)
9. [バッジシステム](#バッジシステム)
10. [ロードマップ](#ロードマップ)

---

## プロジェクト概要

ARENAは、実写短編映像に特化したコンペティションプラットフォームです。
フォロワー数や再生回数ではなく、**作品そのものの力**を多層的に評価することで、真に実力のあるクリエイターが正当に評価される場を提供します。

### コンセプト

- **公平な競技の場**：月1回の匿名審査コンペで、知名度に左右されない評価を実現
- **多角的な評価**：視聴者・クリエイター・審査員の3層構造で作品の多面的な強さを可視化
- **成長の記録**：バッジ・実績システムとダッシュボードでクリエイターとしての歩みを記録

---

## 既存サービスとの差別化

| 観点 | YouTube / TikTok | 映画祭 | **ARENA** |
|------|-----------------|--------|-----------|
| 評価軸 | 再生数・フォロワー数 | 審査員のみ | 視聴者＋クリエイター＋審査員の3層 |
| 参加障壁 | 低い（誰でも投稿） | 高い（応募・審査） | 中程度（月次コンペに応募） |
| 公平性 | アルゴリズムに左右される | 審査員の主観 | 匿名審査期間で知名度バイアスを排除 |
| フィードバック | コメント | 講評のみ | 定量スコア＋レーダーチャート＋コメント |
| 成長記録 | なし | なし | バッジ・実績・ダッシュボード |

---

## 主な機能

### 月次コンペティション

- **月1回**開催の実写短編映像コンペ
- ラウンドには**テーマ**が設定され、クリエイターはそのテーマに沿った作品を提出
- ラウンドステータスは `open`（投稿受付）→ `reviewing`（評価期間）→ `published`（結果公開）の順に遷移
- コンペ回（`is_competition: true`）は審査員評価が加算される

### 3層評価構造

1. **視聴者評価**：誰でも参加できる感情ベースの評価
2. **クリエイター評価**：登録クリエイターによる専門的なピア評価
3. **審査員評価**：コンペ回のみ実施されるボーナス評価

### 匿名審査期間

- 評価期間中は投稿者のアイデンティティを非表示にすることで、知名度バイアスを排除

### クリエイターダッシュボード

- 投稿履歴・スコア推移・獲得バッジの一覧
- ラウンドごとの詳細分析

### バッジ・実績システム

- 初参加・連続出場・高スコア達成などの条件でバッジを自動付与
- プロフィールページでバッジコレクションを公開

---

## 評価システム

### 視聴者評価

視聴者は1作品につき1回、以下の3段階で投票します。

| 投票種別 | 点数 | 意味 |
|---------|-----|------|
| 良かった（good） | 1点 | 作品として楽しめた |
| 刺さった（touched） | 2点 | 心に響いた |
| 震えた（shook） | 3点 | 強烈に心を動かされた |

**視聴者スコア計算式：**

```
平均得点 = (good票数 × 1 + touched票数 × 2 + shook票数 × 3) / 総投票数
視聴者スコア = ROUND((平均得点 - 1.0) / 2.0 × 100.0, 2)
```

範囲：0〜100点

### クリエイター評価

クリエイター登録済みユーザーが、他のクリエイターの作品を5項目×5段階で評価します（自作品は評価不可）。

| 評価項目 | 説明 |
|---------|------|
| 引力（attraction） | 作品への引き込み力・没入感 |
| 伝達力（transmission） | メッセージ・意図の伝わり方 |
| 完成度（completion） | 技術的・表現的な仕上がり |
| 独自性（originality） | 他にない視点・表現の独自さ |
| 余韻（afterglow） | 視聴後も残る印象・余韻 |

結果はレーダーチャートで可視化されます。

**クリエイタースコア計算式：**

```
5項目平均 = (引力 + 伝達力 + 完成度 + 独自性 + 余韻) / 5
クリエイタースコア = ROUND((5項目平均 - 1.0) / 4.0 × 100.0, 2)
```

範囲：0〜100点

### 審査員評価

コンペ回のみ実施。審査員がボーナス点（0〜15点）と講評を付与します。

### 最終スコア計算式

```
ベーススコア = 視聴者スコア × 0.5 + クリエイタースコア × 0.5
最終スコア  = ベーススコア（+ 審査員ボーナス ※コンペ回のみ）
```

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router) + TypeScript |
| スタイリング | Tailwind CSS v4 |
| バックエンド・DB | Supabase（認証・PostgreSQL・Storage・Realtime） |
| デプロイ | Vercel（予定） |
| フォント | Bebas Neue / Inter / Noto Sans JP |

---

## セットアップ手順

### 前提条件

- Node.js 18以上
- npm
- Supabaseアカウント

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd ARENA
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com) にアクセスし、新しいプロジェクトを作成
2. プロジェクトの **URL** と **anon key**、**service_role key** をメモしておく

### 4. データベーススキーマの適用

Supabaseダッシュボードの **SQL Editor** を開き、以下のファイルを順番に実行します。

```
# 1. スキーマの作成
supabase/schema.sql

# 2. マイグレーションの適用
supabase/migrations/20260328_add_is_creator_to_profiles.sql
```

### 5. Storageバケットの設定

Supabaseダッシュボードの **Storage** から以下のバケットを作成してください。

| バケット名 | 公開設定 | 用途 |
|-----------|---------|------|
| `videos` | Public | 動画ファイル（最大2GB、mp4/mov/avi/webm/mpeg/mkv） |
| `thumbnails` | Public | サムネイル画像（最大5MB、jpeg/png/webp） |

### 6. 環境変数の設定

プロジェクトルートに `.env.local` を作成します。

```bash
cp .env.example .env.local
```

`.env.local` を編集して実際の値を設定してください（[環境変数の詳細](#環境変数)を参照）。

### 7. シードデータの投入（オプション）

開発・テスト用のサンプルデータを投入する場合は、Supabaseの SQL Editor で以下を実行します。

```
supabase/seed.sql
```

**テストアカウント（共通パスワード：`Arena#Test2025`）：**

| メールアドレス | 表示名 | 備考 |
|--------------|--------|------|
| yamada@arena-test.com | 山田 太郎 | ランク1・バッジ6個 |
| suzuki@arena-test.com | 鈴木 花子 | ランク2 |
| tanaka@arena-test.com | 田中 健二 | ランク3 |
| ito@arena-test.com | 伊藤 美咲 | ランク4 |
| sato@arena-test.com | 佐藤 龍 | ランク5 |

**テストラウンド：**

| ラウンド | ステータス | 内容 |
|---------|-----------|------|
| Vol.1「記憶」 | published | 5作品・投票・評価・スコア完備 |
| Vol.2「夜明け」 | reviewing | 4作品・一部投票あり |
| Vol.3「孤独」 | open | 3作品・投票なし |

### 8. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

---

## 環境変数

`.env.local` に以下の変数を設定してください。

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# アプリケーション
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 管理者設定（カンマ区切りでSupabaseのユーザーUUIDを指定）
ADMIN_USER_IDS=your-admin-user-uuid
```

| 変数名 | 必須 | 説明 |
|-------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | SupabaseプロジェクトのURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabaseの公開匿名キー（フロントエンドから使用） |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabaseのサービスロールキー（サーバーサイドのみ使用・絶対に公開しない） |
| `NEXT_PUBLIC_APP_URL` | ✅ | アプリのベースURL（認証コールバックに使用） |
| `ADMIN_USER_IDS` | ✅ | 管理者権限を付与するユーザーのUUID（複数の場合はカンマ区切り） |

---

## ディレクトリ構成

```
ARENA/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (main)/                   # メインルートグループ
│   │   │   ├── admin/                # 管理者ダッシュボード（ラウンド管理）
│   │   │   ├── dashboard/            # クリエイターダッシュボード
│   │   │   ├── profile/[username]/   # ユーザープロフィールページ
│   │   │   ├── ranking/              # ランキング・リーダーボード
│   │   │   ├── rounds/               # ラウンド一覧・詳細
│   │   │   │   ├── [id]/             # ラウンド詳細
│   │   │   │   ├── [id]/results/     # ラウンド結果ページ
│   │   │   │   └── [id]/videos/[videoId]/  # 動画視聴・評価
│   │   │   └── submit/               # 動画投稿ページ
│   │   ├── api/                      # APIルート
│   │   │   ├── admin/rounds/         # ラウンド作成・管理
│   │   │   ├── admin/rounds/[id]/status/   # ラウンドステータス更新
│   │   │   └── videos/               # 動画操作
│   │   └── auth/                     # 認証関連
│   │       ├── login/                # ログインページ
│   │       ├── register/             # 新規登録ページ
│   │       ├── callback/             # OAuthコールバック
│   │       └── error/                # 認証エラーページ
│   │
│   ├── components/
│   │   ├── admin/                    # 管理者用コンポーネント
│   │   │   ├── RoundCreateForm.tsx   # ラウンド作成フォーム
│   │   │   └── RoundStatusButton.tsx # ステータス変更ボタン
│   │   ├── auth/                     # 認証フォーム
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── dashboard/                # ダッシュボードコンポーネント
│   │   ├── layout/                   # レイアウト
│   │   │   ├── Header.tsx            # グローバルヘッダー
│   │   │   └── Marquee.tsx           # マーキーテキスト
│   │   ├── profile/
│   │   │   └── BadgeGrid.tsx         # バッジ一覧表示
│   │   ├── ui/                       # 汎用UIコンポーネント
│   │   └── video/                    # 動画関連コンポーネント
│   │       ├── VideoUploader.tsx     # 動画アップロード（Supabase Storage）
│   │       ├── StreamPlayer.tsx      # 動画プレーヤー
│   │       ├── VideoPlayerWithVote.tsx  # 投票付きプレーヤー
│   │       ├── ViewerVotePanel.tsx   # 視聴者投票UI
│   │       ├── EvaluateForm.tsx      # クリエイター評価フォーム
│   │       └── VideoCard.tsx         # 動画カード
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── admin.ts              # サービスロールクライアント（サーバー専用）
│   │   │   ├── client.ts             # ブラウザ用クライアント
│   │   │   ├── server.ts             # サーバーサイドクライアント
│   │   │   └── middleware.ts         # ミドルウェア用クライアント
│   │   ├── admin.ts                  # 管理者ユーティリティ
│   │   └── badges.ts                 # バッジ自動付与ロジック
│   │
│   ├── types/
│   │   └── database.ts               # Supabase DBの完全な型定義
│   │
│   └── middleware.ts                 # Next.jsミドルウェア（認証保護）
│
├── supabase/
│   ├── schema.sql                    # DBスキーマ（テーブル・関数・トリガー・RLS）
│   ├── seed.sql                      # テスト用シードデータ
│   └── migrations/
│       └── 20260328_add_is_creator_to_profiles.sql
│
├── public/                           # 静的アセット
├── .env.example                      # 環境変数テンプレート
├── next.config.ts                    # Next.js設定
├── postcss.config.mjs                # PostCSS設定（Tailwind v4）
├── tsconfig.json                     # TypeScript設定（strict mode）
└── package.json
```

### データベーステーブル

| テーブル | 説明 |
|---------|------|
| `profiles` | ユーザープロフィール（username, display_name, bio, theme_color, is_creator） |
| `rounds` | コンペラウンド（title, theme, status, is_competition, 投稿期間・評価期間） |
| `videos` | 投稿作品（動画パス・サムネイル・各種スコア・ランク） |
| `viewer_votes` | 視聴者投票（good / touched / shook、1ユーザー1票） |
| `creator_evaluations` | クリエイター評価（5項目×5段階、自作品評価不可） |
| `judge_evaluations` | 審査員評価（ボーナス点0〜15 + 講評） |
| `badges` | バッジ定義（name, description, icon, category） |
| `user_badges` | ユーザーへのバッジ付与履歴 |

### 主なDBトリガー・関数

| 名称 | 種別 | 説明 |
|------|------|------|
| `handle_new_user()` | トリガー | ユーザー登録時にprofilesレコードを自動作成 |
| `update_video_vote_counts()` | トリガー | 投票時にvotesの集計カラムをリアルタイム更新 |
| `calculate_viewer_score()` | 関数 | 視聴者スコアを計算 |
| `update_updated_at()` | トリガー | updated_atタイムスタンプを自動更新 |

---

## バッジシステム

バッジはラウンド終了時に `awardBadgesForRound()` 関数が条件を自動判定して付与します。

| バッジ名 | カテゴリ | 付与条件 |
|---------|---------|---------|
| 初陣 | action | 初めて作品を投稿 |
| 5回戦士 | action | 累計5回投稿 |
| 10回戦士 | action | 累計10回投稿 |
| 初の80点超え | score | 最終スコア80点以上を初達成 |
| 連続上昇 | score | 2ラウンド連続でスコアが向上 |
| 余韻の王 | item | 余韻スコアでラウンド最高評価を獲得 |
| 独自性の鬼 | item | 独自性スコアでラウンド最高評価を獲得 |
| 引力の帝王 | item | 引力スコアでラウンド最高評価を獲得 |
| コンペ優勝 | special | コンペ回で1位獲得 |
| 審査員特別賞 | special | 審査員から特別評価を受ける |

---

## ロードマップ

### 完了済み（MVP 全8ステップ）

- [x] **Step 1** - プロジェクト初期化（Next.js + Supabase + Tailwind CSS v4）
- [x] **Step 2** - 認証システム（メール/パスワード登録・ログイン・プロフィール自動作成）
- [x] **Step 3** - ラウンド管理（CRUD・ステータス遷移・管理者権限）
- [x] **Step 4** - 動画投稿（Supabase Storageへのアップロード・サムネイル）
- [x] **Step 5** - 視聴者投票（good/touched/shook・リアルタイム集計）
- [x] **Step 6** - クリエイター評価（5項目ピア評価・レーダーチャート）
- [x] **Step 7** - スコア計算・ランキング（DB関数・トリガーによる自動集計）
- [x] **Step 8** - バッジシステム（条件判定・自動付与・プロフィール表示）

### 未着手・今後の予定

- [ ] **Vercelデプロイ** - 本番環境への公開
- [ ] **メール認証** - 新規登録時のメール確認フロー
- [ ] **審査員ロール** - 審査員権限の管理とUIの実装
- [ ] **Cloudflare Stream移行** - 動画配信をSupabase StorageからCloudflare Streamへ変更
- [ ] **プロフィール編集UI** - テーマカラー・bio・アバター画像の設定画面
- [ ] **通知システム** - バッジ獲得・投票完了などの通知
- [ ] **モバイル最適化** - スマートフォン向けUIの改善
- [ ] **パフォーマンス最適化** - 動画ストリーミング・画像最適化
