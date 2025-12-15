/**
 * Circuit Breaker pattern for protecting against cascading failures
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  resetTimeoutMs: number;        // Time to wait before trying again
  halfOpenMaxAttempts: number;   // Max attempts in half-open state
}

interface CircuitStatus {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  halfOpenAttempts: number;
}

// In-memory circuit states (resets on cold start, which is acceptable)
const circuits: Map<string, CircuitStatus> = new Map();

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 60000,  // 1 minute
  halfOpenMaxAttempts: 3,
};

export class CircuitBreakerError extends Error {
  constructor(circuitName: string, state: CircuitState) {
    super(`Circuit breaker '${circuitName}' is ${state}`);
    this.name = 'CircuitBreakerError';
  }
}

export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  config: Partial<CircuitBreakerConfig> = {}
): Promise<T> {
  const { failureThreshold, resetTimeoutMs, halfOpenMaxAttempts } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // Get or initialize circuit
  let circuit = circuits.get(name);
  if (!circuit) {
    circuit = {
      state: 'CLOSED',
      failures: 0,
      lastFailure: 0,
      halfOpenAttempts: 0,
    };
    circuits.set(name, circuit);
  }

  const now = Date.now();

  // Check circuit state
  if (circuit.state === 'OPEN') {
    // Check if enough time has passed to try again
    if (now - circuit.lastFailure >= resetTimeoutMs) {
      console.log(`[CircuitBreaker] ${name}: OPEN -> HALF_OPEN (attempting recovery)`);
      circuit.state = 'HALF_OPEN';
      circuit.halfOpenAttempts = 0;
    } else {
      const remainingMs = resetTimeoutMs - (now - circuit.lastFailure);
      console.log(`[CircuitBreaker] ${name}: OPEN - rejecting request (${Math.round(remainingMs / 1000)}s until retry)`);
      throw new CircuitBreakerError(name, 'OPEN');
    }
  }

  // Execute the function
  try {
    const result = await fn();

    // Success - reset circuit
    if (circuit.state === 'HALF_OPEN') {
      console.log(`[CircuitBreaker] ${name}: HALF_OPEN -> CLOSED (recovered)`);
    }
    circuit.state = 'CLOSED';
    circuit.failures = 0;
    circuit.halfOpenAttempts = 0;

    return result;
  } catch (error) {
    circuit.failures++;
    circuit.lastFailure = now;

    if (circuit.state === 'HALF_OPEN') {
      circuit.halfOpenAttempts++;
      
      if (circuit.halfOpenAttempts >= halfOpenMaxAttempts) {
        console.log(`[CircuitBreaker] ${name}: HALF_OPEN -> OPEN (recovery failed after ${halfOpenMaxAttempts} attempts)`);
        circuit.state = 'OPEN';
      }
    } else if (circuit.failures >= failureThreshold) {
      console.log(`[CircuitBreaker] ${name}: CLOSED -> OPEN (${failureThreshold} failures)`);
      circuit.state = 'OPEN';
    }

    throw error;
  }
}

/**
 * Get current circuit status (useful for health checks)
 */
export function getCircuitStatus(name: string): CircuitStatus | undefined {
  return circuits.get(name);
}

/**
 * Manually reset a circuit (useful for admin actions)
 */
export function resetCircuit(name: string): void {
  circuits.delete(name);
  console.log(`[CircuitBreaker] ${name}: Manually reset`);
}
