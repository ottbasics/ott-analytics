export class OTTDiagnostics extends HTMLElement {
    private container: HTMLElement;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot!.innerHTML = `
        <style>
          :host {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 9999;
            pointer-events: none;
          }
          .stats-box {
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            font-family: 'Courier New', monospace;
            padding: 12px;
            border-radius: 4px;
            font-size: 1.2rem;
            border: 1px solid #444;
            min-width: 300px;
          }
          .metric { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .label { color: #aaa; margin-right: 10px; }
          .value { font-weight: bold; max-width: 150px; overflow: hidden; text-align: right; }
          .title { border-bottom: 1px solid #444; margin-bottom: 8px; padding-bottom: 4px; color: #0078d4; }
        </style>
        <div class="stats-box">
          <div class="title">OTTBasics Debug</div>
          <div class="metric"><span class="label">WallClock Latency:</span><span id="lat" class="value">-</span></div>
          <div class="metric"><span class="label">Manifest Gap:</span><span id="gap" class="value">-</span></div>
          <div class="metric"><span class="label">Buffer:</span><span id="buf" class="value">-</span></div>
          <div class="metric"><span class="label">Resolution:</span><span id="res" class="value">-</span></div>
          <div class="metric"><span class="label">Playback Rate:</span><span id="pbRate" class="value">-</span></div>
          <div class="metric"><span class="label">Player State:</span><span id="playerState" class="value">-</span></div>
          <div class="metric"><span class="label">Network Speed:</span><span id="speed" class="value">-</span></div>
        </div>
      `;
        this.container = this.shadowRoot!.querySelector(".stats-box")!;
    }

    public update(metrics: any) {
        this.shadowRoot!.getElementById("lat")!.innerText = `${metrics.latency.toFixed(2)}s`;
        this.shadowRoot!.getElementById("gap")!.innerText = `${metrics.manifestLiveGap.toFixed(2)}s`;
        this.shadowRoot!.getElementById("buf")!.innerText = `${metrics.bufferLevel.toFixed(2)}s`;
        this.shadowRoot!.getElementById("res")!.innerText = `${metrics.representation?.width || 0}x${metrics.representation?.height || 0}`;
        this.shadowRoot!.getElementById("pbRate")!.innerText = (metrics.playbackRate || 0).toFixed(3);
        this.shadowRoot!.getElementById("playerState")!.innerText = metrics.playerState;

        const speedBps = metrics.networkSpeed || 0;
        if (speedBps >= 0) {
            let speedStr = null;
            if (speedBps > 1000 * 1000) {
                speedStr = `${(metrics.networkSpeed / (1000 * 1000)).toFixed(1)}Mbps`;
            } else if (speedBps > 1000) {
                speedStr = `${(metrics.networkSpeed / 1000).toFixed(1)}Kbps`;
            } else {
                speedStr = `${metrics.networkSpeed.toFixed(1)}bps`;
            }
            this.shadowRoot!.getElementById("speed")!.innerText = speedStr;
        } else {
            //Hide Network Speed if not available
            this.shadowRoot!.getElementById("speed")!.remove();
        }
    }
}

// Register the custom element
if (!customElements.get("ott-diagnostics")) {
    customElements.define("ott-diagnostics", OTTDiagnostics);
}
