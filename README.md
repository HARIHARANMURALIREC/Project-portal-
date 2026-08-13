# Project Allotment Portal — Workflow Diagrams

How **Student**, **Supervisor**, **Reviewer**, and **Coordinator** work — and where they meet — shown as simple box diagrams (same style as a login → dashboard → actions flow).

---

## Complete project flow (all four pillars)

```mermaid
flowchart TB
  START([Project Allotment Portal])

  START --> C_LOGIN[Coordinator Login]
  C_LOGIN --> C_DASH[Coordinator Dashboard]
  C_DASH --> C_OPEN[Open / close portal]
  C_DASH --> C_TEMP[Upload templates]
  C_DASH --> C_SCHED[Schedule reviews 0th–3rd]

  C_OPEN --> S_LOGIN[Student Login]
  C_TEMP --> S_LOGIN
  S_LOGIN --> S_DASH[Student Dashboard]
  S_DASH --> S_SELECT[Select project title]
  S_DASH --> S_UPLOAD[Upload review PDF]
  S_DASH --> S_SDG[Submit SDG]
  S_DASH --> S_PUB[Submit Publications]
  S_DASH --> S_DL[Download templates]

  S_SELECT --> U_LOGIN[Supervisor Login]
  U_LOGIN --> U_DASH[Supervisor Dashboard]
  U_DASH --> U_VIEW[View allotted teams]
  U_DASH --> U_ATT[Mark attendance]
  U_DASH --> U_INST[Post instructions]
  U_DASH --> U_MARK[Enter supervisor marks]
  U_DASH --> U_INT[Enter internal reviewer marks]

  C_SCHED --> R_LOGIN[Reviewer Login]
  R_LOGIN --> R_DASH[Reviewer Dashboard]
  R_DASH --> R_TEAMS[View section / allotted teams]
  R_DASH --> R_MARK[Enter reviewer marks]
  R_DASH --> R_REM[Add reviewer remarks]

  U_MARK --> C_MARKS[Coordinator · Student Marks]
  U_INT --> C_MARKS
  R_MARK --> C_MARKS
  S_UPLOAD --> C_MARKS
  S_SDG --> C_MARKS
  S_PUB --> C_MARKS

  C_MARKS --> C_SUP[Supervisor marks column]
  C_MARKS --> C_INT[Internal reviewer marks]
  C_MARKS --> C_EXT[External reviewer marks]
```

---

## 1. Student pillar

```mermaid
flowchart LR
  A[Student Login] --> B[Student Dashboard]
  B --> C1[Select project]
  B --> C2[Upload review PDF]
  B --> C3[Download templates]
  B --> C4[Submit SDG]
  B --> C5[Submit Publications]
  B --> C6[View remarks]
```

**Vertical version**

```mermaid
flowchart TB
  A[Student Login<br/>Team ID + Reg. No.] --> B[Student Dashboard]
  B --> C[Available Topics]
  C --> D[Select / claim project]
  D --> E[My Project locked]
  E --> F[Reviews page]
  F --> G[Upload PDF for scheduled review]
  G --> H[SDG + Publications]
  H --> I[Done · visible to Supervisor,<br/>Reviewer & Coordinator]
```

---

## 2. Supervisor pillar

```mermaid
flowchart LR
  A[Supervisor Login] --> B[Supervisor Dashboard]
  B --> C1[View allotted teams]
  B --> C2[See teams without projects]
  B --> C3[Mark attendance]
  B --> C4[Post instructions]
  B --> C5[Enter supervisor marks]
  B --> C6[Internal reviewer marks]
  B --> C7[View SDG / Publications]
  B --> C8[Export to Excel]
```

**Vertical version**

```mermaid
flowchart TB
  A[Supervisor Login<br/>Faculty email] --> B[Supervisor Dashboard]
  B --> C[View supervised teams]
  C --> D[Guide students · attendance · instructions]
  D --> E[Reviews]
  E --> F[Download student PDF]
  F --> G[Enter supervisor marks]
  G --> H{Also team reviewer?}
  H -->|Yes| I[Enter INTERNAL reviewer marks]
  H -->|No| J[View SDG & Publications]
  I --> J
```

---

## 3. Reviewer pillar

```mermaid
flowchart LR
  A[Reviewer Login] --> B[Reviewer Dashboard]
  B --> C1[View allotted / section teams]
  B --> C2[Select 0th / 1st / 2nd / 3rd]
  B --> C3[Enter marks]
  B --> C4[Add remarks]
  B --> C5[View uploads / SDG / Publications]
  B --> C6[Export to Excel]
```

