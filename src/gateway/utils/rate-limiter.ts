import { RateLimiterMemory } from 'rate-limiter-flexible';

export class RateLimiter {
  private limiters: Map<string, RateLimiterMemory> = new Map();

  constructor(
    private readonly points: number = 10,
    private readonly duration: number = 60, // in seconds
  ) {}

  allow(userId: string): boolean {
    if (!this.limiters.has(userId)) {
      this.limiters.set(
        userId,
        new RateLimiterMemory({
          points: this.points,
          duration: this.duration,
        }),
      );
    }

    const limiter = this.limiters.get(userId)!;

    try {
      limiter.consume(1); // 1 point per event
      return true;
    } catch {
      return false;
    }
  }
}
