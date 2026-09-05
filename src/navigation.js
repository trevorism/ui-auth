export const navigation = {
  currentPath() {
    return window.location.pathname + window.location.search + window.location.hash;
  },
  assign(url) {
    window.location.assign(url);
  },
};
