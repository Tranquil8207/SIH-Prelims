"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Equation } from "@/components/equation";

export type FleetDetail = {
  title: string;
  text: string;
  eq?: string;
};

export type FleetNode = {
  id: string;
  title: string;
  summary: string;
  x: number;
  y: number;
  panel: "up" | "down" | "left-up" | "right-up" | "left-down" | "right-down";
  tone?: "hub";
  details: FleetDetail[];
};

export type FleetLink = {
  id: string;
  from: string;
  to: string;
  label: string;
  /** Perpendicular offset of the curve, in stage pixels. */
  bow: number;
  /** Position of the label along the curve, from 0 to 1. */
  labelAt?: number;
  details: FleetDetail[];
};

type Box = { x: number; y: number; w: number; h: number };

type DrawnLink = {
  id: string;
  d: string;
  lx: number;
  ly: number;
  panelX: number;
  panelY: number;
};

const STAGE_W = 2200;
const STAGE_H = 1520;
const PANEL_W = 400;
const PANEL_H = 460;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

function clampZoom(value: number) {
  const stepped = Math.round(value * 100) / 100;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, stepped));
}

function borderPoint(box: Box, toward: { x: number; y: number }) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  const sx = dx === 0 ? Infinity : box.w / 2 / Math.abs(dx);
  const sy = dy === 0 ? Infinity : box.h / 2 / Math.abs(dy);
  const scale = Math.min(sx, sy);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

function intersects(a: Box, b: Box, margin: number) {
  return !(
    a.x + a.w + margin < b.x ||
    b.x + b.w + margin < a.x ||
    a.y + a.h + margin < b.y ||
    b.y + b.h + margin < a.y
  );
}

function placeLinkPanel(lx: number, ly: number, ox: number, oy: number, nodes: Box[]) {
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const bottom = Math.max(...nodes.map((node) => node.y + node.h));
  const make = (x: number, y: number): Box => ({
    x: clamp(x, 16, STAGE_W - PANEL_W - 16),
    y: clamp(y, 16, STAGE_H - PANEL_H - 16),
    w: PANEL_W,
    h: PANEL_H,
  });
  const spots = [
    make(ox >= 0 ? lx + 24 : lx - PANEL_W - 24, ly + oy * 12 - 28),
    make(16, ly - 28),
    make(STAGE_W - PANEL_W - 16, ly - 28),
    make(16, bottom + 36),
    make(STAGE_W - PANEL_W - 16, bottom + 36),
  ];
  return spots.find((spot) => nodes.every((node) => !intersects(spot, node, 20))) ?? spots[3];
}

