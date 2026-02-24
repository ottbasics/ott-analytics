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
            font-size: 12px;
            border: 1px solid #444;
            min-width: 180px;
          }
          .metric { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .label { color: #aaa; margin-right: 10px; }
          .value { font-weight: bold; }
          .title { border-bottom: 1px solid #444; margin-bottom: 8px; padding-bottom: 4px; color: #0078d4; }
        </style>
        <div class="stats-box">
          <div class="title">OTTBasics Debug</div>
          <div class="metric"><span class="label">WallClock Latency:</span><span id="lat" class="value">-</span></div>
          <div class="metric"><span class="label">Manifest Gap:</span><span id="gap" class="value">-</span></div>
          <div class="metric"><span class="label">Buffer:</span><span id="buf" class="value">-</span></div>
          <div class="metric"><span class="label">Resolution:</span><span id="res" class="value">-</span></div>
          <div class="metric"><span class="label">Playback Rate:</span><span id="pbRate" class="value">-</span></div>
        </div>
      `;
        this.container = this.shadowRoot!.querySelector(".stats-box")!;
    }

    public update(metrics: any) {
        this.shadowRoot!.getElementById("lat")!.innerText = `${metrics.latency.toFixed(2)}s`;
        this.shadowRoot!.getElementById("gap")!.innerText = `${metrics.manifestLiveGap.toFixed(2)}s`;
        this.shadowRoot!.getElementById("buf")!.innerText = `${metrics.bufferLevel.toFixed(2)}s`;
        this.shadowRoot!.getElementById("res")!.innerText = metrics.resolution;
        this.shadowRoot!.getElementById("pbRate")!.innerText = (metrics.playbackRate || 0).toFixed(3);
    }
}

// Register the custom element
if (!customElements.get("ott-diagnostics")) {
    customElements.define("ott-diagnostics", OTTDiagnostics);
}
