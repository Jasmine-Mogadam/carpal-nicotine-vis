// ── Shared PNG export utility ─────────────────────────────────────────────────

const VAR_MAP = {
  "--octr-color": "#e74c3c",
  "--ectr-color": "#2980b9",
  "--sig-color": "#c0392b",
  "--nonsig-color": "#95a5a6",
  "--unmatched-color": "#8e44ad",
  "--matched-color": "#27ae60",
  "--text": "#2c3e50",
  "--text-muted": "#7f8c8d",
};

export function exportChartAsPng(chartContainer, filename = "chart.png") {
  const svg = chartContainer.querySelector("svg");
  if (!svg) return;

  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const styleEl = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "style",
  );
  styleEl.textContent = `
    .chart-title { font-family: sans-serif; font-size:13px; font-weight:600; fill:#2c3e50; }
    .axis-text   { font-family: sans-serif; font-size:11px; fill:#7f8c8d; }
    .axis-label  { font-family: sans-serif; font-size:11px; fill:#7f8c8d; }
    .legend-text { font-family: sans-serif; font-size:11px; fill:#2c3e50; }
    .reference-line { stroke:#bdc3c7; stroke-width:1; stroke-dasharray:4,3; }
  `;
  clone.insertBefore(styleEl, clone.firstChild);

  clone.querySelectorAll("*").forEach((el) => {
    ["fill", "stroke"].forEach((attr) => {
      const val = el.getAttribute(attr);
      if (val && val.startsWith("var(")) {
        const key = val.match(/var\((--[\w-]+)\)/)?.[1];
        if (key && VAR_MAP[key]) el.setAttribute(attr, VAR_MAP[key]);
      }
    });
  });

  const svgStr = new XMLSerializer().serializeToString(clone);
  const vb = svg.getAttribute("viewBox")?.split(" ").map(Number) ?? [
    0, 0, 660, 420,
  ];
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = vb[2] * scale;
  canvas.height = vb[3] * scale;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const img = new Image();
  const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    console.error("exportChartAsPng: SVG failed to load");
  };
  img.src = url;
}

/**
 * Injects a `.chart-toolbar` with an Export PNG button directly before
 * `chartContainer` in the DOM. `chartContainer` is the div that holds the SVG.
 */
export function addExportButton(chartContainer, filename = "chart.png") {
  const toolbar = document.createElement("div");
  toolbar.className = "chart-toolbar";
  const btn = document.createElement("button");
  btn.className = "export-btn";
  btn.title = "Export chart as PNG";
  btn.textContent = "↓ Export Chart";
  btn.addEventListener("click", () =>
    exportChartAsPng(chartContainer, filename),
  );
  toolbar.appendChild(btn);
  chartContainer.parentElement.insertBefore(toolbar, chartContainer);
}
