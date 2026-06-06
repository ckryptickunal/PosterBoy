# Architectural Decision Log: PosterBoy

This document records key architectural decisions made during the design and development of PosterBoy, an autonomous, self-correcting design director system.

---

## 1. Local-First Monolithic Architecture (Next.js + TypeScript + SQLite)
- **Decision**: Build the application as a single Next.js project containing both the React frontend and local API routes, storing persistent state in a local SQLite file (`db.sqlite`) via `better-sqlite3`.
- **Rationale**:
  - **Zero Deployment Overhead**: Avoids complex setup (Docker, external PostgreSQL) and runs entirely offline/locally with standard npm commands.
  - **Performance**: Local SQLite queries are synchronous and instantaneous, ideal for querying layout memories and saving job histories.
  - **Ease of Maintenance**: A single monorepo avoids sync issues between a separate frontend and backend.

---

## 2. Client-Side Screenshot Critique Loop (html-to-image)
- **Decision**: Generate design screenshots client-side via the `html-to-image` package and POST the Base64 images to the local backend critique endpoint.
- **Rationale**:
  - **Font & Asset Rendering**: Client-side rendering natively resolves web fonts and dynamically uploaded fonts via standard CSS `@font-face`. A server-side solution (like headless Puppeteer) would require mounting assets, syncing font caches, and complex environment configuration.
  - **Resource Optimization**: Avoids the CPU and memory footprint of spawning headless Chrome instances locally on a laptop.

---

## 3. Absolute Position Token-Based Rendering (Deterministic JSON Layouts)
- **Decision**: Enforce a strict separation between Layout Generation (JSON coordinates) and Layout Rendering (React + CSS/Tailwind). Gemini is strictly prohibited from writing HTML, inline CSS style strings, or class lists.
- **Rationale**:
  - **Reliability**: Generative models frequently produce malformed, unclosed HTML or non-deterministic Tailwind styles that break page structures.
  - **Figma-like Coordinate Mapping**: Storing coordinates (`x`, `y`, `width`, `height`, `rotation`, `zIndex`) enables a native React canvas experience where elements are draggable, resizable, and editable.

---

## 4. Python Delegation (Hybrid Architecture)
- **Decision**: Integrate standalone Python utility scripts for heavy visual, image, and geometrical calculations (e.g. detailed pixel density, overlap math, color contrast scoring) and invoke them from Next.js server-side.
- **Rationale**:
  - **Right Tool for the Job**: Python has a mature ecosystem for scientific computing, image processing (Pillow, OpenCV), and mathematical geometry. Implementing these complex routines in TypeScript would be slow and bug-prone.
  - **Isolated Utilities**: TypeScript handles the web routing, file writing, and orchestrating, while Python behaves as a stateless mathematical worker.

---

## 5. Design Constitution Guardrails
- **Decision**: Maintain a versioned, editable, and local Design Constitution (`design_rules.md`) that is loaded into the prompt context for all layout generation, critique, and repair agents.
- **Rationale**:
  - **Steering and Correcting**: Ensures consistent aesthetic guardrails (e.g. keeping 8% margins, never covering faces/products) without hardcoding values in code, making it easy to tune design styles over time.

---

## 6. Layout Memory Engine
- **Decision**: Store high-scoring layout arrays (score >= 90) by image category, goal, and visual style in the SQLite database, retrieving matching layout patterns to serve as few-shot prompts for the Layout Agent.
- **Rationale**:
  - **Self-Improving System**: Over time, PosterBoy builds a repository of verified layouts. Rather than generating positions from scratch, it retrieves and adapts past successes, resulting in compounding layout quality improvements.
