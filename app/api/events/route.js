import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';

export const runtime = 'nodejs';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const channelsParam = searchParams.get('channels') || '';
  const channels = channelsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const stream = new ReadableStream({
    start: async (controller) => {
      const encoder = new TextEncoder();
      function send(event) {
        const payload = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      }

      send({ type: 'connected', at: Date.now(), channels });

      let client; let db; let watchers = [];
      try {
        client = await clientPromise;
        db = client.db(process.env.MONGODB_DB);
        const names = channels.length ? channels : ['gate_logs','staff_attendance','staff_shifts','staff_tasks','alerts'];
        for (const name of names) {
          try {
            const collection = db.collection(name);
            const changeStream = collection.watch([], { fullDocument: 'updateLookup' });
            changeStream.on('change', (change) => {
              send({ type: 'change', collection: name, change });
            });
            watchers.push(changeStream);
          } catch {
            // ignore invalid collection
          }
        }
      } catch (e) {
        send({ type: 'error', message: 'Failed to open change streams' });
      }

      const abort = request.signal;
      const onAbort = () => {
        try { watchers.forEach((w) => w.close()); } catch {}
        controller.close();
      };
      abort.addEventListener('abort', onAbort);
    },
    cancel: () => {}
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}


