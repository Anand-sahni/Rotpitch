/**
 * Supabase database types.
 *
 * This file is OVERWRITTEN by `pnpm db:gen-types` once the Supabase project
 * exists (see packages/db). Until then it is a hand-maintained, faithful mirror
 * of migrations/0001_init.sql so the whole workspace type-checks. Keep it in
 * sync with the SQL if you edit the schema before running codegen.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type PlanEnum = 'free' | 'basic' | 'popular' | 'pro';
type VideoStatusEnum = 'pending' | 'processing' | 'done' | 'failed';
type VideoFormatEnum = 'vertical' | 'horizontal';
type CreditTxTypeEnum = 'signup' | 'purchase' | 'use' | 'refund' | 'reset';
type PaymentGatewayEnum = 'dodo';
type SubscriptionStatusEnum = 'active' | 'cancelled' | 'past_due';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          plan: PlanEnum;
          credits_balance: number;
          credits_expires_at: string | null;
          billing_cycle_start: string | null;
          dodo_customer_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          plan?: PlanEnum;
          credits_balance?: number;
          credits_expires_at?: string | null;
          billing_cycle_start?: string | null;
          dodo_customer_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
        Relationships: [];
      };
      videos: {
        Row: {
          id: string;
          user_id: string;
          status: VideoStatusEnum;
          input_url: string;
          output_url: string | null;
          background_style: string;
          format: VideoFormatEnum;
          has_captions: boolean;
          has_voiceover: boolean;
          has_watermark: boolean;
          batch_id: string | null;
          failure_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: VideoStatusEnum;
          input_url: string;
          output_url?: string | null;
          background_style: string;
          format: VideoFormatEnum;
          has_captions?: boolean;
          has_voiceover?: boolean;
          has_watermark?: boolean;
          batch_id?: string | null;
          failure_reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['videos']['Insert']>;
        Relationships: [];
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: CreditTxTypeEnum;
          video_id: string | null;
          payment_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: CreditTxTypeEnum;
          video_id?: string | null;
          payment_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['credit_transactions']['Insert']>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: PlanEnum;
          payment_gateway: PaymentGatewayEnum;
          gateway_subscription_id: string;
          status: SubscriptionStatusEnum;
          current_period_start: string;
          current_period_end: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan: PlanEnum;
          payment_gateway: PaymentGatewayEnum;
          gateway_subscription_id: string;
          status?: SubscriptionStatusEnum;
          current_period_start: string;
          current_period_end: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      deduct_credits: {
        Args: { p_user_id: string; p_video_ids: string[] };
        Returns: number;
      };
      refund_credit: {
        Args: { p_user_id: string; p_video_id: string };
        Returns: number;
      };
    };
    Enums: {
      plan: PlanEnum;
      video_status: VideoStatusEnum;
      video_format: VideoFormatEnum;
      credit_tx_type: CreditTxTypeEnum;
      payment_gateway: PaymentGatewayEnum;
      subscription_status: SubscriptionStatusEnum;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
