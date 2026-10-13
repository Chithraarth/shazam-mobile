import type { PreparedImage } from "@/lib/image";

// The frame waiting to be identified. Kept in memory rather than passed as a
// route param, because a base64 image is far too large for navigation state.
export type PendingFrame = PreparedImage & {
  source: "camera" | "photo" | "recording";
  // More frames from a 15-second camera scan, sent alongside the main one.
  extraFrames?: string[];
};

let pending: PendingFrame | null = null;

export function setPendingFrame(frame: PendingFrame): void {
  pending = frame;
}

export function getPendingFrame(): PendingFrame | null {
  return pending;
}

export function clearPendingFrame(): void {
  pending = null;
}
