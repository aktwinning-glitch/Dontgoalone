import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { story_id } = await req.json();

    const events = await base44.entities.GameEvent.filter({ story_id });
    events.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    const endings = events.filter(e => e.is_ending);
    const endingTypes = [...new Set(endings.map(e => e.ending_type))];

    const summary = {
      story_id,
      total_events: events.length,
      first_event: events[0] ? { event_id: events[0].event_id, text: events[0].text?.substring(0, 80) } : null,
      last_event: events[events.length - 1] ? { event_id: events[events.length - 1].event_id } : null,
      ending_count: endings.length,
      ending_types: endingTypes,
      events_with_choices: events.filter(e => e.choices).length,
    };

    return Response.json(summary);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});