# Showdrop frontend

React 19 + TypeScript + Vite + **Motion** (animations), with **Redux + redux-saga** for state and side effects, and **SCSS modules** on a shared design-token system. It follows the same structure as the GoldStack frontend.

## Folder structure

```
src/
├── index.tsx              # creates the Redux store, starts the sagas, loads global styles
├── App.tsx                # router + app-wide ErrorBoundary, ExceptionModal, Toaster
├── AppRouting.tsx         # URL -> page
└── App/
    ├── Constants/         # routes, API URLs, app-wide values, option lists
    ├── Models/            # TypeScript types mirroring the backend's JSON (DTOs)
    ├── Services/          # one class per backend resource; httpServices.ts is the ONLY fetch()
    ├── Utils/             # InfoStore (storage), sagaHelpers, errors, format, cx
    ├── Redux/
    │   ├── Actions/       # action type constants, one file per feature (ShowConstants.tsx ...)
    │   ├── Reducers/      # pure (state, action) -> newState, combined in reducers.tsx
    │   └── Sagas/         # API calls and other side effects, started by rootsaga.tsx
    ├── GlobalStyles/
    │   ├── tokens.scss    # colour palette, semantic colours, typography, spacing, dark theme
    │   └── global.scss    # element defaults + shared keyframes
    ├── Components/
    │   ├── CustomUI/      # reusable library: Button, Card, Text, TextField, Badge, Modal ...
    │   ├── CustomHooks/   # useCountdown, useDispatchOnMount, useDocumentTitle
    │   ├── AppShell/      # top bar, page layout, RequireAuth guard
    │   └── SeatMap/, EventCard/, TicketSummary/, ChatWidget/, ...   # app-specific pieces
    └── Views/             # one folder per page: Events, EventDetail, Show, Checkout, Auth, Bookings
```

## How data flows

```
component ──dispatch({type: SHOW_REQUEST})──▶ saga ──ShowService.get()──▶ backend
    ▲                                           │
    └──── useSelector(state.show) ◀── reducer ◀─┘ put({type: SHOW_SUCCESS, payload})
```

1. **A component dispatches an action** describing what happened, e.g. `SEATS_HOLD_REQUEST` when the user clicks Pay.
2. **A saga sees the action** and calls a Service through `callApi` / `callApiHandled`. These handle a 401 (session expired) and unexpected errors (the global modal) in one place.
3. **The saga puts a `*_SUCCESS` or `*_FAILURE` action.**
4. **The reducer computes the new state.** Every piece of server data is a `RequestState` (`data`, `loading`, `error`, `err`).
5. **Components re-render** from `useSelector`.

## Reusable components (`App/Components/CustomUI`)

Pages never style raw `<button>`, `<input>` or `<a>`. They compose these instead:

| Component | Use it for |
|---|---|
| `Button` / `ButtonLink` | Every clickable action. `variant`: primary, secondary, outline, ghost, danger, brand. `size`: sm, md, lg. Also `loading`, `fullWidth`, `shape="pill"` |
| `IconButton` | Icon-only actions (close, log out). `label` is required for screen readers |
| `TextLink` | In-text links ("Log in", "← All events") |
| `TextField` | Labelled inputs with error/hint text (`hideLabel` for a chat box) |
| `Text` | All typography: `variant` h1, h2, h3, body, small, caption, overline… and `tone` |
| `Card`, `Stack`, `Grid` | Surfaces and layout |
| `Badge`, `InlineAlert`, `EmptyState`, `Skeleton`, `Spinner`, `Icon` | Status and feedback |
| `Tabs` | Pill tabs with a sliding highlight (category filter, date picker, ticket status) |
| `TiltCard` | 3D tilt toward the pointer + holographic shine |
| `Reveal`, `RevealGroup`/`RevealItem` | Fade-and-rise in on scroll, optionally staggered |
| `AnimatedNumber`, `ProgressRing`, `Marquee` | Counting numbers, the countdown ring, endless tickers |
| `Modal` | Any dialog (focus, Escape key, backdrop click handled) |
| `ConfirmDialog` | "Are you sure?" before something you can't undo, built on `Modal` |

## Error handling

