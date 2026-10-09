import * as ImageManipulator from "expo-image-manipulator";

// Longest edge sent to the backend. Plenty for reading on-screen text and
// faces, and keeps uploads well under the backend's 8MB limit.
const MAX_IMAGE_EDGE = 1600;

export type PreparedImage = { base64: string; uri: string };

// Shrinks the image so its longest edge is at most MAX_IMAGE_EDGE and
// re-encodes it as JPEG. Images already small enough are only re-encoded.
export async function prepareImage(uri: string, width?: number, height?: number, maxEdge = MAX_IMAGE_EDGE): Promise<PreparedImage> {
  const longest = Math.max(width ?? 0, height ?? 0);
  const actions: ImageManipulator.Action[] = [];
  if (!longest || longest > maxEdge) {
    // When the size is unknown, width is assumed to be the longest edge.
    actions.push({
      resize: (height ?? 0) > (width ?? 0) ? { height: maxEdge } : { width: maxEdge },
    });
  }
  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) throw new Error("Couldn't process that image. Please try another.");
  return { base64: result.base64, uri: result.uri };
}
