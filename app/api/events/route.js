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
      
      // Send initial connection confirmation immediately
      send({ type: 'ready', at: Date.now() });
      
      // Initialize change streams asynchronously to reduce initial connection time
      setTimeout(async () => {
        try {
          client = await clientPromise;
          db = client.db(process.env.MONGODB_DB);
          const names = channels.length ? channels : ['gate_logs','staff_attendance','staff_shifts','staff_tasks','alerts'];
          
          // Limit concurrent change stream initialization
          const batchSize = 2;
          for (let i = 0; i < names.length; i += batchSize) {
            const batch = names.slice(i, i + batchSize);
            await Promise.all(batch.map(async (name) => {
              try {
                const collection = db.collection(name);
                const changeStream = collection.watch([], { 
                  fullDocument: 'updateLookup',
                  maxAwaitTimeMS: 1000 // Reduce timeout
                });
                changeStream.on('change', (change) => {
                  send({ type: 'change', collection: name, change });
                });
                watchers.push(changeStream);
                send({ type: 'stream_ready', collection: name, at: Date.now() });
              } catch (error) {
                send({ type: 'stream_error', collection: name, error: error.message });
              }
            }));
          }
        } catch (e) {
          send({ type: 'error', message: 'Failed to open change streams', error: e.message });
        }
      }, 100); // Small delay to allow response to be sent first

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


