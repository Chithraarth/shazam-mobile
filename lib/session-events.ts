// Tiny pub/sub so any API call that gets a 401 for a signed-in user can raise
// the "please sign in again" dialog mounted at the app root.
type Listener = () => void;
const listeners = new Set<Listener>();

export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitSessionExpired(): void {
  listeners.forEach((l) => l());
}
