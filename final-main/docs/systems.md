# ⚙️ Aptivo Core Systems & Engine Specifications

This document outlines the operational mechanisms and workflows powering Aptivo.

---

## 1. Real-Time Practice Engine (`/practice/session/...`)

The practice engine provides targeted, distraction-free MCQ problem solving:
- **Subtopic Precision:** Launches a 20-question session targeting a single granular chapter.
- **Synchronized Timer:** Real-time second counter measuring time spent per question.
- **Instant Validation:** Option turns emerald green on correct answers or red on mistakes with the correct option highlighted.
- **Instant LaTeX Solution:** Step-by-step derivation rendered via `MarkdownRenderer` with KaTeX.
- **XP Multiplier & Streak Animation:** Consecutive correct answers award `+20 XP` with floating `@keyframes xpFloat` badges.
- **Question Reporting Dialog:** Flags ambiguous questions directly to the Super Admin triage queue.

---

## 2. Past-Paper Mock Exam Engine (`/university/.../exam/...`)

Simulates real entrance exams with rigorous constraints:
- **Timed Section Blueprints:** Automatically allocates questions according to official university patterns (e.g. NUST NET: 80 Math, 60 Physics, 30 Chem, 20 English, 10 Intelligence).
- **Negative Marking Simulator:** Deducts fractional points for incorrect guesses according to university policy.
- **Section Navigator Palette:** Full question index (1 to 200) indicating answered, unanswered, and marked-for-review items.
- **Post-Exam Scorecard:** Instant percentile projection, speed-per-question analysis, and remedial topic recommendations.

---

## 3. Gamified League System (`/leaderboard`)

- **6 Competitive Tiers:** Bronze, Silver, Gold, Platinum, Diamond, Master.
- **Weekly Reset Cycles:** Cycles conclude every Sunday midnight with automated promotion/relegation processing (`/api/mongo/leagues/process-reset`).
- **Promotion Zone (Top 10):** Advances to the next higher division.
- **Relegation Zone (Bottom 10):** Drops to the lower division to maintain active engagement.

---

## 4. Hierarchy Forge (`components/admin/HierarchyManager.tsx`)

- Drag-and-drop curriculum management powered by `@dnd-kit/core`.
- Visual tree nesting: Subjects (Level 1) → Topics (Level 2) → Subtopics (Level 3) → Lessons.
- Reorder nodes with drag handles (`GripVertical`), add child nodes inline, and perform safe deletions.

---

## 5. Automated Exam Paper Generator (`components/admin/PaperGenerator.tsx`)

- Selects balanced question samples from the database according to difficulty weighting (Easy, Medium, Hard).
- Generates downloadable printable PDFs using `jspdf` & `jspdf-autotable`.
- Exports spreadsheets formatted for Excel via `xlsx`.

---

## 6. Institution Task Assignment Studio (`/institution-admin/assignments`)

- Allows academy faculty to create homework assignments targeting specific subtopics.
- Sets submission deadlines and maximum question counts.
- Generates live task reports tracking student submission velocity, individual accuracy, and common error topics.
