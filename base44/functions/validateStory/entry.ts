import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { story_id } = await req.json();

    if (!story_id) {
      return Response.json({ error: "story_id required" }, { status: 400 });
    }

    const events = await base44.entities.GameEvent.filter({ story_id });
    const eventMap = new Map(events.map(e => [e.event_id, e]));

    const issues = {
      errors: [],
      warnings: [],
      stats: {
        total_events: events.length,
        with_choices: events.filter(e => e.choices).length,
        is_ending: events.filter(e => e.is_ending).length,
        missing_ending_type: events.filter(e => e.is_ending && !e.ending_type).length,
      },
    };

    const visited = new Set();
    const brokenLinks = [];
    const unreachable = [];

    // Check each event
    events.forEach(ev => {
      // Duplicate IDs
      if (events.filter(e => e.event_id === ev.event_id).length > 1) {
        issues.errors.push(`Duplicate event_id: ${ev.event_id}`);
      }

      // Invalid difficulty
      try {
        const choices = typeof ev.choices === 'string' ? JSON.parse(ev.choices) : (ev.choices || []);
        choices.forEach(c => {
          if (c.difficulty && (c.difficulty < 1 || c.difficulty > 4)) {
            issues.errors.push(`Event ${ev.event_id}: invalid difficulty ${c.difficulty}`);
          }
          if (c.statUsed && !['strength', 'speed', 'resilience', 'intelligence', 'charm', 'influence', 'fear'].includes(c.statUsed)) {
            issues.errors.push(`Event ${ev.event_id}: invalid statUsed ${c.statUsed}`);
          }
          const nextId = c.successEffect?.nextEventId || c.failEffect?.nextEventId || c.nextEventId;
          if (nextId && !eventMap.has(nextId)) {
            brokenLinks.push({ source: ev.event_id, target: nextId });
          }
        });
      } catch (e) {
        issues.errors.push(`Event ${ev.event_id}: invalid choices JSON`);
      }

      // Ending validation
      if (ev.is_ending && !ev.ending_type) {
        issues.warnings.push(`Event ${ev.event_id} (ending): missing ending_type`);
      }
      if (ev.is_ending && !ev.ending_text) {
        issues.warnings.push(`Event ${ev.event_id} (ending): missing ending_text`);
      }
    });

    // Find unreachable events (simple DFS from first event)
    if (events.length > 0) {
      const firstEvent = events[0];
      const stack = [firstEvent.event_id];
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
      events.forEach(e => {
        if (!visited.has(e.event_id)) unreachable.push(e.event_id);
      });
    }

    if (brokenLinks.length > 0) {
      issues.errors.push(`Broken links: ${brokenLinks.map(b => `${b.source} -> ${b.target}`).join(', ')}`);
    }
    if (unreachable.length > 0) {
      issues.warnings.push(`Unreachable events: ${unreachable.join(', ')}`);
    }

    // Check for missing endings
    const endingtypes = new Set(events.filter(e => e.is_ending).map(e => e.ending_type));
    const missingEndings = ['good', 'mixed', 'bad'].filter(t => !endingtypes.has(t));
    if (missingEndings.length > 0) {
      issues.warnings.push(`Missing ending types: ${missingEndings.join(', ')}`);
    }

    return Response.json({
      story_id,
      issues,
      broken_links: brokenLinks,
      unreachable_events: unreachable,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});