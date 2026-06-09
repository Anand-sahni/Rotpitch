/**
 * Shared domain types (hand-written, app-facing). Raw DB row types are
 * generated separately into ./db-types.ts via `pnpm db:gen-types`.
 */
import type { PlanId, VideoFormat } from './plans.js';

export type VideoStatus = 'pending' | 'processing' | 'done' | 'failed';
export type CreditTxType = 'signup' | 'purchase' | 'use' | 'refund';
export type PaymentGateway = 'razorpay' | 'stripe';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due';

export interface UserProfile {
  id: string;
  email: string;
  plan: PlanId;
  creditsBalance: number;
  creditsExpiresAt: string | null;
  billingCycleStart: string | null;
  createdAt: string;
}

export interface Video {
  id: string;
  userId: string;
  status: VideoStatus;
  inputUrl: string;
  outputUrl: string | null;
  backgroundStyle: string;
  format: VideoFormat;
  hasCaptions: boolean;
  hasVoiceover: boolean;
  hasWatermark: boolean;
  batchId: string | null;
  createdAt: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: CreditTxType;
  videoId: string | null;
  paymentId: string | null;
  createdAt: string;
}

/** Typed API error envelope (no stack traces leak to the client). */
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
