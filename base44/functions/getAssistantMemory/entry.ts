import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const memory = {
      objective: null,
      targetStory: null,
      targetModule: null,
      lastStep: null,
      pending: null,
      lastError: null,
    };
    return Response.json(memory);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});