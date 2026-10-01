// The Scan screen registers its capture function here so the centre button of
// the tab bar can act as the camera shutter while that screen is focused.
let handler: (() => void) | null = null;

export function registerScanTrigger(fn: (() => void) | null): void {
  handler = fn;
}

export function triggerScan(): boolean {
  if (!handler) return false;
  handler();
  return true;
}
