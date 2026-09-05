let resolveReady;

export const ready = new Promise((resolve) => {
  resolveReady = resolve;
});

export function markReady() {
  resolveReady();
}
