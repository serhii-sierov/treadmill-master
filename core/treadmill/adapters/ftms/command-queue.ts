import { BLE_COMMAND_INTERVAL_MS } from '@/core/treadmill/adapters/ftms/constants';

export class BleCommandQueue {
  private lastSentAt = 0;
  private chain: Promise<void> = Promise.resolve();

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.chain.then(async () => {
      const waitMs = BLE_COMMAND_INTERVAL_MS - (Date.now() - this.lastSentAt);
      if (waitMs > 0) {
        await delay(waitMs);
      }
      const result = await task();
      this.lastSentAt = Date.now();
      return result;
    });

    this.chain = run.then(
      () => undefined,
      () => undefined,
    );

    return run;
  }

  reset(): void {
    this.lastSentAt = 0;
    this.chain = Promise.resolve();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
