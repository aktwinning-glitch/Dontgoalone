import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    return Response.json({ cleared: true, memory: {} });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});