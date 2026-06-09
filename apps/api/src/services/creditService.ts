import { supabaseAdmin } from '../lib/supabase.js';
import { AppError, PaymentRequired } from '../lib/errors.js';

/**
 * The single entry point for credit mutations. Both functions delegate to
 * race-safe SQL functions (see migration 0003) that update the balance and
 * write the credit_transactions row in one transaction. Never mutate
 * credits_balance directly elsewhere.
 */

/**
 * Charge one credit per video id, all-or-nothing. Throws PaymentRequired (402)
 * if the balance can't cover the whole batch. Returns the new balance.
 */
export async function deductCredits(userId: string, videoIds: string[]): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc('deduct_credits', {
    p_user_id: userId,
    p_video_ids: videoIds,
  });

  if (error) {
    // P0001 is raised by deduct_credits when the balance is insufficient.
    if (error.code === 'P0001' || /insufficient_credits/.test(error.message)) {
      throw PaymentRequired('Not enough credits for this render');
    }
    throw new AppError(500, 'credit_error', `Credit deduction failed: ${error.message}`);
  }
  return data ?? 0;
}

/** Refund one credit for a failed render. Best-effort; logs but never throws. */
export async function refundCredit(userId: string, videoId: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc('refund_credit', {
    p_user_id: userId,
    p_video_id: videoId,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error(`[credits] refund failed for user ${userId} video ${videoId}:`, error.message);
  }
}
