import type {
  DiscoveredTreadmill,
  TreadmillAdapter,
  TreadmillState,
} from "@/core/treadmill/types";

export class MockTreadmillAdapter implements TreadmillAdapter {
  private state: TreadmillState = {
    connected: false,
    mode: "mock",
    speedKmh: 0,
    inclinePercent: 0,
    isRunning: false,
    distanceKm: 0,
    calories: 0,
  };

  private readonly listeners = new Set<(state: TreadmillState) => void>();
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  getMode(): "mock" {
    return "mock";
  }

  isBleAvailable(): boolean {
    return false;
  }

  async scan(): Promise<DiscoveredTreadmill[]> {
    return [
      {
        id: "mock-treadmill",
        name: "Mock Treadmill (simulator)",
        rssi: null,
      },
    ];
  }

  async connect(deviceId: string): Promise<void> {
    await delay(400);
    this.updateState({
      connected: true,
      deviceId: deviceId ?? "mock-treadmill",
      deviceName: "Mock Treadmill",
      mode: "mock",
    });
    this.startTicking();
  }

  async reconnectLast(): Promise<void> {
    await this.connect("mock-treadmill");
  }

  async disconnect(): Promise<void> {
    this.stopTicking();
    this.updateState({
      connected: false,
      deviceId: undefined,
      deviceName: undefined,
      isRunning: false,
      speedKmh: 0,
      inclinePercent: 0,
    });
  }

  async start(): Promise<void> {
    this.ensureConnected();
    this.updateState({ isRunning: true });
  }

  async stop(): Promise<void> {
    this.ensureConnected();
    this.updateState({ isRunning: false, speedKmh: 0 });
  }

  async pause(): Promise<void> {
    this.ensureConnected();
    this.updateState({ isRunning: false, speedKmh: 0 });
  }

  async setSpeed(speedKmh: number): Promise<void> {
    this.ensureConnected();
    await delay(150);
    this.updateState({ speedKmh, targetSpeedKmh: speedKmh });
  }

  async setIncline(inclinePercent: number): Promise<void> {
    this.ensureConnected();
    await delay(150);
    this.updateState({ inclinePercent, targetInclinePercent: inclinePercent });
  }

  async applySegmentTargets(speedKmh: number, inclinePercent: number): Promise<void> {
    this.ensureConnected();
    await this.setIncline(inclinePercent);
    await this.setSpeed(speedKmh);
  }

  async startSegment(
    speedKmh: number,
    inclinePercent: number,
    _options?: { forceColdStart?: boolean },
  ): Promise<void> {
    this.ensureConnected();
    await this.applySegmentTargets(speedKmh, inclinePercent);
    await this.start();
  }

  clearFtmsStopReason(): void {
    this.updateState({ ftmsStopReason: null });
  }

  clearFtmsSessionEvent(): void {
    // no-op
  }

  resetTrainingSessionAfterEmergency(): void {
    this.updateState({
      isRunning: false,
      speedKmh: 0,
      inclinePercent: 0,
      targetSpeedKmh: undefined,
      targetInclinePercent: undefined,
      ftmsSessionPhase: 'idle',
      ftmsStopReason: null,
    });
  }

  isAppResumeInFlight(): boolean {
    return false;
  }

  getState(): TreadmillState {
    return { ...this.state };
  }

  subscribe(listener: (state: TreadmillState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private ensureConnected(): void {
    if (!this.state.connected) {
      throw new Error("Treadmill is not connected.");
    }
  }

  private updateState(patch: Partial<TreadmillState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener(this.getState()));
  }

  private startTicking(): void {
    if (this.tickInterval) {
      return;
    }

    this.tickInterval = setInterval(() => {
      if (!this.state.isRunning || this.state.speedKmh <= 0) {
        return;
      }

      this.updateState({
        distanceKm: this.state.distanceKm + this.state.speedKmh / 3600,
        calories: this.state.calories + this.state.speedKmh * 0.08,
      });
    }, 1000);
  }

  private stopTicking(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
