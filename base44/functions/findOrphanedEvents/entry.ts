import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { story_id } = await req.json();

    const events = await base44.entities.GameEvent.filter({ story_id });
    if (events.length === 0) return Response.json({ orphaned_events: [] });

    events.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const eventMap = new Map(events.map(e => [e.event_id, e]));

    // DFS from first event
    const visited = new Set();
    const stack = [events[0].event_id];
    while (stack.length > 0) {
      const eid = stack.pop();
      if (visited.has(eid)) continue;
      visited.add(eid);
      const ev = eventMap.get(eid);
      if (ev?.choices) {
        try {
          const choices = typeof ev.choices === 'string' ? JSON.parse(ev.choices) : ev.choices;
          choices.forEach(c => {
            const nextId = c.successEffect?.nextEventId || c.failEffect?.nextEventId || c.nextEventId;
            if (nextId && !visited.has(nextId)) stack.push(nextId);
          });
        } catch (_) {}
      }
    }

    const orphaned = events.filter(e => !visited.has(e.event_id)).map(e => ({
      event_id: e.event_id,
      sort_order: e.sort_order,
      text: e.text?.substring(0, 60),
    }));

    return Response.json({ story_id, orphaned_event_count: orphaned.length, orphaned_events: orphaned });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});