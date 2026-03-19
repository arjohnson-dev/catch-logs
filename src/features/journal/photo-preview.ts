export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string" && reader.result.length > 0) {
        resolve(reader.result);
        return;
      }

      reject(new Error("Could not read the selected image."));
    };

    reader.onerror = () => {
      reject(new Error("Could not read the selected image."));
    };

    reader.readAsDataURL(file);
  });
}
