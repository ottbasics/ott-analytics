import { PlayerAdapter, VideoMetrics } from "../types.js";

export class DashjsAdapter implements PlayerAdapter {
    public name = "dashjs";

    constructor(private player: any, private video: HTMLVideoElement) {}

    public getMetrics(): VideoMetrics {
        const dashMetrics = this.player.getDashMetrics();
        const dvrInfo = dashMetrics.getCurrentDVRInfo();
        const curTime = this.video.currentTime;

        let manifestLiveGap = 0;

        if (dvrInfo && dvrInfo.range) {
            // dvrInfo.range.end is the actual "Live Edge" of the manifest
            // dvrInfo.range.start is the beginning of the time-shift buffer
            const liveEdge = dvrInfo.range.end;
            manifestLiveGap = Math.max(0, liveEdge - curTime);
        }

        const metrics = {
            latency: this.player.getCurrentLiveLatency() || 0,
            manifestLiveGap: manifestLiveGap,
            bufferLevel: this.player.getBufferLength("video") || 0,
            isLowLatency: this.player.getSettings().streaming.lowLatencyEnabled || false,
            bandwidth: (this.player.getAverageThroughput("video") || 0) * 1000,
            resolution: this.getResolution(),
            playbackRate: this.video.playbackRate,
            playerState: this.video.paused ? "Paused" : "Playing",
            drift: 0
        };
        return metrics;
    }

    private getResolution(): string {
        try {
            // 1. Get the stream info for the current period
            const streamInfo = this.player.getActiveStream ? this.player.getActiveStream().getStreamInfo() : null;
            if (!streamInfo) return "0x0";

            // 2. Get the list of available bitrates/qualities for video
            const bitrates = this.player.getBitrateInfoListFor("video");

            // 3. Get the index of the quality currently being played
            const activeIndex = this.player.getQualityFor("video");

            // 4. Match the index to the bitrate metadata
            const currentBitrate = bitrates && bitrates[activeIndex];

            if (currentBitrate && currentBitrate.width && currentBitrate.height) {
                return `${currentBitrate.width}x${currentBitrate.height}`;
            }
        } catch (e) {
            // If anything fails during the handoff, fail silently to keep the heartbeat alive
            return "0x0";
        }
        return "0x0";
    }

    public destroy(): void {}
}
