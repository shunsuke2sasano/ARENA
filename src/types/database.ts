export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ThemeColor = 'orange' | 'purple' | 'teal' | 'gray'
export type VoteType = 'good' | 'touched' | 'shook'
export type RoundStatus = 'open' | 'reviewing' | 'published'
export type BadgeCategory = 'score' | 'item' | 'action' | 'special'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          theme_color: ThemeColor
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          theme_color?: ThemeColor
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          theme_color?: ThemeColor
          updated_at?: string
        }
      }
      rounds: {
        Row: {
          id: string
          title: string
          theme: string
          description: string | null
          status: RoundStatus
          is_competition: boolean
          submission_start: string
          submission_end: string
          review_start: string
          review_end: string
          published_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          theme: string
          description?: string | null
          status?: RoundStatus
          is_competition?: boolean
          submission_start: string
          submission_end: string
          review_start: string
          review_end: string
          published_at?: string | null
          created_at?: string
        }
        Update: {
          title?: string
          theme?: string
          description?: string | null
          status?: RoundStatus
          is_competition?: boolean
          submission_start?: string
          submission_end?: string
          review_start?: string
          review_end?: string
          published_at?: string | null
        }
      }
      videos: {
        Row: {
          id: string
          round_id: string
          creator_id: string
          title: string
          cloudflare_video_id: string
          cloudflare_thumbnail_url: string | null
          duration_seconds: number | null
          viewer_score: number | null
          creator_score: number | null
          judge_bonus: number | null
          base_score: number | null
          final_score: number | null
          rank: number | null
          total_votes: number
          votes_good: number
          votes_touched: number
          votes_shook: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          round_id: string
          creator_id: string
          title: string
          cloudflare_video_id: string
          cloudflare_thumbnail_url?: string | null
          duration_seconds?: number | null
          viewer_score?: number | null
          creator_score?: number | null
          judge_bonus?: number | null
          base_score?: number | null
          final_score?: number | null
          rank?: number | null
          total_votes?: number
          votes_good?: number
          votes_touched?: number
          votes_shook?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          cloudflare_thumbnail_url?: string | null
          duration_seconds?: number | null
          viewer_score?: number | null
          creator_score?: number | null
          judge_bonus?: number | null
          base_score?: number | null
          final_score?: number | null
          rank?: number | null
          total_votes?: number
          votes_good?: number
          votes_touched?: number
          votes_shook?: number
          updated_at?: string
        }
      }
      viewer_votes: {
        Row: {
          id: string
          video_id: string
          voter_id: string
          vote_type: VoteType
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          video_id: string
          voter_id: string
          vote_type: VoteType
          created_at?: string
          updated_at?: string
        }
        Update: {
          vote_type?: VoteType
          updated_at?: string
        }
      }
      creator_evaluations: {
        Row: {
          id: string
          video_id: string
          evaluator_id: string
          attraction: number
          transmission: number
          completion: number
          originality: number
          afterglow: number
          comment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          video_id: string
          evaluator_id: string
          attraction: number
          transmission: number
          completion: number
          originality: number
          afterglow: number
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          attraction?: number
          transmission?: number
          completion?: number
          originality?: number
          afterglow?: number
          comment?: string | null
          updated_at?: string
        }
      }
      judge_evaluations: {
        Row: {
          id: string
          video_id: string
          judge_id: string
          bonus_score: number
          critique: string
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          judge_id: string
          bonus_score: number
          critique: string
          created_at?: string
        }
        Update: {
          bonus_score?: number
          critique?: string
        }
      }
      badges: {
        Row: {
          id: string
          name: string
          description: string
          icon: string
          category: BadgeCategory
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          icon: string
          category: BadgeCategory
          created_at?: string
        }
        Update: {
          name?: string
          description?: string
          icon?: string
          category?: BadgeCategory
        }
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_id: string
          video_id: string | null
          awarded_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_id: string
          video_id?: string | null
          awarded_at?: string
        }
        Update: never
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      theme_color: ThemeColor
      vote_type: VoteType
      round_status: RoundStatus
      badge_category: BadgeCategory
    }
  }
}