function DetailStack({ kicker, details }: { kicker: string; details: FleetDetail[] }) {
  return (
    <div className="panel-card">
      <p className="panel-kicker">{kicker}</p>
      {details.map((detail) => (
        <article key={detail.title} className="fnode panel-detail">
          <h3>{detail.title}</h3>
          <p>{detail.text}</p>
          {detail.eq ? (
            <div className="node-eq">
              <Equation display tex={detail.eq} />
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function FleetMap({ nodes, links }: { nodes: FleetNode[]; links: FleetLink[] }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const markerId = useId().replace(/:/g, "");
  const zoomRef = useRef(1);
  const closeTimer = useRef<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [drawn, setDrawn] = useState<DrawnLink[]>([]);
  const [active, setActive] = useState<{ kind: "node" | "link"; id: string } | null>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const hub = nodes.find((node) => node.id === "hub");
    if (!canvas || !hub) return;
    canvas.scrollLeft = hub.x + 125 - canvas.clientWidth / 2;
    canvas.scrollTop = Math.max(0, hub.y - 80);
  }, [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const panel = canvas.querySelector(".panel-card");
    if (!panel) return;
    const frame = canvas.getBoundingClientRect();
    const card = panel.getBoundingClientRect();
    const margin = 12;
    const bottomLimit = frame.bottom - 72;
    let dx = 0;
    let dy = 0;
    if (card.left < frame.left + margin) dx = card.left - (frame.left + margin);
    else if (card.right > frame.right - margin) dx = card.right - (frame.right - margin);
    if (card.height > bottomLimit - frame.top - margin) {
      dy = card.top - (frame.top + margin);
    } else if (card.top < frame.top + margin) {
      dy = card.top - (frame.top + margin);
    } else if (card.bottom > bottomLimit) {
      dy = card.bottom - bottomLimit;
    }
    if (dx !== 0 || dy !== 0) canvas.scrollBy({ left: dx, top: dy });
  }, [active]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPinned(false);
      setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const draw = () => {
      const origin = stage.getBoundingClientRect();
      const boxes = new Map<string, Box>();
      stage.querySelectorAll<HTMLElement>("[data-node]").forEach((el) => {
        const id = el.dataset.node;
        if (!id) return;
        const rect = el.getBoundingClientRect();
        boxes.set(id, {
          x: (rect.left - origin.left) / zoom,
          y: (rect.top - origin.top) / zoom,
          w: rect.width / zoom,
          h: rect.height / zoom,
        });
      });

      const nodeBoxes = [...boxes.values()];
      const geometry: Array<{ id: string; d: string; lx: number; ly: number; ox: number; oy: number }> = [];
      for (const link of links) {
        const from = boxes.get(link.from);
        const to = boxes.get(link.to);
        if (!from || !to) continue;
        const fromCenter = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
        const toCenter = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
        const start = borderPoint(from, toCenter);
        const end = borderPoint(to, fromCenter);
        const upper = fromCenter.y <= toCenter.y ? fromCenter : toCenter;
        const lower = fromCenter.y <= toCenter.y ? toCenter : fromCenter;
        const dx = lower.x - upper.x;
        const dy = lower.y - upper.y;
        const len = Math.hypot(dx, dy) || 1;
        const px = -dy / len;
        const py = dx / len;
        const cx = (start.x + end.x) / 2 + px * link.bow;
        const cy = (start.y + end.y) / 2 + py * link.bow;
        const labelAt = link.labelAt ?? 0.5;
        const remain = 1 - labelAt;
        const pointX = remain * remain * start.x + 2 * remain * labelAt * cx + labelAt * labelAt * end.x;
        const pointY = remain * remain * start.y + 2 * remain * labelAt * cy + labelAt * labelAt * end.y;
        const out = link.bow === 0 ? 1 : Math.sign(link.bow);
        geometry.push({
          id: link.id,
          d: `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`,
          lx: pointX + px * out * 28,
          ly: pointY + py * out * 22,
          ox: px * out,
          oy: py * out,
        });
      }
      const next: DrawnLink[] = geometry.map((item) => {
        const panel = placeLinkPanel(item.lx, item.ly, item.ox, item.oy, nodeBoxes);
        return { id: item.id, d: item.d, lx: item.lx, ly: item.ly, panelX: panel.x, panelY: panel.y };
      });
      setDrawn(next);
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [links, nodes, zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const current = zoomRef.current;
      const next = clampZoom(current + (event.deltaY > 0 ? -0.1 : 0.1));
      if (next === current) return;
      const rect = canvas.getBoundingClientRect();
      const anchorX = event.clientX - rect.left + canvas.scrollLeft;
      const anchorY = event.clientY - rect.top + canvas.scrollTop;
      const ratio = next / current;
      zoomRef.current = next;
      setZoom(next);
      requestAnimationFrame(() => {
        canvas.scrollLeft = anchorX * ratio - (event.clientX - rect.left);
        canvas.scrollTop = anchorY * ratio - (event.clientY - rect.top);
      });
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  const changeZoom = (next: number) => {
    const canvas = canvasRef.current;
    const current = zoomRef.current;
    const clamped = clampZoom(next);
    if (!canvas || clamped === current) {
      setZoom(clamped);
      return;
    }
    const anchorX = canvas.scrollLeft + canvas.clientWidth / 2;
    const anchorY = canvas.scrollTop + canvas.clientHeight / 2;
    const ratio = clamped / current;
    zoomRef.current = clamped;
    setZoom(clamped);
    requestAnimationFrame(() => {
      canvas.scrollLeft = anchorX * ratio - canvas.clientWidth / 2;
      canvas.scrollTop = anchorY * ratio - canvas.clientHeight / 2;
    });
  };

  const clearClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const show = (next: { kind: "node" | "link"; id: string }) => {
    if (pinned) return;
    clearClose();
    setActive(next);
  };

  const scheduleClose = () => {
    if (pinned) return;
    clearClose();
    closeTimer.current = window.setTimeout(() => setActive(null), 180);
  };

  const pin = (next: { kind: "node" | "link"; id: string }) => {
    clearClose();
    if (pinned && active?.kind === next.kind && active.id === next.id) {
      setPinned(false);
      setActive(null);
      return;
    }
    setPinned(true);
    setActive(next);
  };

  const openLink = drawn.find((link) => active?.kind === "link" && link.id === active.id);
  const openLinkData = links.find((link) => link.id === openLink?.id);

  return (
    <div className="canvas-wrap">
      <div className="zoom-bar" role="group" aria-label="Zoom">
        <button type="button" onClick={() => changeZoom(zoom - 0.1)} aria-label="Zoom out">
          −
        </button>
        <button type="button" className="zoom-level" onClick={() => changeZoom(1)} aria-label="Reset zoom">
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" onClick={() => changeZoom(zoom + 0.1)} aria-label="Zoom in">
          +
        </button>
      </div>
      <div
        className="canvas"
        ref={canvasRef}
        onMouseDown={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest(".spoke-anchor, .map-label, .map-panel, .link-panel, .link-hit")) return;
          setPinned(false);
          setActive(null);
        }}
      >
        <div className="canvas-scale" style={{ width: STAGE_W * zoom, height: STAGE_H * zoom }}>
          <div
            className="canvas-inner fleet-stage"
            ref={stageRef}
            style={{ transform: `scale(${zoom})`, width: STAGE_W, height: STAGE_H }}
          >
            <svg className="map-edges" aria-hidden="true">
              <defs>
                <marker
                  id={markerId}
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <path d="M0,0.5 L7,4 L0,7.5 Z" fill="#0f2c4c" />
                </marker>
              </defs>
              {drawn.map((link) => (
                <g key={link.id}>
                  <path d={link.d} className="link-visible" markerEnd={`url(#${markerId})`} />
                  <path
                    d={link.d}
                    className="link-hit"
                    onMouseEnter={() => show({ kind: "link", id: link.id })}
                    onMouseLeave={scheduleClose}
                    onClick={(event) => {
                      event.stopPropagation();
                      pin({ kind: "link", id: link.id });
                    }}
                  />
                </g>
              ))}
            </svg>
            {drawn.map((link) => (
              <button
                key={link.id}
                type="button"
                className="edge-label map-label"
                style={{ left: link.lx, top: link.ly }}
                aria-expanded={active?.kind === "link" && active.id === link.id}
                onMouseEnter={() => show({ kind: "link", id: link.id })}
                onMouseLeave={scheduleClose}
                onClick={(event) => {
                  event.stopPropagation();
                  pin({ kind: "link", id: link.id });
                }}
              >
                {links.find((item) => item.id === link.id)?.label}
              </button>
            ))}
            {nodes.map((node) => {
              const open = active?.kind === "node" && active.id === node.id;
              return (
                <div
                  key={node.id}
                  className={`spoke-anchor${open ? " is-open" : ""}`}
                  style={{ left: node.x, top: node.y }}
                  onMouseEnter={() => show({ kind: "node", id: node.id })}
                  onMouseLeave={scheduleClose}
                >
                  <button
                    type="button"
                    className={`spoke${node.tone === "hub" ? " spoke-hub" : ""}`}
                    data-node={node.id}
                    aria-expanded={open}
                    onClick={(event) => {
                      event.stopPropagation();
                      pin({ kind: "node", id: node.id });
                    }}
                  >
                    <h3>{node.title}</h3>
                    <p>{node.summary}</p>
                  </button>
                  {open ? (
                    <div className={`map-panel ${node.panel}`} role="region" aria-label={node.title}>
                      <DetailStack kicker={node.title} details={node.details} />
                    </div>
                  ) : null}
                </div>
              );
            })}
            {openLink && openLinkData ? (
              <div
                className="link-panel"
                style={{ left: openLink.panelX, top: openLink.panelY }}
                role="region"
                aria-label={openLinkData.label}
                onMouseEnter={() => show({ kind: "link", id: openLink.id })}
                onMouseLeave={scheduleClose}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <DetailStack kicker={openLinkData.label} details={openLinkData.details} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
