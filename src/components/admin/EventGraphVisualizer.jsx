import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, AlertTriangle, GitBranch } from "lucide-react";

const NODE_W = 180;
const NODE_H = 56;
const COL_GAP = 260;
const ROW_GAP = 80;

function buildGraph(events) {
  if (!events.length) return { nodes: [], edges: [], reachable: new Set(), deadEnds: new Set(), brokenLinks: [] };

  // Map event_id → event
  const byId = {};
  events.forEach(e => { byId[e.event_id] = e; });

  // Collect all edges (event_id → nextEventId)
  const edges = [];
  const brokenLinks = [];
  events.forEach(ev => {
    const addEdge = (fromId, toId, label, success) => {
      if (!toId) return;
      if (!byId[toId]) { brokenLinks.push({ from: fromId, to: toId }); return; }
      edges.push({ from: fromId, to: toId, label, success });
    };
    try {
      const choices = typeof ev.choices === "string" ? JSON.parse(ev.choices) : (ev.choices || []);
      choices.forEach((c, i) => {
        const se = typeof c.successEffect === "string" ? JSON.parse(c.successEffect) : (c.successEffect || {});
        const fe = typeof c.failEffect === "string" ? JSON.parse(c.failEffect) : (c.failEffect || {});
        if (se.nextEventId) addEdge(ev.event_id, se.nextEventId, `✓ ${c.text?.slice(0, 20) || i}`, true);
        if (fe.nextEventId) addEdge(ev.event_id, fe.nextEventId, `✗ ${c.text?.slice(0, 20) || i}`, false);
        if (c.nextEventId && !se.nextEventId && !fe.nextEventId) addEdge(ev.event_id, c.nextEventId, c.text?.slice(0, 20) || i, null);
      });
    } catch (_) {}
  });

  // BFS to find reachable events from first event
  const firstEvent = events.reduce((a, b) => (a.sort_order < b.sort_order ? a : b));
  const reachable = new Set();
  const queue = [firstEvent.event_id];
  while (queue.length) {
    const id = queue.shift();
    if (reachable.has(id)) continue;
    reachable.add(id);
    edges.filter(e => e.from === id).forEach(e => queue.push(e.to));
  }

  // Dead ends: reachable, no outgoing edges, not an ending
  const hasOutgoing = new Set(edges.map(e => e.from));
  const deadEnds = new Set(
    events.filter(e => reachable.has(e.event_id) && !hasOutgoing.has(e.event_id) && !e.is_ending).map(e => e.event_id)
  );

  // Layout: group by night, then by sort_order within night
  const nights = [...new Set(events.map(e => e.night || 1))].sort((a, b) => a - b);
  const nodes = [];
  nights.forEach((night, col) => {
    const nightEvents = events.filter(e => (e.night || 1) === night).sort((a, b) => a.sort_order - b.sort_order);
    nightEvents.forEach((ev, row) => {
      nodes.push({
        id: ev.event_id,
        event: ev,
        x: col * COL_GAP + 20,
        y: row * ROW_GAP + 20,
        night,
        isStart: ev.event_id === firstEvent.event_id,
        isEnding: !!ev.is_ending,
        isReachable: reachable.has(ev.event_id),
        isDeadEnd: deadEnds.has(ev.event_id),
        endingType: ev.ending_type,
      });
    });
  });

  return { nodes, edges, reachable, deadEnds, brokenLinks };
}

function nodeColor(node) {
  if (node.isStart) return { bg: "hsl(271 87% 52%)", border: "hsl(271 87% 72%)", text: "white" };
  if (node.isDeadEnd) return { bg: "hsl(351 78% 35%)", border: "hsl(351 78% 55%)", text: "hsl(351 78% 85%)" };
  if (!node.isReachable) return { bg: "hsl(252 10% 20%)", border: "hsl(252 10% 32%)", text: "hsl(252 8% 45%)" };
  if (node.isEnding) {
    const c = { good: ["hsl(123 68% 30%)", "hsl(123 68% 52%)", "hsl(123 68% 78%)"], bad: ["hsl(351 78% 30%)", "hsl(351 78% 55%)", "hsl(351 78% 82%)"], mixed: ["hsl(40 90% 28%)", "hsl(40 90% 52%)", "hsl(40 90% 75%)"] };
    const [bg, border, text] = c[node.endingType] || c.mixed;
    return { bg, border, text };
  }
  return { bg: "hsl(216 70% 30%)", border: "hsl(216 70% 52%)", text: "hsl(216 70% 82%)" };
}

