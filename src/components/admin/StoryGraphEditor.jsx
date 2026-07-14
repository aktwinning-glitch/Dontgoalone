import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ZoomIn, ZoomOut, Maximize2, Save, X, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

const NODE_W = 160;
const NODE_H = 60;
const COL_GAP = 220;
const ROW_GAP = 90;

function buildGraph(events) {
  // Layout nodes by night/sort_order in columns
  const nights = {};
  events.forEach(ev => {
    const n = ev.night || 1;
    if (!nights[n]) nights[n] = [];
    nights[n].push(ev);
  });

  const nodes = {};
  Object.entries(nights).forEach(([night, evs]) => {
    const col = parseInt(night) - 1;
    evs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    evs.forEach((ev, row) => {
      nodes[ev.event_id] = {
        id: ev.event_id,
        x: col * COL_GAP + 40,
        y: row * ROW_GAP + 40,
        ev,
        isEnding: ev.is_ending,
        endingType: ev.ending_type,
      };
    });
  });

  // Build edges from choices
  const edges = [];
  const eventIdSet = new Set(Object.keys(nodes));
  events.forEach(ev => {
    const choices = (() => { try { return typeof ev.choices === "string" ? JSON.parse(ev.choices) : (ev.choices || []); } catch { return []; } })();
    choices.forEach((c, ci) => {
      const processEffect = (eff, label) => {
        const e = typeof eff === "string" ? (() => { try { return JSON.parse(eff); } catch { return {}; } })() : (eff || {});
        if (e.nextEventId) {
          edges.push({
            id: `${ev.event_id}__${ci}__${label}`,
            from: ev.event_id,
            to: e.nextEventId,
            label: label === "success" ? "✓" : "✗",
            broken: !eventIdSet.has(e.nextEventId),
            choiceIndex: ci,
            effectType: label,
            choiceText: c.text,
            currentTarget: e.nextEventId,
            // For editing: we need to find the right field path
            eventId: ev.event_id,
            dbRecordId: ev.id,
            rawChoices: ev.choices,
          });
        }
      };
      if (c.successEffect) processEffect(c.successEffect, "success");
      if (c.failEffect) processEffect(c.failEffect, "fail");
      if (c.nextEventId && !c.successEffect && !c.failEffect) {
        edges.push({
          id: `${ev.event_id}__${ci}__direct`,
          from: ev.event_id,
          to: c.nextEventId,
          label: "→",
          broken: !eventIdSet.has(c.nextEventId),
          choiceIndex: ci,
          effectType: "direct",
          choiceText: c.text,
          currentTarget: c.nextEventId,
          eventId: ev.event_id,
          dbRecordId: ev.id,
          rawChoices: ev.choices,
        });
      }
    });
  });

  return { nodes, edges };
}

function midpoint(x1, y1, x2, y2) {
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
}

