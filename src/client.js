import axios from "axios";

let client = axios;

export function setClient(instance) {
  client = instance ?? axios;
}

export function getClient() {
  return client;
}
