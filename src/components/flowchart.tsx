"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Equation } from "@/components/equation";

export type FlowNode = {
  id: string;
  title: string;
  text: string;
  eq?: string;
};

export type FlowColumn = {
  id: string;
  title: string;
  nodes: FlowNode[];
};

export type FlowEdge = {
  from: string;
  to: string;
  label?: string;
  via?: "below";
};

type FigureProps = {
  kicker: string;
  title: string;
  lede: string;
  current: "physics" | "architecture" | "deployment";
  columns: FlowColumn[];
  edges: FlowEdge[];
};

type Box = { x: number; y: number; w: number; h: number };

type Drawn = { d: string; label?: string; lx: number; ly: number };

export function Figure({ kicker, title, lede, current, columns, edges }: FigureProps) {
  return (
    <main className="sheet">
      <div className="sheet-head">
        <header className="flow-banner">
          <p className="flow-kicker">{kicker}</p>
          <h1>{title}</h1>
          <p className="flow-lede">{lede}</p>
          <nav className="flow-nav" aria-label="Figures">
            <Link href="/visuals/physics" aria-current={current === "physics" ? "page" : undefined}>
              Physics model
            </Link>
            <Link
              href="/visuals/architecture"
              aria-current={current === "architecture" ? "page" : undefined}
            >
              Systems architecture
            </Link>
            <Link
              href="/visuals/deployment"
              aria-current={current === "deployment" ? "page" : undefined}
            >
              Fleet deployment
            </Link>
          </nav>
        </header>
      </div>
      <FlowCanvas columns={columns} edges={edges} />
    </main>
  );
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

function clampZoom(value: number) {
  const stepped = Math.round(value * 100) / 100;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, stepped));
}

function FlowCanvas({ columns, edges }: { columns: FlowColumn[]; edges: FlowEdge[] }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const markerId = useId().replace(/:/g, "");
  const [drawn, setDrawn] = useState<Drawn[]>([]);
  const [zoom, setZoom] = useState(1);
  const [extent, setExtent] = useState({ w: 0, h: 0 });
  const zoomRef = useRef(1);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  const columnIndex = new Map<string, number>();
  columns.forEach((column, index) => {
    column.nodes.forEach((node) => columnIndex.set(node.id, index));
  });
  const busCount = edges.filter((edge) => {
    const span = (columnIndex.get(edge.to) ?? 0) - (columnIndex.get(edge.from) ?? 0);
    return edge.via === "below" || span !== 1;
  }).length;

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const columnOf = new Map<string, number>();
    columns.forEach((column, index) => {
      column.nodes.forEach((node) => columnOf.set(node.id, index));
    });

    const draw = () => {
      const origin = content.getBoundingClientRect();
      const boxes = new Map<string, Box>();
      content.querySelectorAll<HTMLElement>("[data-node]").forEach((el) => {
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

      const covers = (x: number, y: number) => {
        for (const box of boxes.values()) {
          if (x > box.x - 8 && x < box.x + box.w + 8 && y > box.y - 8 && y < box.y + box.h + 8) {
            return true;
          }
        }
        return false;
      };

      let lane = 0;
      const next: Drawn[] = [];
      for (const edge of edges) {
        const from = boxes.get(edge.from);
        const to = boxes.get(edge.to);
        if (!from || !to) continue;
        const span = (columnOf.get(edge.to) ?? 0) - (columnOf.get(edge.from) ?? 0);

        if (span === 0) {
          const x = from.x + from.w + 28;
          const y1 = from.y + from.h / 2;
          const y2 = to.y + to.h / 2;
          next.push({
            d: `M ${from.x + from.w} ${y1} H ${x} V ${y2} H ${to.x + to.w}`,
            label: edge.label,
            lx: x,
            ly: (y1 + y2) / 2,
          });
          continue;
        }

        if (edge.via === "below" || span !== 1) {
          const drop = Math.max(from.y + from.h, to.y + to.h) + 36 + lane * 26;
          lane += 1;
          const x1 = from.x + from.w / 2;
          const y1 = from.y + from.h;
          const x2 = to.x + to.w / 2;
          const y2 = to.y + to.h;
          next.push({
            d: `M ${x1} ${y1} V ${drop} H ${x2} V ${y2}`,
            label: edge.label,
            lx: (x1 + x2) / 2,
            ly: drop - 14,
          });
          continue;
        }

        const x1 = from.x + from.w;
        const y1 = from.y + from.h / 2;
        const x2 = to.x;
        const y2 = to.y + to.h / 2;
        const bend = Math.max(28, (x2 - x1) * 0.45);
        const labelX = (x1 + x2) / 2;
        const labelY = (y1 + y2) / 2;
        next.push({
          d: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`,
          label: covers(labelX, labelY - 12) ? undefined : edge.label,
          lx: labelX,
          ly: labelY - 12,
        });
      }
      setDrawn(next);
      const width = content.offsetWidth;
      const height = content.offsetHeight;
      setExtent((current) => (current.w === width && current.h === height ? current : { w: width, h: height }));
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(content);
    return () => observer.disconnect();
  }, [columns, edges, zoom]);

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
      <div className="canvas" ref={canvasRef}>
      <div className="canvas-scale" style={{ width: extent.w * zoom, height: extent.h * zoom }}>
      <div
        className="canvas-inner"
        ref={contentRef}
        style={{ transform: `scale(${zoom})`, paddingBottom: 72 + busCount * 26 }}
      >
        <svg className="edges" aria-hidden="true">
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
          {drawn.map((edge) => (
            <path
              key={edge.d}
              d={edge.d}
              fill="none"
              stroke="#0f2c4c"
              strokeWidth="1.6"
              markerEnd={`url(#${markerId})`}
            />
          ))}
        </svg>
        {drawn.map(
          (edge) =>
            edge.label && (
              <span key={`${edge.lx}-${edge.ly}-${edge.label}`} className="edge-label" style={{ left: edge.lx, top: edge.ly }}>
                {edge.label}
              </span>
            ),
        )}
        <div className="cols">
          {columns.map((column) => (
            <section key={column.id} className="fcol" aria-label={column.title}>
              <h2>{column.title}</h2>
              {column.nodes.map((node) => (
                <article key={node.id} className="fnode" data-node={node.id}>
                  <h3>{node.title}</h3>
                  <p>{node.text}</p>
                  {node.eq ? (
                    <div className="node-eq">
                      <Equation display tex={node.eq} />
                    </div>
                  ) : null}
                </article>
              ))}
            </section>
          ))}
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}
