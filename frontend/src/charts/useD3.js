import { useEffect, useRef } from "react";

/**
 * Bridge between React's lifecycle and D3's imperative rendering.
 * `draw(el, width)` receives the (cleared) container element and its measured
 * width; it re-runs on `deps` change and on container resize. This is the one
 * piece you write once and reuse across every chart.
 */
export function useD3(draw, deps = []) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const render = () => {
      el.innerHTML = "";
      draw(el, el.clientWidth || 600);
    };
    render();

    let raf;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(render);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      el.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

// A single shared DOM tooltip, created lazily — every chart points at it.
let tipEl = null;
function tipNode() {
  if (!tipEl) {
    tipEl = document.createElement("div");
    Object.assign(tipEl.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: 9999,
      background: "#1b1d1a",
      color: "#f5f5f1",
      font: "11.5px/1.55 'JetBrains Mono', monospace",
      padding: "8px 11px",
      borderRadius: "8px",
      boxShadow: "0 6px 20px rgba(0,0,0,0.22)",
      opacity: 0,
      transition: "opacity .1s",
      maxWidth: "240px",
    });
    document.body.appendChild(tipEl);
  }
  return tipEl;
}

export function showTip(html, event) {
  const t = tipNode();
  t.innerHTML = html;
  t.style.opacity = "1";
  t.style.left = event.clientX + 14 + "px";
  t.style.top = event.clientY + 14 + "px";
}

export function hideTip() {
  if (tipEl) tipEl.style.opacity = "0";
}
