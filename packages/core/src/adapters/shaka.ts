import { PlayerAdapter, VideoMetrics } from "../types.js";

export class ShakaAdapter implements PlayerAdapter {
    public name = "shaka";

    constructor(private player: any, private video: HTMLVideoElement) {}

    public getMetrics(): VideoMetrics {
        // Modern Shaka uses seekRange() for the live window boundaries
        const seekRange = this.player.seekRange();
        const manifestEdge = seekRange.end;

        // Wall-clock vs Playhead for Latency
        const wallClockNow = Date.now();
        const playheadTimeAsDate = this.player.getPlayheadTimeAsDate()?.getTime() || 0;

        // manifestLiveGap: Distance from the very end of the seekable window to current playhead
        const manifestLiveGap = Math.max(0, manifestEdge - this.video.currentTime);

        // Latency in seconds (Wall clock - current playhead as date)
        const latency = playheadTimeAsDate > 0 ? (wallClockNow - playheadTimeAsDate) / 1000 : 0;

        const metrics: VideoMetrics = {
            latency: latency,
            manifestLiveGap: manifestLiveGap,
            bufferLevel: this.getBuffer(),
            isLowLatency: this.detectLL(),
            bandwidth: this.player.getStats().estimatedBandwidth || 0,
            // resolution: this.getResolution(),
            playbackRate: this.video.playbackRate,
            playerState: this.video.paused ? "Paused" : "Playing",
            drift: 0 // Typically calculated by comparing playhead to a sync source
        };

        return metrics;
    }

    /**
     * To detect LL, we must access the internal timeline via the Manifest.
     * ATO (Availability Time Offset) > 0 is the standard signal for LL-DASH.
     */
    private detectLL(): boolean {
        const manifest = this.player.getManifest();
        if (!manifest || !manifest.presentationTimeline) return false;

        const timeline = manifest.presentationTimeline;
        // In Shaka's internal timeline, a delay under ~5s usually indicates
        // a Low Latency configuration or Tuned Live stream.
        return timeline.getDelay() < 5;
    }

    private getBuffer(): number {
        const buffered = this.video.buffered;
        const currentTime = this.video.currentTime;

        for (let i = 0; i < buffered.length; i++) {
            if (currentTime >= buffered.start(i) && currentTime <= buffered.end(i)) {
                return buffered.end(i) - currentTime;
            }
        }
        return 0;
    }

    private getResolution(): string {
        const tracks = this.player.getVariantTracks();
        const activeTrack = tracks.find((t: any) => t.active);
        return activeTrack ? `${activeTrack.width}x${activeTrack.height}` : "0x0";
    }

    public destroy(): void {
        // Cleanup if you added event listeners to this.player
    }
}
