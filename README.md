# PosterBoy — Autonomous Design Director

A local-first autonomous design system powered by **Gemini 2.5 Flash**. Upload any image, describe your intent, and watch a 7-agent pipeline plan, compose, critique, and self-correct a production-ready poster layout — without touching a single CSS property.

---

## Architecture

```
Image → Vision Agent → Creative Director → Copywriter → Typography → Layout → [Critique Loop] → Canvas
```

| Agent | Role |
|-------|------|
| **Agent 1 – Vision** | Segments image into face / product / empty / logo-safe regions |
| **Agent 2 – Creative Director** | Generates 3 concepts (Luxury / Editorial / Commercial), scores and selects winner |
| **Agent 3 – Copywriter** | Writes headline (≤10 words), subheadline, CTA, and supporting copy |
| **Agent 4 – Typography** | Pairs display + body fonts, sets size/tracking/weight tokens |
| **Agent 5 – Layout** | Plans absolute coordinate positions (0–100%) using Design Memory patterns |
| **Agent 6 – Critic** | Screenshots the render, scores it (0–100), lists violations |
| **Agent 7 – Repair** | Adjusts coordinates based on critic feedback (max 3 loops) |

A **Python geometry helper** (`src/lib/python/geometry_helper.py`) handles exact bounding-box overlap math — face collisions, product occlusions, margin breaches — independently of TypeScript.

Design rules live in the **Design Constitution** (`design_rules.md`) and are version-controlled in SQLite. Edit them in the UI; every subsequent generation respects the new rules immediately.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| AI | `@google/genai` — Gemini 2.5 Flash |
| Database | SQLite via `better-sqlite3` |
| State | Zustand |
| Styling | Tailwind CSS v4 |
| Canvas Export | `html-to-image` |
| Geometry | Python 3 (`geometry_helper.py`) |

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Add your Gemini API key
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=your_key_here

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Key Design Decisions

- **Coordinates, not CSS** — Gemini generates JSON `{x, y, width, height}` percentages. The React canvas maps these to absolute positions. No hallucinated inline styles.
- **Self-correcting, not self-evolving** — Agents critique outputs and fix coordinates. Core code is never rewritten.
- **Design Memory** — Successful layouts (score ≥ 90) are stored in SQLite and fed back as few-shot examples to the Layout Agent.
- **Python delegation** — Geometry math (overlap, margins, IoU) runs in Python for precision. See `decision_log.md` for full rationale.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate/      # POST: run all 5 generation agents
│   │   ├── critique/      # POST: run critique + repair loop
│   │   ├── constitution/  # GET/POST: manage design rules
│   │   ├── fonts/         # GET/POST: font registry
│   │   └── layouts/       # GET/POST: layout memory + job history
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx           # Main dashboard
├── components/
│   ├── Canvas.tsx          # Drag/resize/edit canvas editor
│   ├── ControlPanel.tsx    # Upload, prompt, font, export sidebar
│   ├── CritiquePanel.tsx   # Score gauge + issue list
│   ├── Telemetry.tsx       # Live agent execution log
│   └── ConstitutionEditor.tsx
├── lib/
│   ├── agents/
│   │   ├── gemini.ts          # Shared Gemini client + callAgent()
│   │   ├── visionAgent.ts
│   │   ├── creativeDirectorAgent.ts
│   │   ├── copywriterAgent.ts
│   │   ├── typographyAgent.ts
│   │   ├── layoutAgent.ts
│   │   ├── criticAgent.ts
│   │   ├── repairAgent.ts
│   │   └── orchestrator.ts    # Pipeline controller
│   ├── python/
│   │   └── geometry_helper.py
│   ├── db.ts              # SQLite schema + seeding
│   ├── pythonRunner.ts    # Node → Python bridge
│   └── store.ts           # Zustand global state
└── types/
    └── agents.ts          # Shared TypeScript contracts
```
