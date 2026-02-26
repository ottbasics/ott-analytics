export interface VideoMetrics {
    /** Difference between the Wallclock Time (UTC) and
     * the video playhead converted to UTC.
     */
    latency: number;

    /** Difference between video.currentTime and the latest segment's
     * presentation time in the manifest.
     */
    manifestLiveGap: number;

    /** Difference between the latency and manifest's
     * suggestedPresentationDelay.
     */
    drift: number;

    bufferLevel: number;
    isLowLatency: boolean;
    bandwidth: number;
    playbackRate: number;
    resolution: string;
    playerState?: string;
    networkSpeed?: number;
}

export interface PlayerAdapter {
    name: string;
    getMetrics(): VideoMetrics;
    destroy(): void;
}