| Kind of error | Example | Shown as |
|---|---|---|
| Expected (user can fix it) | seat taken (409), wrong password (401 on login), validation (400) | Inline, next to the form (`FormError`, field errors) |
| Unexpected (not the user's fault) | backend down (502/503), network, 5xx | The global **ExceptionModal** |
| Session expired (401 while logged in) | token expired | ExceptionModal with **Log in again** |
| Render crash | a bug in a component | `ErrorBoundary` fallback page |

The **ExceptionModal** is reusable:

- **`ExceptionModal`** is presentational. Pass `error`, `onDismiss` and an optional `onRetry` / `onLogin`, and use it anywhere you hold an error yourself.
- **`GlobalExceptionModal`** is mounted once in `App.tsx` and connected to Redux. You can show it from anywhere:
  - in a saga: `yield put(exceptionRaised(error))`. Sagas using `callApi` do this automatically for unexpected errors.
  - in a component: `const showException = useException(); showException(error, retryAction?)`

**Try again** re-dispatches the request that failed. The error reducer remembers the last `*_REQUEST`, so the page recovers without a reload. Login and signup requests are never stored, because they contain a password.

## Design language: "Midnight Marquee"

The app has its own identity, deliberately unlike BookMyShow's red-on-white:

- **Look:** dark-first, ultraviolet brand colour and acid-lime "go" colour (selected seats, Pay buttons, success). Display type is Unbounded, body type is Inter.
- **Generated poster art** (`PosterArt`): every event gets a consistent, on-brand poster built from its category's palette and motif (projector rings, sound bars, halftone, spotlight). No stock photos.
- **Inspiration:**
  - DICE (ustwo, Animade): poster-first feed, playful micro-interactions, hold-to-reveal ticket.
  - Eventbrite (Instrument): a solid design system underneath.
  - Coachella (Haven): cursor-reactive shapes, finely tuned motion.
  - Klangtherapie Festival: shiny, holographic ticket cards.

**Motion** (the `motion` library) is used for:
- **Physics springs:** TiltCard 3D tilt and holographic shine, the hero aurora that follows the cursor, magnetic hover lifts.
- **Shared-layout animation:** the sliding indicators in `Tabs` and the nav, the grid re-flowing when you filter, seat chips in the dock.
- **Entrances:** page transitions, kinetic headline, `Reveal` on scroll, the confirmed ticket "printing", `Confetti`.
- **Number animation:** the total counts up (`AnimatedNumber`) and the countdown ring drains (`ProgressRing`).

Showdrop's own motion set, built around the theatre and the ticket:
- **Ticket-tear intro** (`Components/TicketIntro`): a ticket springs up, its stub is punched, then it tears along the perforation and the halves fly apart to reveal the site. Once per session, skippable with any input.
- **Curtain up** (`Views/Events/CurtainStage`): scrolling draws back velvet curtains. A marquee sign with chasing bulbs fades out, a spotlight sweeps the stage, and posters rise out of the floor one by one.
- **Ticket journey** (`Views/Events/TicketRoute`): a dotted route draws itself as you scroll. A ticket rides its tip and each step lights up as the ticket reaches it.
- **Stage spotlights** (`Components/Stage/Spotlights`): two beams that swing to follow the cursor and sway when idle.
- **Sound ring** (`Components/Stage/SoundRing`): a circular equalizer around the Music page's record that dances to a beat and jumps toward the cursor.
- **Typography and numbers:**
  - `FlipText`: letters flip down like departure-board tiles.
  - `FlapNumber`: split-flap digits roll into place.
  - Hero posters are dealt in face-down and flip over as they land.
- **Small touches:**
  - `SparkBurst`: a ring and lime sparks pop from the click point on main buttons.
  - The header shrinks into a compact pill after the hero.
  - Reading progress is a row of seats along the top that fills up.
  - The phone menu is a pile of tilted ticket stubs.
- **Shared values:** a small set of named easings and springs (`Utils/motion.ts`). Smooth wheel scrolling uses the Lenis library (`Utils/smoothScroll.ts`).

Everything respects the OS **Reduce motion** setting (`MotionConfig reducedMotion="user"` plus a CSS fallback).

## Music (coming soon, UI only)

`/music` is a frontend-only preview (`Views/Music`, data in `Constants/musicPreview.ts`): a line-up of fictional gigs, a features list, and a waitlist. The waitlist is saved in this browser via `InfoStore` until the backend exists. When the music backend is added, replace the preview data with a `MusicService` + saga, following the same pattern as `EventService`.

## Styling

- Components use **only semantic tokens**: `var(--color-accent)`, `var(--font-size-md)`, `var(--space-4)`. They never use raw colours or pixel sizes.
- **Change a token in `tokens.scss`** and the whole app updates. Dark mode is the same token names with different values.
- **Typography goes through `<Text variant="h1|h2|body|small|caption…" tone="muted|accent…">`** rather than ad-hoc font sizes.
- **Each component has its own `*.module.scss`.** Class names are scoped automatically, so they can't clash.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server on http://localhost:5173 (proxies `/api` → :8080, `/agent` → :8000) |
| `npm run build` | Type-check + production build into `dist/` |
| `npm test` | Vitest: reducers, sagas, error mapping |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
