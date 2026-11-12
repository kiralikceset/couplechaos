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

function isNativeApp(): boolean {
  const capacitor = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  try {
    return Boolean(capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

/**
 * In the Android/iOS app the WebView ignores <a download>, so the image is
 * written to the app's cache and handed to the phone's own share sheet
 * ("Save to gallery / Files / WhatsApp ...").
 */
async function shareNatively(dataUrl: string, filename: string, title: string, text: string): Promise<"shared"> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import("@capacitor/filesystem"), import("@capacitor/share")]);
  const base64 = dataUrl.split(",", 2)[1] || "";
  const safeName = filename.replace(/[^\w.\-]+/g, "_") || "couple-chaos.png";
  const written = await Filesystem.writeFile({ path: safeName, data: base64, directory: Directory.Cache });
  try {
    await Share.share({ title, text, files: [written.uri], dialogTitle: title });
  } catch (error) {
    const message = String((error as { message?: string })?.message || error).toLowerCase();
    if (message.includes("cancel")) throw new DOMException("cancelled", "AbortError");
    throw error;
  }
  return "shared";
}

export async function shareOrDownloadImage(dataUrl: string, filename: string, title: string, text: string): Promise<"shared" | "downloaded"> {
  if (isNativeApp()) return shareNatively(dataUrl, filename, title, text);

  const file = dataUrlToFile(dataUrl, filename);
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    try {
      await navigator.share({ title, text, files: [file] });
      return "shared";
    } catch (error) {
      // Cancelling is intentional. Other share failures fall back to a regular download.
      if (error instanceof DOMException && error.name === "AbortError") throw error;
    }
  }

  // Blob URL works in more browsers than a huge data: URL (iOS Safari, Chrome Android).
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return "downloaded";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Same as shareOrDownloadImage, for any file (e.g. the replay video). */
export async function shareOrDownloadFile(blob: Blob, filename: string, title: string, text: string): Promise<"shared" | "downloaded"> {
  if (isNativeApp()) return shareNatively(await blobToDataUrl(blob), filename, title, text);
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title, text, files: [file] });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "downloaded";
}

