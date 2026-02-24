import { ShakaAdapter } from "./adapters/shaka.js";
import { DashjsAdapter } from "./adapters/dashjs.js";
import { VideoMetrics, PlayerAdapter } from "./types.js";
import "./ui/Overlay.js";
import { OTTDiagnostics } from "./ui/Overlay.js";

export interface AnalyticsConfig {
    debug?: boolean;
    sampleInterval?: number; // How often to poll metrics (in ms)
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
    private config: AnalyticsConfig;
    private uiElement: OTTDiagnostics | null = null;

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
        if (!this.uiElement) {
            this.uiElement = document.createElement("ott-diagnostics") as OTTDiagnostics;
            parentElement.appendChild(this.uiElement);

            // Listen for our own metrics to update the UI
            this.onMetrics((metrics) => {
                if (this.uiElement) {
                    this.uiElement.update(metrics);
                }
            });
        }
    }

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
                const metrics: VideoMetrics = this.adapter.getMetrics();

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
     * Stops the heartbeat and clears references.
     * Call this when the player is destroyed to avoid memory leaks.
     */
    public detach(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        if (this.adapter) {
            this.adapter.destroy();
            this.adapter = null;
        }

        if (this.config.debug) {
            console.log("[OTTBasics] Analytics detached.");
        }
    }
}
