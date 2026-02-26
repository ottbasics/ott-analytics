import { ShakaAdapter } from "./adapters/shaka.js";
import { DashjsAdapter } from "./adapters/dashjs.js";
import { VideoMetrics, PlayerAdapter } from "./types.js";
import "./ui/Overlay.js";
import { OTTDiagnostics } from "./ui/Overlay.js";

export interface SpeedTestConfig {
    url?: string; // Optional URL to a known file for speed testing (e.g., a small image or text file on the same server)
    interval?: number; // How often to check for network speed (in millis)
}

export interface AnalyticsConfig {
    debug?: boolean;
    sampleInterval?: number; // How often to poll metrics (in millis)
    speedTest?: SpeedTestConfig;
}

type MetricsListener = (metrics: VideoMetrics) => void;

/**
 * OTTAnalytics: The core engine of the @ottbasics library.
 * It acts as a controller that attaches to a video player and
 * emits unified metrics via standard DOM events.
 */
export class OTTAnalytics {
    private listeners: MetricsListener[] = [];
    private adapter: PlayerAdapter | null = null;
    private intervalId: any = null;
    private speedTestIntervalId: any = null;
    private config: AnalyticsConfig;
    private uiElement: OTTDiagnostics | null = null;
    private lastMeasuredSpeed: number = 0; // New: Stores the last bps result

    constructor(config: AnalyticsConfig = {}) {
        this.config = {
            debug: false,
            sampleInterval: 1000,
            ...config
        };
    }

    // Allows users to subscribe directly to this instance
    public onMetrics(callback: MetricsListener): void {
        this.listeners.push(callback);
    }

    public showOverlay(parentElement: HTMLElement = document.body): void {
        //Remove any existing overlay
        const uiElement = document.querySelector("ott-diagnostics");
        if (uiElement) {
            uiElement.remove();
        }

        //Create a new overlay
        this.uiElement = document.createElement("ott-diagnostics") as OTTDiagnostics;
        parentElement.appendChild(this.uiElement);

        // Listen for our own metrics to update the UI
        this.onMetrics((metrics) => {
            if (this.uiElement) {
                this.uiElement.update(metrics);
            }
        });
    }

    public hideOverlay() {}

    /**
     * Attaches the analytics engine to a supported player instance.
     * Uses duck-typing to detect if the player is Shaka or Dash.js.
     */
    public attach(player: any, video: HTMLVideoElement): void {
        // 1. Safety: If already attached, detach first to prevent leaks
        if (this.intervalId) {
            this.detach();
        }

        // 2. Identify and initialize the correct adapter
        if (this.isShaka(player)) {
            this.adapter = new ShakaAdapter(player, video);
        } else if (this.isDashjs(player)) {
            this.adapter = new DashjsAdapter(player, video);
        } else {
            throw new Error("[OTTBasics] Unsupported player type. Must be Shaka or Dash.js.");
        }

        if (this.config.debug) {
            console.log(`[OTTBasics] Successfully attached to ${this.adapter.name}`);
        }

        // 3. Start the polling heartbeat
        this.startHeartbeat();

        // 4. Optionally start the speed test timer
        if (this.config.speedTest?.interval) {
            this.startSpeedTestTimer();
        }
    }

    private isShaka(p: any): boolean {
        return !!(p.getNetworkingEngine && p.seekRange);
    }

    private isDashjs(p: any): boolean {
        return !!(p.getDashMetrics && p.getDashAdapter);
    }

    private startHeartbeat(): void {
        this.intervalId = setInterval(() => {
            if (!this.adapter) return;

            try {
                const playerMetrics = this.adapter.getMetrics();

                const metrics: VideoMetrics = {
                    ...playerMetrics,
                    networkSpeed: this.lastMeasuredSpeed
                };

                if (this.config.debug) {
                    console.debug("[OTTBasics Update]", metrics);
                }

                this.emit(metrics);
            } catch (error) {
                console.error("[OTTBasics] Failed to collect metrics:", error);
            }
        }, this.config.sampleInterval);
    }

    /**
     * Dispatches a CustomEvent to the window object.
     * This allows any part of the app (React/Vue/Vanilla) to listen for updates.
     */
    private emit(metrics: VideoMetrics): void {
        const event = new CustomEvent("ott-metrics-update", {
            detail: {
                ...metrics,
                timestamp: Date.now(),
                playerType: this.adapter?.name
            }
        });
        //window.dispatchEvent(event);
        this.listeners.forEach((cb) => cb(metrics));
    }

    /**
     * Performs a one-time "Burst" speed test to measure raw capacity.
     * We use a 5MB chunk to ensure the TCP window opens up enough for accuracy.
     */
    public async runSpeedTest(): Promise<number> {
        const testUrl = this.config.speedTest?.url || `https://speed.cloudflare.com/__down?bytes=5000000&cb=${Date.now()}`;

        const start = performance.now();
        try {
            const response = await fetch(testUrl);
            const buffer = await response.arrayBuffer();
            const end = performance.now();

            const durationSec = (end - start) / 1000;
            const bits = buffer.byteLength * 8;
            const bps = bits / durationSec;

            return bps;
        } catch (e) {
            console.error("Manual speed test failed", e);
            return 0;
        }
    }

    private async startSpeedTestTimer(): Promise<void> {
        let interval = this.config.speedTest?.interval || 0;
        if (interval > 0) {
            interval = Math.max(5000, interval); // Minimum 5 seconds to avoid spamming
            this.speedTestIntervalId = setInterval(async () => {
                const speed = await this.runSpeedTest();
                this.lastMeasuredSpeed = speed;
                if (this.config.debug) {
                    console.debug(`[OTTBasics] Speed Test Result: ${speed.toFixed(2)} bps`);
                }
                // Optionally, you could emit this as a separate event or include it in the regular metrics
            }, interval);
        }
    }

    /**
     * Stops the heartbeat and clears references.
     * Call this when the player is destroyed to avoid memory leaks.
     */
    public detach(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        if (this.speedTestIntervalId) {
            clearInterval(this.speedTestIntervalId);
            this.speedTestIntervalId = null;
        }

        if (this.adapter) {
            this.adapter.destroy();
            this.adapter = null;
        }

        // Clear listeners and reset speed
        this.listeners = [];
        this.lastMeasuredSpeed = 0;

        if (this.config.debug) {
            console.log("[OTTBasics] Analytics detached.");
        }
    }
}
