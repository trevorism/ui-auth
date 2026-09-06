# ui-auth
![Build](https://github.com/trevorism/ui-auth/actions/workflows/build.yml/badge.svg)
![GitHub last commit](https://img.shields.io/github/last-commit/trevorism/ui-auth)
![GitHub language count](https://img.shields.io/github/languages/count/trevorism/ui-auth)
![GitHub top language](https://img.shields.io/github/languages/top/trevorism/ui-auth)
![npm](https://img.shields.io/npm/v/@trevorism/ui-auth)

Browser session handling for Trevorism.com apps. It is the frontend half of the login handoff, and it
talks only to the app's own backend, which is `micronaut-ui-auth`. Nothing here reads `document.cookie`
and the access token never reaches JavaScript.

## Usage

main.js
```javascript
import { createApp } from "vue";
import { TrevorismAuth } from "@trevorism/ui-auth";

import App from "./App.vue";
import router from "./router";

const app = createApp(App);
app.use(router);
app.use(TrevorismAuth, { router });
app.mount("#app");
```

Any component
```javascript
<script setup>
import { useAuth } from "@trevorism/ui-auth";

const { user, isAuthenticated, isAdmin, loading, login, logout } = useAuth();
</script>
```

Passing `router` is optional. When present, any route with `meta.requiresAuth` sends a signed out
visitor to login and returns them to that route afterwards.

```javascript
{ path: "/report", component: Report, meta: { requiresAuth: true } }
```

## What the plugin does on install

- Calls `GET /api/auth/session` once and populates a shared reactive store. `ready` resolves after it.
- Installs an axios response interceptor on the global instance. A 401 from a same origin `/api/`
  request that is not itself under `/api/auth/` triggers a single refresh, shared between concurrent
  failures, and the original request is replayed once. If the refresh fails the store is cleared and
  the visitor goes to login.
- Schedules a refresh for one minute before the access token expires, re-arms after every refresh,
  and pauses while the tab is hidden. A tab that comes back overdue refreshes immediately.

## API

| Export | Purpose |
|---|---|
| `TrevorismAuth` | The Vue plugin. `app.use(TrevorismAuth, { router, axios })` |
| `useAuth()` | `{ user, isAuthenticated, isAdmin, loading, ready, login, logout, refresh }` |
| `installOn(instance)` | Install the interceptor on an axios instance of your own, and route the library's own calls through it |
| `setClient(instance)` | Point the library's session, refresh and logout calls at an axios instance |
| `login(next)` | Navigate to `/api/auth/login`, defaulting `next` to the current path |
| `logout()` | Clear the session, then follow the logout URL the backend returns |

`user`, `isAuthenticated`, `isAdmin` and `loading` are computed refs. `ready` is a promise, so
`await ready` before reading state outside a template. `loading` is true until the first session
fetch settles, which is what stops a header rendering "Login" for a signed in user.

Apps that use their own axios instance pass it in, or call `installOn` directly:

```javascript
import axios from "axios";
import { installOn } from "@trevorism/ui-auth";

const client = axios.create({ baseURL: "/api" });
installOn(client);
```

## Development

```
npm install
npm run accept
npm run build
npm run lint
```

`npm run accept` is the suite CI runs. Tests use vitest with jsdom and mock axios with
`axios-mock-adapter`. There is no dev server, because the library has no components and the flow
needs a real backend to exercise.
