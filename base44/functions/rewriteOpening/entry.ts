import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { story_id, new_text } = await req.json();

    const events = await base44.entities.GameEvent.filter({ story_id });
    events.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    if (events.length === 0) {
      return Response.json({ error: "No events found for story" }, { status: 404 });
    }

    const firstEvent = events[0];
    const updated = await base44.entities.GameEvent.update(firstEvent.id, { text: new_text });

    return Response.json({
      story_id,
      event_id: firstEvent.event_id,
      old_text: firstEvent.text?.substring(0, 80),
      new_text: new_text?.substring(0, 80),
      updated: true,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});