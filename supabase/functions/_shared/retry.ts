/**
 * Retry utility with exponential backoff
 * Use for external API calls (Stripe, Resend, etc.)
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryOn?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    retryOn = () => true,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      const shouldRetry = attempt < maxAttempts && retryOn(lastError);
      
      if (!shouldRetry) {
        throw lastError;
      }

      // Calculate delay with exponential backoff + jitter
      const baseDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
      const jitter = Math.random() * 0.3 * baseDelay; // 0-30% jitter
      const delay = Math.min(baseDelay + jitter, maxDelayMs);

      // Notify about retry
      onRetry?.(attempt, lastError, delay);
      
      console.log(`[Retry] Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. Retrying in ${Math.round(delay)}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Default retry condition for Stripe errors
 */
export function isRetryableStripeError(error: Error): boolean {
  const message = error.message.toLowerCase();
  const statusCode = (error as any).statusCode || (error as any).status;
  
  // Retry on network errors
  if (message.includes('network') || message.includes('econnreset') || message.includes('timeout')) {
    return true;
  }
  
  // Retry on rate limits (429)
  if (statusCode === 429) {
    return true;
  }
  
  // Retry on server errors (500, 502, 503, 504)
  if (statusCode >= 500 && statusCode < 600) {
    return true;
  }
  
  // Don't retry on client errors (400, 401, 402, 404, etc.)
  return false;
}

/**
 * Default retry condition for Resend/email errors
 */
export function isRetryableEmailError(error: Error): boolean {
  const message = error.message.toLowerCase();
  const statusCode = (error as any).statusCode || (error as any).status;
  
  if (message.includes('network') || message.includes('timeout')) {
    return true;
  }
  
  if (statusCode === 429 || (statusCode >= 500 && statusCode < 600)) {
    return true;
  }
  
  return false;
}
