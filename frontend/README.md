# Welcome to LocalWorks

## Project info

LocalWorks is a web-based marketplace designed to connect local barangay workers (such as carpenters, electricians, plumbers, and other skilled laborers) with business owners and individuals seeking services.
The platform allows workers to create profiles, showcase portfolios, receive ratings, and get matched with relevant job opportunities—supporting local economic growth, decent work, and poverty reduction.

This project is developed as an academic and community-focused system aligned with Sustainable Development Goals (SDGs), particularly Decent Work and Economic Growth (SDG 8).

---

## Setup & Development

### Prerequisites

1. **Node.js** (version 18+ recommended) and npm or yarn.
2. **Git** to clone repository.
3. An API backend running separately (see backend README) listening on `http://localhost:8920` by default.

### Installation

```bash
# clone the repo
git clone <your-repo-url> LocalWorks
cd LocalWorks

# install JavaScript dependencies
npm install
# or yarn
```

### Running the App

To start the local development server with hot reload:

```bash
npm run dev
# or yarn dev
```

Then open your browser to `http://localhost:5173` (or the port shown by Vite).

To build for production:

```bash
npm run build
npm run preview  # serve the built output for a quick test
```

### Scripts

| Command | Description |
|---------|-------------|
| `dev` | Start Vite dev server (local UI only) |
| `build` | Build production bundle to `dist/` |
| `preview` | Preview production build locally |
| `lint` | Run ESLint over source code |
| `test` | Run Vitest unit tests |

> You can optionally add a `start` script pointing to `vite` if you prefer `npm start`.

### Dependencies

- React 18, React Router v6
- Tailwind CSS + radix-ui/antd for UI
- @tanstack/react-query for data fetching
- axios for HTTP requests
- recharts for charts
- zustand for state management
- ant-design icons

(see `package.json` for full list)

---

## System flow overview

1. **Entry point** (`src/main.tsx`): renders `<App />`.
2. **Routing** (`src/App.tsx`): sets up React Router routes for public pages and dashboards.
3. **Authentication**: users navigate to `/login` or `/signup`; credentials are sent to backend.
4. **Worker/Employer dashboards**: once authenticated, the navbar displays conditional options and components fetch data using `react-query` from backend APIs.
5. **Admin area**: accessible via `/admin` login, leads to `/admin-dashboard` or `/admin/posted-jobs` etc. Includes sidebar (`Navbar.tsx`) and top bar (`TopNav.tsx`) shared across admin pages.
6. **Data stores & utilities**: shared logic in `src/lib` (e.g. `jobsStore.ts`, `reviewsStore.ts`, `utils.ts`).
7. **UI components**: highly composable pieces under `src/components` (worker/employer/admin sections plus common `ui/` primitives generated from shadcn/tailwind).
8. **Styling**: Tailwind CSS classes applied throughout; responsive breakpoints ensure mobile support.
9. **Testing**: basic example tests under `src/test/` using Vitest and React Testing Library.

To add a new page, create a component in `src/pages`, add a `<Route>` in `App.tsx`, and link via navigation.

---

Feel free to expand this README with backend instructions, API routes, or deployment notes as needed.