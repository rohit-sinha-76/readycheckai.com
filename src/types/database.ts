/**
 * ReadyCheck AI - Database Schema Types
 * Phase 5: Comprehensive TypeScript Architecture
 * Auto-generated from Supabase schema
 */

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          public_id: string | null
          profile_is_public: boolean | null
          date_of_birth: string | null
          bio: string | null
          location: string | null
          website_url: string | null
          linkedin_url: string | null
          github_url: string | null
          timezone: string | null
          locale: string | null
          account_status: 'active' | 'suspended' | 'banned' | 'pending_verification'
          email_verified: boolean
          phone_verified: boolean | null
          job_title: string | null
          company: string | null
          industry: string | null
          experience_level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null
          subscription_status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing'
          subscription_tier: 'free' | 'pro' | 'enterprise'
          subscription_expires_at: string | null
          preferences: Json | null
          created_at: string
          updated_at: string
          last_login_at: string | null
          last_active_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          public_id?: string | null
          profile_is_public?: boolean | null
          date_of_birth?: string | null
          bio?: string | null
          location?: string | null
          website_url?: string | null
          linkedin_url?: string | null
          github_url?: string | null
          timezone?: string | null
          locale?: string | null
          account_status?: 'active' | 'suspended' | 'banned' | 'pending_verification'
          email_verified?: boolean
          phone_verified?: boolean | null
          job_title?: string | null
          company?: string | null
          industry?: string | null
          experience_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null
          subscription_status?: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing'
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          subscription_expires_at?: string | null
          preferences?: Json | null
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
          last_active_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          public_id?: string | null
          profile_is_public?: boolean | null
          date_of_birth?: string | null
          bio?: string | null
          location?: string | null
          website_url?: string | null
          linkedin_url?: string | null
          github_url?: string | null
          timezone?: string | null
          locale?: string | null
          account_status?: 'active' | 'suspended' | 'banned' | 'pending_verification'
          email_verified?: boolean
          phone_verified?: boolean | null
          job_title?: string | null
          company?: string | null
          industry?: string | null
          experience_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null
          subscription_status?: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing'
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          subscription_expires_at?: string | null
          preferences?: Json | null
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
          last_active_at?: string | null
        }
      }
      assessment_categories: {
        Row: {
          id: string
          category_name: string
          description: string
          icon: string | null
          color: string | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_name: string
          description: string
          icon?: string | null
          color?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_name?: string
          description?: string
          icon?: string | null
          color?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          question_key: string
          question_text: string
          question_format: 'multiple_choice' | 'multiple_select' | 'true_false' | 'case_study' | 'scenario_based' | 'drag_drop' | 'code_review'
          difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          category_id: string
          subcategory_id: string | null
          tags: string[] | null
          time_allocation_seconds: number
          points: number
          complexity_score: number
          is_active: boolean
          question_type: 'practice' | 'certification' | 'both'
          certification_levels: string[] | null
          options: Json | null
          correct_answer_index: number | null
          correct_answer_text: string | null
          explanation: string | null
          case_study_materials: Json | null
          code_snippet: string | null
          media_urls: string[] | null
          metadata: Json | null
          created_at: string
          updated_at: string
          created_by: string
          reviewed_by: string | null
          last_reviewed_at: string | null
        }
        Insert: {
          id?: string
          question_key: string
          question_text: string
          question_format: 'multiple_choice' | 'multiple_select' | 'true_false' | 'case_study' | 'scenario_based' | 'drag_drop' | 'code_review'
          difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          category_id: string
          subcategory_id?: string | null
          tags?: string[] | null
          time_allocation_seconds: number
          points: number
          complexity_score?: number
          is_active?: boolean
          question_type?: 'practice' | 'certification' | 'both'
          certification_levels?: string[] | null
          options?: Json | null
          correct_answer_index?: number | null
          correct_answer_text?: string | null
          explanation?: string | null
          case_study_materials?: Json | null
          code_snippet?: string | null
          media_urls?: string[] | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          created_by: string
          reviewed_by?: string | null
          last_reviewed_at?: string | null
        }
        Update: {
          id?: string
          question_key?: string
          question_text?: string
          question_format?: 'multiple_choice' | 'multiple_select' | 'true_false' | 'case_study' | 'scenario_based' | 'drag_drop' | 'code_review'
          difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          category_id?: string
          subcategory_id?: string | null
          tags?: string[] | null
          time_allocation_seconds?: number
          points?: number
          complexity_score?: number
          is_active?: boolean
          question_type?: 'practice' | 'certification' | 'both'
          certification_levels?: string[] | null
          options?: Json | null
          correct_answer_index?: number | null
          correct_answer_text?: string | null
          explanation?: string | null
          case_study_materials?: Json | null
          code_snippet?: string | null
          media_urls?: string[] | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string
          reviewed_by?: string | null
          last_reviewed_at?: string | null
        }
      }
      assessment_sessions: {
        Row: {
          id: string
          user_id: string
          assessment_type: 'practice' | 'certification'
          certification_level: 'RCAF' | 'RCAP' | 'RCGS' | 'RCSA' | null
          category_id: string | null
          status: 'not_started' | 'in_progress' | 'completed' | 'expired' | 'abandoned'
          token: string
          fingerprint: string
          started_at: string
          expires_at: string
          completed_at: string | null
          time_limit_minutes: number
          time_spent_seconds: number | null
          total_questions: number
          current_question_index: number | null
          questions_answered: number | null
          question_ids: string[] | null
          answers: Json | null
          score: number | null
          passed: boolean | null
          honor_code_accepted: boolean
          honor_code_accepted_at: string | null
          violations: Json | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          assessment_type: 'practice' | 'certification'
          certification_level?: 'RCAF' | 'RCAP' | 'RCGS' | 'RCSA' | null
          category_id?: string | null
          status?: 'not_started' | 'in_progress' | 'completed' | 'expired' | 'abandoned'
          token: string
          fingerprint: string
          started_at?: string
          expires_at: string
          completed_at?: string | null
          time_limit_minutes: number
          time_spent_seconds?: number | null
          total_questions: number
          current_question_index?: number | null
          questions_answered?: number | null
          question_ids?: string[] | null
          answers?: Json | null
          score?: number | null
          passed?: boolean | null
          honor_code_accepted: boolean
          honor_code_accepted_at?: string | null
          violations?: Json | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          assessment_type?: 'practice' | 'certification'
          certification_level?: 'RCAF' | 'RCAP' | 'RCGS' | 'RCSA' | null
          category_id?: string | null
          status?: 'not_started' | 'in_progress' | 'completed' | 'expired' | 'abandoned'
          token?: string
          fingerprint?: string
          started_at?: string
          expires_at?: string
          completed_at?: string | null
          time_limit_minutes?: number
          time_spent_seconds?: number | null
          total_questions?: number
          current_question_index?: number | null
          questions_answered?: number | null
          question_ids?: string[] | null
          answers?: Json | null
          score?: number | null
          passed?: boolean | null
          honor_code_accepted?: boolean
          honor_code_accepted_at?: string | null
          violations?: Json | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      user_certificates: {
        Row: {
          id: string
          user_id: string
          certification_level: 'RCAF' | 'RCAP' | 'RCGS' | 'RCSA'
          session_id: string
          score: number
          passed_at: string
          expires_at: string | null
          verification_code: string
          certificate_url: string | null
          is_revoked: boolean
          revoked_at: string | null
          revoked_reason: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          certification_level: 'RCAF' | 'RCAP' | 'RCGS' | 'RCSA'
          session_id: string
          score: number
          passed_at: string
          expires_at?: string | null
          verification_code: string
          certificate_url?: string | null
          is_revoked?: boolean
          revoked_at?: string | null
          revoked_reason?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          certification_level?: 'RCAF' | 'RCAP' | 'RCGS' | 'RCSA'
          session_id?: string
          score?: number
          passed_at?: string
          expires_at?: string | null
          verification_code?: string
          certificate_url?: string | null
          is_revoked?: boolean
          revoked_at?: string | null
          revoked_reason?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      honor_code_violations: {
        Row: {
          id: string
          user_id: string
          session_id: string
          violation_type: 'tab_switch' | 'window_blur' | 'copy_paste' | 'right_click' | 'dev_tools' | 'screenshot' | 'multiple_sessions' | 'suspicious_timing' | 'pattern_recognition'
          severity: 'low' | 'medium' | 'high' | 'critical'
          question_index: number | null
          details: Json | null
          automatic_action: 'warning' | 'flag' | 'terminate' | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id: string
          violation_type: 'tab_switch' | 'window_blur' | 'copy_paste' | 'right_click' | 'dev_tools' | 'screenshot' | 'multiple_sessions' | 'suspicious_timing' | 'pattern_recognition'
          severity: 'low' | 'medium' | 'high' | 'critical'
          question_index?: number | null
          details?: Json | null
          automatic_action?: 'warning' | 'flag' | 'terminate' | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string
          violation_type?: 'tab_switch' | 'window_blur' | 'copy_paste' | 'right_click' | 'dev_tools' | 'screenshot' | 'multiple_sessions' | 'suspicious_timing' | 'pattern_recognition'
          severity?: 'low' | 'medium' | 'high' | 'critical'
          question_index?: number | null
          details?: Json | null
          automatic_action?: 'warning' | 'flag' | 'terminate' | null
          created_at?: string
        }
      }
      question_access_log: {
        Row: {
          id: string
          user_id: string
          question_id: string
          session_id: string
          accessed_at: string
          time_spent_seconds: number | null
          answer_correct: boolean | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          question_id: string
          session_id: string
          accessed_at?: string
          time_spent_seconds?: number | null
          answer_correct?: boolean | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          question_id?: string
          session_id?: string
          accessed_at?: string
          time_spent_seconds?: number | null
          answer_correct?: boolean | null
          metadata?: Json | null
        }
      }
      audit_log: {
        Row: {
          id: string
          table_name: string
          operation: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data: Json | null
          new_data: Json | null
          user_id: string | null
          timestamp: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          table_name: string
          operation: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data?: Json | null
          new_data?: Json | null
          user_id?: string | null
          timestamp?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          table_name?: string
          operation?: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data?: Json | null
          new_data?: Json | null
          user_id?: string | null
          timestamp?: string
          metadata?: Json | null
        }
      }
    }
    Views: {
      user_certification_summary: {
        Row: {
          user_id: string
          total_certifications: number
          active_certifications: number
          highest_level: string | null
          latest_certification_date: string | null
          average_score: number | null
        }
      }
      question_analytics: {
        Row: {
          question_id: string
          total_attempts: number
          correct_attempts: number
          success_rate: number
          average_time_spent: number
          difficulty_rating: number
          last_analyzed_at: string
        }
      }
      assessment_performance: {
        Row: {
          user_id: string
          assessment_type: string
          category_id: string | null
          total_sessions: number
          completed_sessions: number
          average_score: number
          best_score: number
          total_time_spent: number
          last_assessment_date: string | null
        }
      }
    }
    Functions: {
      get_user_certification_progress: {
        Args: { user_id: string }
        Returns: {
          level_code: string
          level_name: string
          status: string
          attempts: number
          max_attempts: number
          best_score: number | null
          next_attempt_at: string | null
          prerequisites_met: boolean
        }[]
      }
      validate_certification_prerequisites: {
        Args: { 
          user_id: string
          level_code: string 
        }
        Returns: {
          is_valid: boolean
          missing_prerequisites: string[]
          subscription_valid: boolean
        }
      }
      calculate_assessment_score: {
        Args: {
          session_id: string
          answers: Json
        }
        Returns: {
          score: number
          correct_answers: number
          total_questions: number
          category_breakdown: Json
        }
      }
      issue_certificate: {
        Args: {
          user_id: string
          session_id: string
          certification_level: string
          score: number
        }
        Returns: {
          certificate_id: string
          verification_code: string
          certificate_url: string
        }
      }
      verify_certificate: {
        Args: { verification_code: string }
        Returns: {
          is_valid: boolean
          certificate_details: Json | null
        }
      }
      get_assessment_questions: {
        Args: {
          assessment_type: string
          certification_level: string | null
          category_id: string | null
          user_id: string
        }
        Returns: {
          question_id: string
          question_text: string
          question_format: string
          options: Json | null
          time_allocation: number
          points: number
        }[]
      }
      record_honor_code_violation: {
        Args: {
          user_id: string
          session_id: string
          violation_type: string
          severity: string
          details: Json
        }
        Returns: {
          violation_id: string
          automatic_action: string | null
        }
      }
      cleanup_expired_sessions: {
        Args: Record<string, never>
        Returns: { cleaned_sessions: number }
      }
      refresh_user_certification_summary: {
        Args: Record<string, never>
        Returns: { refreshed_at: string }
      }
      analyze_database_performance: {
        Args: Record<string, never>
        Returns: {
          data: Json
        }
      }
      security_health_check: {
        Args: Record<string, never>
        Returns: {
          check_name: string
          status: string
          details: Json
          severity: string
        }[]
      }
    }
    Enums: {
      assessment_status: 'not_started' | 'in_progress' | 'completed' | 'expired' | 'abandoned'
      assessment_type: 'practice' | 'certification'
      certification_level: 'RCAF' | 'RCAP' | 'RCGS' | 'RCSA'
      question_difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
      question_format: 'multiple_choice' | 'multiple_select' | 'true_false' | 'case_study' | 'scenario_based' | 'drag_drop' | 'code_review'
      question_type: 'practice' | 'certification' | 'both'
      subscription_status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing'
      subscription_tier: 'free' | 'pro' | 'enterprise'
      account_status: 'active' | 'suspended' | 'banned' | 'pending_verification'
      violation_type: 'tab_switch' | 'window_blur' | 'copy_paste' | 'right_click' | 'dev_tools' | 'screenshot' | 'multiple_sessions' | 'suspicious_timing' | 'pattern_recognition'
      violation_severity: 'low' | 'medium' | 'high' | 'critical'
      automatic_action: 'warning' | 'flag' | 'terminate'
    }
  }
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Tables = Database['public']['Tables']
export type Views = Database['public']['Views'] 
export type Functions = Database['public']['Functions']
export type Enums = Database['public']['Enums']

export default Database
