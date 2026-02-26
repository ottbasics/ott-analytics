import { PlayerAdapter, VideoMetrics } from "../types.js";

export class DashjsAdapter implements PlayerAdapter {
    public name = "dashjs";
    private lastRepresentation: any = null;

    constructor(private player: any, private video: HTMLVideoElement) {
        player.on("representationSwitch", (e: any) => {
            if (e.mediaType === "video") {
                const width = e.currentRepresentation?.width;
                const height = e.currentRepresentation?.height;
                const bitrate = e.currentRepresentation?.bitrateInKbit;
                this.lastRepresentation = { width, height, bitrate };
            }
        });
    }

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

        const metrics: VideoMetrics = {
            latency: this.player.getCurrentLiveLatency() || 0,
            manifestLiveGap: manifestLiveGap,
            bufferLevel: this.player.getBufferLength("video") || 0,
            isLowLatency: this.player.getSettings().streaming.lowLatencyEnabled || false,
            bandwidth: (this.player.getAverageThroughput("video") || 0) * 1000,
            representation: this.lastRepresentation,
            playbackRate: this.video.playbackRate,
            playerState: this.video.paused ? "Paused" : "Playing",
            drift: 0
        };
        return metrics;
    }

    public destroy(): void {}
}
