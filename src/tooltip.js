let _tip = null;

function getTip() {
  if (!_tip) {
    _tip = document.createElement("div");
    _tip.id = "chart-tooltip";
    document.body.appendChild(_tip);
  }
  return _tip;
}

export function showTooltip(event, html) {
  const tip = getTip();
  tip.innerHTML = html;
  tip.style.opacity = "1";
  positionTip(tip, event);
}

export function moveTooltip(event) {
  positionTip(getTip(), event);
}

export function hideTooltip() {
  getTip().style.opacity = "0";
}

function positionTip(tip, event) {
  tip.style.left = (event.clientX + 16) + "px";
  tip.style.top = (event.clientY - 10) + "px";
}
