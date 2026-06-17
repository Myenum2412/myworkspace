export function createEvent(type, payload) {
    return { type, payload, timestamp: Date.now() };
}