export default function EventGraphVisualizer({ selectedStoryId }) {
  const storyId = selectedStoryId || "the_rental";
  const svgRef = useRef(null);
  const [zoom, setZoom] = useState(0.75);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(null);
  const [selected, setSelected] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [nodePositions, setNodePositions] = useState({});

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.GameEvent.list("sort_order"),
  });

  const scopedEvents = useMemo(() => events.filter(e => e.story_id === storyId), [events, storyId]);
  const graph = useMemo(() => buildGraph(scopedEvents), [scopedEvents]);

  // Merge auto-layout positions with manually dragged positions
  const nodes = useMemo(() => graph.nodes.map(n => ({
    ...n,
    x: nodePositions[n.id]?.x ?? n.x,
    y: nodePositions[n.id]?.y ?? n.y,
  })), [graph.nodes, nodePositions]);

  const nodeMap = useMemo(() => {
    const m = {};
    nodes.forEach(n => { m[n.id] = n; });
    return m;
  }, [nodes]);

  // Canvas panning
  const onMouseDownCanvas = useCallback((e) => {
    if (e.target.closest("[data-node]")) return;
    setDragging({ startX: e.clientX - pan.x, startY: e.clientY - pan.y });
  }, [pan]);

  const onMouseMove = useCallback((e) => {
    if (draggingNode) {
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      const x = (e.clientX - svgRect.left) / zoom - pan.x / zoom - NODE_W / 2;
      const y = (e.clientY - svgRect.top) / zoom - pan.y / zoom - NODE_H / 2;
      setNodePositions(prev => ({ ...prev, [draggingNode]: { x: Math.max(0, x), y: Math.max(0, y) } }));
    } else if (dragging) {
      setPan({ x: e.clientX - dragging.startX, y: e.clientY - dragging.startY });
    }
  }, [dragging, draggingNode, zoom, pan]);

  const onMouseUp = useCallback(() => {
    setDragging(null);
    setDraggingNode(null);
  }, []);

  const totalW = nodes.reduce((m, n) => Math.max(m, n.x + NODE_W + 40), 800);
  const totalH = nodes.reduce((m, n) => Math.max(m, n.y + NODE_H + 40), 400);

  const selEvent = selected ? scopedEvents.find(e => e.event_id === selected) : null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4" style={{ color: "hsl(216 70% 62%)" }} />
          <span className="text-sm font-bold" style={{ color: "hsl(216 70% 78%)" }}>Event Graph</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "hsl(216 70% 50% / 0.15)", border: "1px solid hsl(216 70% 50% / 0.3)", color: "hsl(216 70% 70%)" }}>
            {scopedEvents.length} events · {graph.edges.length} edges
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Legend */}
          {[
            { color: "hsl(271 87% 52%)", label: "Start" },
            { color: "hsl(216 70% 40%)", label: "Normal" },
            { color: "hsl(123 68% 38%)", label: "Good end" },
            { color: "hsl(351 78% 40%)", label: "Bad end / Dead-end" },
            { color: "hsl(40 90% 35%)", label: "Mixed end" },
            { color: "hsl(252 10% 22%)", label: "Unreachable" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
              <span className="text-[9px] text-muted-foreground">{l.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 ml-2">
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setZoom(z => Math.min(2, z + 0.15))}><ZoomIn className="w-3 h-3" /></Button>
            <span className="text-[10px] w-10 text-center text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.25, z - 0.15))}><ZoomOut className="w-3 h-3" /></Button>
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => { setZoom(0.75); setPan({ x: 0, y: 0 }); setNodePositions({}); }}><Maximize2 className="w-3 h-3" /></Button>
          </div>
        </div>
      </div>

      {graph.brokenLinks.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs"
          style={{ background: "hsl(351 78% 60% / 0.08)", border: "1px solid hsl(351 78% 60% / 0.3)", color: "hsl(351 78% 68%)" }}>
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Broken links: {graph.brokenLinks.map(l => `${l.from} → ${l.to}`).join(" | ")}</span>
        </div>
      )}

      {/* SVG Canvas */}
      <div className="rounded-xl overflow-hidden relative select-none"
        style={{ height: 520, background: "hsl(252 14% 8%)", border: "1px solid hsl(252 10% 18%)", cursor: dragging ? "grabbing" : "grab" }}
        onMouseDown={onMouseDownCanvas}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}>
        <svg ref={svgRef} width="100%" height="100%">
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="hsl(252 8% 40%)" />
            </marker>
            <marker id="arrowhead-success" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="hsl(123 68% 45%)" />
            </marker>
            <marker id="arrowhead-fail" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="hsl(351 78% 55%)" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Night column labels */}
            {[...new Set(scopedEvents.map(e => e.night || 1))].sort().map((night, i) => (
              <text key={night} x={i * COL_GAP + 20 + NODE_W / 2} y={6}
                textAnchor="middle" fontSize={10} fill="hsl(252 8% 38%)" fontWeight="bold">
                Night {night}
              </text>
            ))}

            {/* Edges */}
            {graph.edges.map((edge, i) => {
              const from = nodeMap[edge.from];
              const to = nodeMap[edge.to];
              if (!from || !to) return null;
              const x1 = from.x + NODE_W;
              const y1 = from.y + NODE_H / 2;
              const x2 = to.x;
              const y2 = to.y + NODE_H / 2;
              const cx1 = x1 + Math.abs(x2 - x1) * 0.4;
              const cx2 = x2 - Math.abs(x2 - x1) * 0.4;
              const color = edge.success === true ? "hsl(123 68% 45%)" : edge.success === false ? "hsl(351 78% 55%)" : "hsl(252 8% 42%)";
              const markerId = edge.success === true ? "arrowhead-success" : edge.success === false ? "arrowhead-fail" : "arrowhead";
              return (
                <path key={i}
                  d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2 - 8} ${y2}`}
                  fill="none" stroke={color} strokeWidth={1.2} strokeOpacity={0.6}
                  markerEnd={`url(#${markerId})`} />
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const c = nodeColor(node);
              const isSelected = selected === node.id;
              return (
                <g key={node.id} data-node="1"
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{ cursor: "pointer" }}
                  onMouseDown={e => { e.stopPropagation(); setDraggingNode(node.id); }}
                  onClick={e => { e.stopPropagation(); setSelected(isSelected ? null : node.id); }}>
                  <rect width={NODE_W} height={NODE_H} rx={8}
                    fill={c.bg}
                    stroke={isSelected ? "white" : c.border}
                    strokeWidth={isSelected ? 2 : 1} />
                  <text x={8} y={18} fontSize={8} fill={c.text} opacity={0.6} fontWeight="bold">
                    {node.isStart ? "▶ START" : node.isDeadEnd ? "⚠ DEAD END" : node.isEnding ? `★ ${(node.endingType || "end").toUpperCase()}` : `Night ${node.night}`}
                  </text>
                  <text x={8} y={32} fontSize={9} fill={c.text} fontWeight="bold">
                    <tspan>{node.id.slice(0, 22)}{node.id.length > 22 ? "…" : ""}</tspan>
                  </text>
                  <text x={8} y={48} fontSize={8} fill={c.text} opacity={0.55}>
                    {node.event.text?.slice(0, 26)}{(node.event.text?.length || 0) > 26 ? "…" : ""}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Selected event detail */}
      {selEvent && (
        <div className="rounded-xl p-3 text-xs space-y-1.5" style={{ background: "hsl(252 12% 14%)", border: "1px solid hsl(252 10% 22%)" }}>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold" style={{ color: "hsl(271 87% 72%)" }}>{selEvent.event_id}</span>
            <span className="text-[9px] text-muted-foreground">Night {selEvent.night} · sort {selEvent.sort_order}</span>
            {selEvent.is_ending && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: "hsl(40 90% 40% / 0.2)", color: "hsl(40 90% 65%)" }}>ENDING: {selEvent.ending_type}</span>}
          </div>
          <p className="text-muted-foreground leading-relaxed">{selEvent.text?.slice(0, 280)}{(selEvent.text?.length || 0) > 280 ? "…" : ""}</p>
          {(() => {
            try {
              const choices = typeof selEvent.choices === "string" ? JSON.parse(selEvent.choices) : (selEvent.choices || []);
              if (!choices.length) return <p className="text-muted-foreground/40 italic">No choices.</p>;
              return (
                <div className="space-y-1 pt-1" style={{ borderTop: "1px solid hsl(252 10% 20%)" }}>
                  {choices.map((c, i) => {
                    const se = typeof c.successEffect === "string" ? JSON.parse(c.successEffect || "{}") : (c.successEffect || {});
                    const fe = typeof c.failEffect === "string" ? JSON.parse(c.failEffect || "{}") : (c.failEffect || {});
                    return (
                      <div key={i} className="flex items-start gap-2 text-[10px]">
                        <span className="shrink-0 font-bold" style={{ color: "hsl(40 90% 65%)" }}>{i + 1}.</span>
                        <span className="flex-1" style={{ color: "hsl(40 30% 80%)" }}>{c.text}</span>
                        <span style={{ color: "hsl(123 68% 55%)" }}>✓→{se.nextEventId || "?"}</span>
                        <span style={{ color: "hsl(351 78% 55%)" }}>✗→{fe.nextEventId || "?"}</span>
                      </div>
                    );
                  })}
                </div>
              );
            } catch { return null; }
          })()}
        </div>
      )}

      <p className="text-[9px] text-muted-foreground/30 text-center">
        Drag nodes to reposition · Click node to inspect · Pan with mouse drag · Dead-ends highlighted in red
      </p>
    </div>
  );
}