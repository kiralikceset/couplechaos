function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be decoded"));
    image.src = dataUrl;
  });
}

export async function createThumbnail(dataUrl: string, maxSize = 160): Promise<string> {
  if (!dataUrl.startsWith("data:image/")) return "";
  try {
    const image = await loadImage(dataUrl);
    const ratio = Math.min(maxSize / image.naturalWidth, maxSize / image.naturalHeight, 1);
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return "";
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return "";
  }
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [metadata, encoded] = dataUrl.split(",", 2);
  if (!metadata?.startsWith("data:image/") || !encoded) throw new Error("Invalid image data");
  const mimeType = metadata.match(/data:([^;]+)/)?.[1] || "image/png";
  const binary = atob(encoded || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], filename, { type: mimeType });
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }
}

export async function shareOrDownloadImage(dataUrl: string, filename: string, title: string, text: string): Promise<"shared" | "downloaded"> {
  const file = dataUrlToFile(dataUrl, filename);
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    try {
      await navigator.share({ title, text, files: [file] });
      return "shared";
    } catch (error) {
      // Cancelling is intentional. Other WebView share failures fall back to a
      // regular download so the user's generated image is not lost.
      if (error instanceof DOMException && error.name === "AbortError") throw error;
    }
  }

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return "downloaded";
}
