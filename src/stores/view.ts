// The one view-switch store, standing in for a router — three views, no
// deep linking inside an installed PWA. See docs/ARCHITECTURE.md §5.

import { writable } from "svelte/store";

export type View = "cheatSheet" | "maxes" | "program";

export const viewStore = writable<View>("cheatSheet");
