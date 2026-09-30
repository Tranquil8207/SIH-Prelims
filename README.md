# SIH Prelims visuals

Flowcharts and figures that the presentation links to. This app deploys on Vercel. Each visual is its own route.

## Get it running

You need [Node.js](https://nodejs.org/) 20.9 or newer, which includes npm. From a terminal:

```bash
node -v
npm -v
```

Then, in this folder:

1. Install dependencies. This only needs to be done again when `package.json` changes.

```bash
npm install
```

2. Start the dev server and leave that terminal open.

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000). The home page should show a sample equation. Edits refresh on their own. Stop the server with Ctrl+C.

To preview the production build the way Vercel will serve it:

```bash
npm run build
npm run start
```

That also serves [http://localhost:3000](http://localhost:3000). Stop it with Ctrl+C before running `npm run dev` again, since both use the same port.

## Math

Equations use [KaTeX](https://katex.org/) (LaTeX). Render them with `Equation` from `src/components/equation.tsx`.

```tsx
<Equation tex="E = mc^2" />
<Equation display tex="\int_a^b f(x)\,dx" />
```

Shared symbols live in `mathMacros` in that file. `\R`, `\N`, `\Z`, `\Q`, and `\C` are already defined. Add new ones there so every visual uses the same notation.

## Figures

- [Physics model](http://localhost:3000/visuals/physics) — how the engine model is built and how one step predicts the next state.
- [Systems architecture](http://localhost:3000/visuals/architecture) — residual, anomaly checks, and the update back into the model.

After deploy, link a slide to `https://<your-domain>/visuals/physics` or `https://<your-domain>/visuals/architecture`.

## Add a visual

Create `src/app/visuals/<name>/page.tsx`. After deploy, link the slide to `https://<your-domain>/visuals/<name>`.

## Scripts

- `npm run dev` — local preview
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint
