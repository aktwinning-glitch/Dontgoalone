import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { story_id } = await req.json();

    const events = await base44.entities.GameEvent.filter({ story_id });

    const endings = events.filter(e => e.is_ending);
    const endingTypes = new Set(endings.map(e => e.ending_type));
    const missingTypes = ['good', 'mixed', 'bad'].filter(t => !endingTypes.has(t));

    const summary = {
      story_id,
      total_endings: endings.length,
      present_types: [...endingTypes],
      missing_types: missingTypes,
      all_complete: missingTypes.length === 0,
    };

    return Response.json(summary);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});