export default function StoryGraphEditor({ events: allEvents, storyId }) {
  const qc = useQueryClient();
  const svgRef = useRef(null);
  const [zoom, setZoom] = useState(0.7);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(null);
  const [nodePositions, setNodePositions] = useState({});
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [editTarget, setEditTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  const events = storyId ? allEvents.filter(e => e.story_id === storyId) : allEvents;

  const { nodes: baseNodes, edges } = useMemo(() => buildGraph(events), [events]);

  // Merge computed positions with user-dragged positions
  const nodes = useMemo(() => {
    const merged = {};
    Object.entries(baseNodes).forEach(([id, node]) => {
      merged[id] = nodePositions[id] ? { ...node, ...nodePositions[id] } : node;
    });
    return merged;
  }, [baseNodes, nodePositions]);

  // Pan with mouse drag on SVG background
  const panStart = useRef(null);
  const onSvgMouseDown = (e) => {
    if (e.target === svgRef.current || e.target.dataset.panbg) {
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };
  const onSvgMouseMove = useCallback((e) => {
    if (dragging) {
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      const x = (e.clientX - svgRect.left) / zoom - pan.x / zoom - NODE_W / 2;
      const y = (e.clientY - svgRect.top) / zoom - pan.y / zoom - NODE_H / 2;
      setNodePositions(p => ({ ...p, [dragging]: { x, y } }));
    } else if (panStart.current) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    }
  }, [dragging, zoom, pan.x]);
  const onSvgMouseUp = () => { setDragging(null); panStart.current = null; };

  useEffect(() => {
    window.addEventListener("mouseup", onSvgMouseUp);
    return () => window.removeEventListener("mouseup", onSvgMouseUp);
  }, []);

  const nodeColor = (node) => {
    if (node.isEnding) {
      if (node.endingType === "good") return { bg: "hsl(123 68% 35% / 0.5)", border: "hsl(123 68% 55%)", text: "hsl(123 68% 80%)" };
      if (node.endingType === "mixed") return { bg: "hsl(40 90% 40% / 0.5)", border: "hsl(40 90% 60%)", text: "hsl(40 90% 80%)" };
      return { bg: "hsl(351 78% 35% / 0.5)", border: "hsl(351 78% 58%)", text: "hsl(351 78% 82%)" };
    }
    if (hoveredNode === node.id) return { bg: "hsl(271 87% 50% / 0.4)", border: "hsl(271 87% 70%)", text: "hsl(271 87% 90%)" };
    return { bg: "hsl(252 12% 20% / 0.95)", border: "hsl(252 10% 36%)", text: "hsl(40 25% 88%)" };
  };

  const edgeColor = (edge) => {
    if (edge.broken) return "hsl(351 78% 55%)";
    if (edge.effectType === "success") return "hsl(123 68% 50%)";
    if (edge.effectType === "fail") return "hsl(351 78% 55%)";
    return "hsl(216 70% 60%)";
  };

  // Save edited nextEventId
  const saveEdge = async () => {
    if (!selectedEdge || !editTarget.trim()) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const ev = events.find(e => e.event_id === selectedEdge.eventId);
      if (!ev) throw new Error("Event not found");
      const choices = typeof ev.choices === "string" ? JSON.parse(ev.choices) : [...(ev.choices || [])];
      const choice = choices[selectedEdge.choiceIndex];
      if (!choice) throw new Error("Choice not found");

      if (selectedEdge.effectType === "direct") {
        choices[selectedEdge.choiceIndex] = { ...choice, nextEventId: editTarget.trim() };
      } else if (selectedEdge.effectType === "success" && choice.successEffect) {
        const eff = typeof choice.successEffect === "string" ? JSON.parse(choice.successEffect) : { ...choice.successEffect };
        eff.nextEventId = editTarget.trim();
        choices[selectedEdge.choiceIndex] = { ...choice, successEffect: eff };
      } else if (selectedEdge.effectType === "fail" && choice.failEffect) {
        const eff = typeof choice.failEffect === "string" ? JSON.parse(choice.failEffect) : { ...choice.failEffect };
        eff.nextEventId = editTarget.trim();
        choices[selectedEdge.choiceIndex] = { ...choice, failEffect: eff };
      }

      await base44.entities.GameEvent.update(ev.id, { choices: JSON.stringify(choices) });
      qc.invalidateQueries({ queryKey: ["events"] });
      setSaveMsg({ type: "ok", text: `Link updated: ${selectedEdge.eventId} → ${editTarget.trim()}` });
      setSelectedEdge(null);
    } catch (e) {
      setSaveMsg({ type: "err", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  // Canvas dimensions
  const maxX = Math.max(...Object.values(nodes).map(n => n.x + NODE_W), 600);
  const maxY = Math.max(...Object.values(nodes).map(n => n.y + NODE_H), 400);
  const svgW = maxX + 120;
  const svgH = maxY + 120;

  const brokenCount = edges.filter(e => e.broken).length;

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
        <p className="text-xs text-muted-foreground">No events loaded for this story.</p>
        <p className="text-[10px] text-muted-foreground/60">Import a story JSON to populate the graph.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setZoom(z => Math.min(2, z + 0.1))}><ZoomIn className="w-3 h-3" /></Button>
        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}><ZoomOut className="w-3 h-3" /></Button>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]" onClick={() => { setZoom(0.7); setPan({ x: 0, y: 0 }); }}><Maximize2 className="w-3 h-3" /> Reset</Button>
        <span className="text-[9px] text-muted-foreground">{Object.keys(nodes).length} events · {edges.length} links</span>
        {brokenCount > 0 && (
          <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: "hsl(351 78% 60% / 0.15)", color: "hsl(351 78% 68%)" }}>
            <AlertTriangle className="w-3 h-3" /> {brokenCount} broken link{brokenCount > 1 ? "s" : ""}
          </span>
        )}
        {saveMsg && (
          <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: saveMsg.type === "ok" ? "hsl(123 68% 62%)" : "hsl(351 78% 65%)" }}>
            {saveMsg.type === "ok" ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            {saveMsg.text}
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-[8px] text-muted-foreground">
        {[["hsl(123 68% 50%)", "Success path"], ["hsl(351 78% 55%)", "Fail / broken"], ["hsl(216 70% 60%)", "Direct link"], ["hsl(123 68% 55%)", "Good ending"], ["hsl(40 90% 60%)", "Mixed ending"], ["hsl(351 78% 55%)", "Bad ending"]].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: c }} />{l}</span>
        ))}
      </div>

      {/* Edge editor panel */}
      {selectedEdge && (
        <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(252 12% 16%)", border: "1.5px solid hsl(271 87% 65% / 0.4)" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold" style={{ color: "hsl(271 87% 72%)" }}>Edit Link</p>
              <p className="text-[9px] text-muted-foreground">
                {selectedEdge.eventId} → [{selectedEdge.effectType}] choice {selectedEdge.choiceIndex}: "{selectedEdge.choiceText?.slice(0, 40)}"
              </p>
              {selectedEdge.broken && (
                <p className="text-[9px] mt-0.5" style={{ color: "hsl(351 78% 65%)" }}>⚠ Current target "{selectedEdge.currentTarget}" not found</p>
              )}
            </div>
            <button onClick={() => setSelectedEdge(null)}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
          </div>
          <div className="flex gap-2">
            <Input
              value={editTarget}
              onChange={e => setEditTarget(e.target.value)}
              placeholder="Target event_id..."
              className="h-7 text-xs flex-1 font-mono"
              list="event-id-list"
            />
            <datalist id="event-id-list">
              {events.map(ev => <option key={ev.event_id} value={ev.event_id} />)}
            </datalist>
            <Button size="sm" className="h-7 gap-1 text-xs" onClick={saveEdge} disabled={saving || !editTarget.trim()}
              style={{ background: "hsl(271 87% 52%)" }}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
            </Button>
          </div>
        </div>
      )}

      {/* SVG Canvas */}
      <div className="overflow-hidden rounded-xl cursor-grab active:cursor-grabbing select-none"
        style={{ background: "hsl(252 14% 8%)", border: "1px solid hsl(252 10% 20%)", height: 520 }}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          onMouseDown={onSvgMouseDown}
          onMouseMove={onSvgMouseMove}
          onMouseUp={onSvgMouseUp}
        >
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Background grid */}
            <rect data-panbg="1" x={-2000} y={-2000} width={svgW + 4000} height={svgH + 4000} fill="transparent" />
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(252 10% 16%)" strokeWidth="0.5" />
              </pattern>
              <marker id="arrow-ok" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="hsl(216 70% 60%)" />
              </marker>
              <marker id="arrow-success" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="hsl(123 68% 50%)" />
              </marker>
              <marker id="arrow-fail" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="hsl(351 78% 55%)" />
              </marker>
            </defs>
            <rect x={-2000} y={-2000} width={svgW + 4000} height={svgH + 4000} fill="url(#grid)" />

            {/* Edges */}
            {edges.map(edge => {
              const from = nodes[edge.from];
              const to = nodes[edge.to];
              if (!from) return null;

              const x1 = from.x + NODE_W;
              const y1 = from.y + NODE_H / 2;
              const x2 = to ? to.x : x1 + 80;
              const y2 = to ? to.y + NODE_H / 2 : y1;
              const mid = midpoint(x1, y1, x2, y2);
              const color = edgeColor(edge);
              const markerId = edge.effectType === "success" ? "arrow-success" : edge.effectType === "fail" ? "arrow-fail" : "arrow-ok";
              const isSelected = selectedEdge?.id === edge.id;

              return (
                <g key={edge.id}>
                  <path
                    d={`M ${x1} ${y1} C ${x1 + 60} ${y1} ${x2 - 60} ${y2} ${x2} ${y2}`}
                    fill="none"
                    stroke={isSelected ? "hsl(271 87% 65%)" : color}
                    strokeWidth={isSelected ? 3 : edge.broken ? 2 : 1.5}
                    strokeDasharray={edge.broken ? "6 3" : "none"}
                    markerEnd={`url(#${markerId})`}
                    opacity={0.85}
                  />
                  {/* Clickable hit area */}
                  <path
                    d={`M ${x1} ${y1} C ${x1 + 60} ${y1} ${x2 - 60} ${y2} ${x2} ${y2}`}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    style={{ cursor: "pointer" }}
                    onClick={() => { setSelectedEdge(edge); setEditTarget(edge.currentTarget); setSaveMsg(null); }}
                  />
                  {/* Edge label */}
                  <text x={mid.x} y={mid.y - 4} textAnchor="middle" fontSize={8}
                    fill={edge.broken ? "hsl(351 78% 68%)" : color} fontWeight="bold">
                    {edge.label}{edge.broken ? " !" : ""}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {Object.values(nodes).map(node => {
              const colors = nodeColor(node);
              return (
                <g key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  style={{ cursor: "grab" }}
                  onMouseDown={e => { e.stopPropagation(); setDragging(node.id); }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <rect width={NODE_W} height={NODE_H} rx={8}
                    fill={colors.bg} stroke={colors.border} strokeWidth={hoveredNode === node.id ? 2 : 1} />
                  {/* Event ID */}
                  <text x={8} y={16} fontSize={8} fill={colors.text} fontWeight="bold" fontFamily="monospace">
                    {node.id.slice(0, 22)}
                  </text>
                  {/* Night badge */}
                  <text x={NODE_W - 6} y={12} fontSize={7} fill={colors.border} textAnchor="end">
                    N{node.ev.night || 1}
                  </text>
                  {/* Text preview */}
                  <text x={8} y={30} fontSize={7.5} fill={colors.text} opacity={0.7}>
                    {String(node.ev.text || "").slice(0, 26)}{node.ev.text?.length > 26 ? "…" : ""}
                  </text>
                  {/* Ending badge */}
                  {node.isEnding && (
                    <text x={8} y={50} fontSize={7} fontWeight="bold"
                      fill={node.endingType === "good" ? "hsl(123 68% 65%)" : node.endingType === "mixed" ? "hsl(40 90% 65%)" : "hsl(351 78% 65%)"}>
                      ■ {(node.endingType || "bad").toUpperCase()} END
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <p className="text-[8px] text-muted-foreground/40 text-center">
        Drag nodes to reposition · Click edges to edit nextEventId · Changes write directly to DB
      </p>
    </div>
  );
}