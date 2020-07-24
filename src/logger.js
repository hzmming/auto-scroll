const isSilent = process.env.NODE_ENV === "production";

export function log(...message) {
  if (!isSilent) {
    console.log(...message);
  }
}

export function warn(...message) {
  if (!isSilent) {
    console.log(...message);
  }
}

export function error(...message) {
  if (!isSilent) {
    console.error(...message);
  }
}
