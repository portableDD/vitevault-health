/**
 * Server-side helper for pushing realtime SSE events from API routes.
 *
 * The live client connections (EventSource writers) live inside
 * /api/socket/route.ts's module scope. In Next.js dev, each route.ts is
 * bundled separately, so importing that module's state directly from another
 * route file does NOT share the same in-memory Map. Instead, we call the
 * socket route's own POST handler over HTTP (using the current request's
 * origin), which is guaranteed to hit the single module instance actually
 * holding the connections.
 */

export async function notifyRealtime(
    requestUrl: string,
    type: 'balance:update' | 'notification' | 'refill:alert' | 'broadcast',
    targetUserId: string,
    data: Record<string, unknown>
): Promise<void> {
    try {
        const origin = new URL(requestUrl).origin;
        await fetch(`${origin}/api/socket`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, targetUserId, data }),
        });
    } catch (e) {
        // Realtime delivery is best-effort; failures shouldn't break the caller's request.
        console.error('Failed to send realtime event:', e);
    }
}
