export const navigation = {
  currentPath() {
    return window.location.pathname + window.location.search;
  },
  assign(url) {
    window.location.assign(url);
  },
};
