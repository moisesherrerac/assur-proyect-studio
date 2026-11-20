/** Validate the image without resizing or re-encoding it. */
export async function readOriginalImage(source: string): Promise<string> {
  const image = new Image();
  image.src = source;
  await image.decode();
  return source;
}