**Vertical version**

```mermaid
flowchart TB
  A[Reviewer Login] --> B{Who is logging in?}
  B -->|Faculty reviewer| C[Internal reviewer path]
  B -->|reviewer1 / reviewer2| D[External reviewer path]
  C --> E[Reviewer / Teacher Marks page]
  D --> E
  E --> F[Choose review: 0th / 1st / 2nd / 3rd]
  F --> G[Enter marks + remarks]
  G --> H[Marks appear on Coordinator page]
  H --> I[INTERNAL column if faculty]
  H --> J[EXTERNAL column if section login]
```

---

## 4. Coordinator pillar

```mermaid
flowchart LR
  A[Coordinator Login] --> B[Coordinator Dashboard]
  B --> C1[View all allocations]
  B --> C2[See teams without projects]
  B --> C3[Schedule reviews]
  B --> C4[Upload templates]
  B --> C5[View all marks]
  B --> C6[View uploads / SDG / Publications]
  B --> C7[Export to Excel]
```

**Vertical version**

```mermaid
flowchart TB
  A[Coordinator Login] --> B[Coordinator Dashboard]
  B --> C[Open portal + upload templates]
  C --> D[Students can select projects]
  D --> E[Schedule common reviews]
  E --> F[Students upload · Faculty mark]
  F --> G[Student Marks page]
  G --> H[Supervisor marks]
  G --> I[Internal reviewer marks]
  G --> J[External reviewer marks]
  F --> K[Uploads · SDG · Publications overview]
```

---

## Where the four pillars meet (interconnection)

```mermaid
flowchart TB
  subgraph STUDENT
    S1[Select project]
    S2[Upload review PDF]
    S3[SDG & Publications]
  end

  subgraph SUPERVISOR
    U1[Guide + attendance]
    U2[Supervisor marks]
    U3[Internal reviewer marks]
  end

  subgraph REVIEWER
    R1[Visit teams]
    R2[External / Internal marks]
    R3[Remarks]
  end

  subgraph COORDINATOR
    C1[Templates + schedule]
    C2[See all marks]
    C3[See all uploads]
  end

  C1 --> S1
  C1 --> S2
  S1 --> U1
  S1 --> C2
  S2 --> U2
  S2 --> R1
  S2 --> C3
  U2 --> C2
  U3 --> C2
  R2 --> C2
  R3 --> S2
  S3 --> U1
  S3 --> R1
  S3 --> C2
```

---

## Marks meeting point (Coordinator view)

```mermaid
flowchart LR
  A[Supervisor enters marks] --> D[Coordinator Student Marks]
  B[Faculty reviewer enters<br/>INTERNAL marks] --> D
  C[Section reviewer login enters<br/>EXTERNAL marks] --> D
  D --> E[Supervisor column]
  D --> F[Internal reviewer column]
  D --> G[External reviewer column]
```

**Mark fields**

| Review | Fields | Max |
|--------|--------|-----|
| **0th** | Novelty · Abstract · SDG | 25 |
| **1st / 2nd / 3rd** | Feasibility · Proposed Methodology · Background · Literature Survey · Reference Paper | 50 (10 each) |

---

## One story top to bottom

```mermaid
flowchart TB
  A[1. Coordinator opens portal<br/>and uploads templates] --> B[2. Student selects a project]
  B --> C[3. Supervisor guides the team]
  C --> D[4. Coordinator schedules reviews]
  D --> E[5. Student uploads review PDF]
  E --> F[6. Supervisor + Reviewer enter marks]
  F --> G[7. Student submits SDG & Publications]
  G --> H[8. Coordinator reviews everything<br/>and exports reports]
```

---

## Login cheatsheet

| Pillar | Login tab | Example |
|--------|-----------|---------|
| Student | Student | Team ID `27A01` + Reg. No. |
| Supervisor | Supervisor | Faculty email |
| Reviewer | Reviewer | `reviewer1@gmail.com` (A&B) · `reviewer2@gmail.com` (C&D) |
| Coordinator | Coordinator | Coordinator email |

---

## Tech & run locally

| Layer | Stack |
|-------|--------|
| Frontend | React + Vite + TypeScript + Tailwind |
| Backend | Supabase |
| Hosting | Vercel |

```bash
npm install
cp .env.example .env
npm run dev
```

Live: [https://project-portal-rouge.vercel.app](https://project-portal-rouge.vercel.app)

---

## License

MIT
