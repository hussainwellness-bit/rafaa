# Current Design System Export
> Auto-generated from src/styles/, src/pages/, src/components/
> Last updated: 2026-05-02
> ⚠️ Corrected 2026-05-02 — aligned to Training Tracker reference system (hussainlift.netlify.app)

---

## CSS Variables

### Design System Variables (`src/styles/design-system.css`)

| Variable | Value | Role |
|---|---|---|
| `--bg` | `#080808` | Page background |
| `--card` | `#111111` | Card surface |
| `--border` | `#1e1e1e` | Primary border |
| `--border2` | `#2a2a2a` | Secondary border (inputs, hover targets) |
| `--lift` | `#181818` | Slightly lifted surface (check rows, cardio blocks) |
| `--lift2` | `#1e1e1e` | Input backgrounds, button surfaces |
| `--accent` | `#c8ff00` | Primary accent — lime yellow |
| `--accent-dim` | `rgba(200,255,0,0.08)` | Accent background wash |
| `--accent-dim2` | `rgba(200,255,0,0.15)` | Stronger accent wash (selected day) |
| `--red` | `#ff3d3d` | Error / delete |
| `--blue` | `#3d9fff` | Secondary accent — blue (cardio, water) |
| `--blue-dim` | `rgba(61,159,255,0.10)` | Blue background wash |
| `--green-pr` | `#00e676` | PR highlight — green |
| `--green-pr-dim` | `rgba(0,230,118,0.12)` | PR background wash |
| `--text` | `#f2f2f2` | Primary text |
| `--text2` | `#aaaaaa` | Secondary text |
| `--text3` | `#555555` | Muted text / labels |

### Tailwind Theme Variables (`src/index.css`)

| Variable | Value | ⚠️ Correction |
|---|---|---|
| `--color-bg` | `#080808` | ✓ correct |
| `--color-card` | `#111111` | ✓ correct |
| `--color-card2` | `#1e1e1e` | was `#1a1a1a` — must match `--lift2` |
| `--color-border` | `#1e1e1e` | was `#222222` — must match `--border` |
| `--color-accent` | `#c8ff00` | ✓ correct |
| `--color-red` | `#ff3d3d` | ✓ correct |
| `--color-blue` | `#3d9fff` | ✓ correct |
| `--color-purple` | `#c084fc` | was `#a855f7` — use Day 5 purple |
| `--color-text` | `#f2f2f2` | was `#ffffff` — pure white is wrong |
| `--color-muted` | `#aaaaaa` | was `#888888` — use `--text2` value |
| `--color-muted2` | `#555555` | ✓ correct |

> **Inconsistency**: Two parallel variable systems exist — CSS vars (`--bg`, `--card`) used in hero pages via `var()`, and Tailwind config vars (`--color-bg`, `--color-card`) used in coach/admin/component pages via Tailwind classes. They are not unified. Hero pages use CSS vars; coach/admin pages use hardcoded Tailwind hex values.

---

## Colors Used

### Backgrounds

| Hex | Usage |
|---|---|
| `#080808` | Page background, auth screen, button text on accent |
| `#0d0d0d` | Coach/admin sidebar, modals |
| `#111111` | Card background (all card surfaces) |
| `#1a1a1a` | Input fields, lighter card variant, table rows |
| `#181818` | `.lift` — check rows, cardio blocks |
| `#1e1e1e` | `.lift2` — input backgrounds, nav surfaces |

### Borders

| Hex | Usage |
|---|---|
| `#1e1e1e` | `--border` — primary card borders |
| `#2a2a2a` | `--border2` — input borders, secondary dividers |
| `#222222` | Tailwind `border-[#222]` — coach/admin cards |
| `#333333` | Tailwind `border-[#333]` — ghost buttons, input hover |

### Text

| Hex | Usage |
|---|---|
| `#f2f2f2` | Primary text (`--text`) |
| `#ffffff` | Pure white (Tailwind text-white in coach/admin) |
| `#aaaaaa` | Secondary text (`--text2`) |
| `#888888` | Muted text (coach/admin labels) |
| `#666666` | Disabled text |
| `#555555` | Muted labels (`--text3`), day numbers |
| `#444444` | Very muted (coach/admin sub-labels, rest dot) |
| `#333333` | Near-invisible (coach/admin tertiary) |

### Accent / Semantic Colors

| Hex | Usage |
|---|---|
| `#c8ff00` | Accent — active states, CTAs, today indicator, accent nav |
| `#ff3d3d` | Error, delete actions, sign out hover |
| `#3d9fff` | Blue — cardio, water tracker, blue badges |
| `#00e676` | Green — PR (personal record) row highlight |
| `#c084fc` | Purple — Day 5 volume split, purple badges (was `#a855f7` — corrected) |
| `#ff8c8c` | Protein macro color |
| `#6ab8ff` | Carbs macro color |
| `#ffb84d` | Fat macro color |

### rgba() Opacity Scales

**Accent (`#c8ff00`) — used at these opacities:**
`0.03` (last-ref bg) · `0.04` (filled input bg) · `0.05` (ghost card bg) · `0.07` (PR row bg) · `0.08` (accent-dim) · `0.10` (badge bg, nav active fallback) · `0.12` (split card border) · `0.15` (accent-dim2) · `0.20` (hist-set border) · `0.22` (logged card border) · `0.25` (notes focus border, filled input border) · `0.30` (checked row border) · `0.40` (input focus) · `0.60` (week strip selected border)

**Blue (`#3d9fff`) — used at:**
`0.04` (input fill) · `0.10` (blue-dim, badge bg) · `0.15` (hist item border) · `0.30` (input border) · `0.35` (cardio block border)

**Green PR (`#00e676`) — used at:**
`0.07` (PR row bg) · `0.12` (green-pr-dim) · `0.20` (hist set border) · `0.40` (input pr border)

**Red (`#ff3d3d`) — used at:**
`0.05` (sign-out hover bg) · `0.06` (delete button bg) · `0.10` (danger button bg) · `0.20` (danger button hover) · `0.25` (delete border) · `0.30` (error badge bg) · `0.40` (danger button border)

**Black overlays:** `rgba(0,0,0,0.60)` / `0.70` / `0.80` (modal backdrops)

---

## Typography

### Font Families

| Family | Where Used |
|---|---|
| `'Bebas Neue', sans-serif` | All page headings (h1), bundle names, stat numbers, section titles, set numbers, day numbers in WeekStrip |
| `'DM Mono', monospace` | All labels, sub-labels, pill buttons, input text, metadata, badge text, notes |
| `'Syne', sans-serif` | Body fallback (declared in `body` rule, rarely applied explicitly) |
| `serif` (system) | Arabic app name in HeroSettings |

### Font Sizes

| Size | Context |
|---|---|
| `8px` | Badge (sm), split-tag, split-chip, input-label header column, last-ref-label |
| `9px` | DM Mono section labels (uppercase tracked), day-btn, split-meta, hist-date |
| `10px` | DM Mono body labels, nav-btn, auth-label, auth-sub, auth-error hint |
| `11px` | DM Mono text (notes, hints, journal labels), week strip month label |
| `12px` | Button text (save-btn), history small text, auth-error |
| `13px` | Exercise name, section header text, badge (md), sidebar nav items |
| `14px` | Input text (auth-input), body text |
| `15px` | Button (md), input body text, sidebar nav |
| `17px` | Set number (`.set-num` Bebas) |
| `18px` | Bottom nav icon, ex-sets-badge, split-arrow, cardio/check icons |
| `20px` | WeekStrip day number, REST DAY label |
| `22px` | Split card name (`.split-name`), cal-detail-name |
| `24px` | History session name, cal-detail-name |
| `28px` | App logo (`.app-logo`), stat card values, calendar month |
| `32px` | Page h1 heading (Bebas) in coach/admin |
| `48px` | Page h1 heading (Bebas) in hero pages, water count |
| `52px` | Auth logo |

### Font Weights

| Weight | Usage |
|---|---|
| `400` (normal) | Default body, DM Mono text |
| `600` (semibold) | Section headers, exercise names, check-row-label |
| `700` (bold) | Button text, nav active, auth-btn, auth-tab active, big-check done, set-check done |
| `900` (extra bold) | set-check done, big-check done override |

### Letter Spacing

| Value | Usage |
|---|---|
| `1px` | Small labels |
| `1.5px` | Cardio type buttons, nav-btn |
| `2px` | DM Mono section labels, stat labels |
| `3px` | Auth sub, save-btn, page headings |
| `4px` | Page h1 hero titles |
| `5px` | Auth logo |

---

## Spacing & Layout

### Container / Page

| Rule | Value |
|---|---|
| `.wrap` max-width | `700px` |
| `.wrap` padding | `16px 16px 100px` |
| Hero page top padding | `24px` |
| Hero page bottom padding | `120px` (workout), `100px` (via .wrap) |
| Coach/admin content offset | `ml-[240px]` (sidebar width) |
| Sidebar width | `240px` fixed |

### Common Card Padding

| Component | Padding |
|---|---|
| `.ex-card-header` | `13px 16px` |
| `.log-body` | `12px 16px 16px` |
| `.checklist-body` | `14px 16px 18px` |
| `.check-row` | `13px 16px` |
| `.cardio-block` | `13px 16px` |
| `.cal-detail-header` | `16px 18px 14px` |
| `.auth-box` | `28px 24px` |
| Coach/admin Card component | `p-4` (16px) or `p-5` (20px) or `p-6` (24px) |
| Sidebar header | `px-6 py-6` |
| Sidebar nav | `p-4` |

### Gap Values

| Context | Gap |
|---|---|
| `.nav` (bottom nav items) | `5px` |
| `.sets-grid` rows | `8px` |
| `.set-labels` / `.set-row` columns | `6px` |
| Exercise cards list | `10px` |
| `.checklist-body` items | `12px` |
| Split card inner | `14px` |
| WeekStrip day cells | `gap-1` (4px) |
| Coach/admin grids | `gap-3` (12px) or `gap-4` (16px) |
| Stat grid | `10px` |

### Border Radius

| Value | Usage |
|---|---|
| `5px` | Chips, badges, hist-set |
| `6px` | Hist daily item |
| `7px` | Hist-delete |
| `8px` | WeekStrip nav btn, cal-cell, cal-close |
| `10px` | Set inputs, notes-input, day-btn |
| `12px` | Check rows, cardio blocks, auth-input, sidebar nav items, ghost button, set-check, ghost option buttons |
| `14px` | Bottom nav container, WeekStrip day cells |
| `16px` | Main cards (`.card`, `.split-card`, `.ex-card`, `.cal-detail`, auth-box), history card |
| `20px` | Modal containers, auth-box |
| `100px` | Pill buttons (`.cardio-type-btn`, `.save-btn`, badge, Button component default) |

---

## Components

### Button (`src/components/ui/Button.tsx`)

Base: `inline-flex items-center justify-center gap-2 rounded-[100px] font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`

| Variant | Classes |
|---|---|
| `accent` (default) | `bg-[#c8ff00] text-[#080808] font-bold hover:bg-[#d4ff33] active:scale-95` |
| `ghost` | `bg-transparent border border-[#2a2a2a] text-[#f2f2f2] hover:bg-[#1e1e1e] active:scale-95` | was `border-[#333] text-white hover:bg-[#1a1a1a]` |
| `danger` | `bg-[#ff3d3d]/10 border border-[#ff3d3d]/40 text-[#ff3d3d] hover:bg-[#ff3d3d]/20 active:scale-95` |
| `secondary` | `bg-[#1e1e1e] text-[#f2f2f2] hover:bg-[#2a2a2a] active:scale-95` | was `bg-[#1a1a1a] text-white hover:bg-[#222]` |

| Size | Classes |
|---|---|
| `sm` | `px-4 py-2 text-[13px]` |
| `md` (default) | `px-6 py-3 text-[15px]` |
| `lg` | `px-8 py-4 text-base` |

### Card (`src/components/ui/Card.tsx`)

`rounded-[16px] border border-[#1e1e1e] bg-[#111]`  
Glass variant: `bg-[#111]/80 backdrop-blur-sm`

> ⚠️ Was `border-[#222]` — corrected to `#1e1e1e` to match `--border`.

### Badge (`src/components/ui/Badge.tsx`)

Base: `inline-flex items-center gap-1 rounded-[5px] border font-[DM_Mono] font-medium uppercase`

| Variant | Classes |
|---|---|
| `muted` (default) | `bg-[#222] text-[#aaa] border-[#333]` | was `text-[#888]` — use `--text2` |
| `accent` | `bg-[#c8ff00]/10 text-[#c8ff00] border-[#c8ff00]/30` |
| `red` | `bg-[#ff3d3d]/10 text-[#ff3d3d] border-[#ff3d3d]/30` |
| `blue` | `bg-[#3d9fff]/10 text-[#3d9fff] border-[#3d9fff]/30` |
| `purple` | `bg-[#c084fc]/10 text-[#c084fc] border-[#c084fc]/30` | was `#a855f7` — corrected |
| `green` | `bg-[#00e676]/10 text-[#00e676] border-[#00e676]/30` | was `emerald-*` — use `--green-pr` |

| Size | Classes |
|---|---|
| `sm` (default) | `px-1.5 py-0.5 text-[8px] tracking-[1px]` |
| `md` | `px-2.5 py-1 text-[11px] tracking-[0.5px]` |

### Input (`src/components/ui/Input.tsx`)

`w-full px-4 py-3 bg-[#1e1e1e] border rounded-[12px] text-[#f2f2f2] text-[14px] placeholder:text-[#555] focus:outline-none transition-colors font-[DM_Mono]`  
Normal: `border-[#2a2a2a] focus:border-[#c8ff00]`  
Error: `border-[#ff3d3d] focus:border-[#ff3d3d]`

> ⚠️ Was: `rounded-[14px] px-5 py-4 bg-[#1a1a1a] border-[#333] text-white text-[15px] placeholder:text-[#444]`  
> Corrected to match `--lift2` bg, `--border2` border, `--text` color, `--text3` placeholder, and consistent radius/padding with auth-input pattern.

### Bottom Nav (`.nav` / `.nav-btn`)

```css
.nav { display: flex; gap: 5px; background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 5px; max-width: 700px; }
.nav-btn { flex: 1; padding: 10px 8px; border: none; border-radius: 10px; background: transparent; color: var(--text3); font-family: 'DM Mono'; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; flex-direction: column; align-items: center; gap: 2px; }
.nav-btn.active { background: var(--accent); color: #000; font-weight: 700; }
```

Container: `position: fixed; bottom: 0; left: 0; right: 0; background: rgba(8,8,8,0.97); backdrop-filter: blur(12px); border-top: 1px solid var(--border)`

### Sidebar (`src/components/layout/Sidebar.tsx`)

`fixed left-0 top-0 h-full w-[240px] bg-[#0d0d0d] border-r border-[#1e1e1e] flex flex-col z-40`

Header: `px-6 py-6 border-b border-[#1e1e1e]` — title: `font-[Bebas_Neue] text-3xl text-[#f2f2f2] tracking-widest`  
Nav link active: `bg-[#c8ff00]/10 text-[#c8ff00] font-semibold`  
Nav link default: `text-[#555] hover:text-[#f2f2f2] hover:bg-[#1e1e1e]`  
Sign out: `text-[#555] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/5`

> ⚠️ Was: `border-[#1a1a1a]`, `text-white` — corrected to `--border` and `--text`.

### Split Card (bundle card — `.split-card`)

```css
border-radius: 16px; border: 1px solid rgba(200,255,0,0.12); background: var(--card);
cursor: pointer; transition: transform 0.15s; overflow: hidden;
```

Inner: `display: flex; flex-direction: row; align-items: center; padding: 16px 18px; gap: 14px`  
Accent bar: `width: 4px; height: 48px; border-radius: 2px; flex-shrink: 0`  
Tag: DM Mono 8px, letter-spacing 2px, uppercase  
Name: Bebas Neue 22px, letter-spacing 2px  
Meta: DM Mono 9px, `var(--text3)`  
Arrow: 18px, `var(--text3)`, margin-left auto  
Chips row: `padding: 0 18px 14px 36px; display: flex; flex-wrap: wrap; gap: 4px`  
Chip: DM Mono 9px, `#333`, `var(--lift2)` bg, `var(--border2)` border, `border-radius: 5px; padding: 2px 8px`

### Exercise Card (`.ex-card`)

```css
background: var(--card); border: 1px solid var(--border); border-radius: 16px;
margin-bottom: 10px; overflow: hidden; transition: border-color 0.2s;
```

Logged state: `border-color: rgba(200,255,0,0.22)`  
Header: `display: flex; align-items: center; justify-content: space-between; padding: 13px 16px; gap: 10px`  
Exercise name: 13px, font-weight 700, `var(--text)`

### Set Input Grid

```css
.log-body { padding: 12px 16px 16px }
.set-labels / .set-row { display: grid; grid-template-columns: 28px 1fr 1fr 44px; gap: 6px }
.sets-grid { display: flex; flex-direction: column; gap: 8px }
```

Input default: `bg: var(--lift2); border: 1px solid var(--border2); border-radius: 10px; padding: 12px 10px; font-family: DM Mono; font-size: 15px`  
Filled: `border: rgba(200,255,0,0.25); color: var(--accent); bg: rgba(200,255,0,0.04)`  
PR: `border: rgba(0,230,118,0.4); color: #00e676; bg: rgba(0,230,118,0.12)`

Checkmark: `44×44px; border: 2px solid var(--border2); border-radius: 12px`  
Done: `background: var(--accent); border-color: var(--accent); color: #000; font-weight: 900`

PR row: `background: rgba(0,230,118,0.07); border: 1px solid rgba(0,230,118,0.2); padding: 2px 4px`  
PR set number: `::after` → `content: '👍'; font-size: 10px; position: absolute; top: -8px`

### Last Session Row (`.last-ref`)

```css
padding: 7px 16px 8px; background: rgba(200,255,0,0.03); border-bottom: 1px solid var(--border);
display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
```

Label: DM Mono 8px, `var(--text3)`, tracking 1.5px  
Badge (`.lset`): DM Mono 10px, `var(--accent)`, `var(--accent-dim)` bg, border-radius 5px, padding `2px 7px`

### Daily Checklist (`.daily-checklist`)

```css
background: var(--card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden;
```

Header: `padding: 12px 18px 10px; border-bottom: 1px solid var(--border)`  
Title: DM Mono 9px, `var(--text3)`, letter-spacing 3px, uppercase  
Body: `padding: 14px 16px 18px; display: flex; flex-direction: column; gap: 12px`

### Check Row (`.check-row`)

```css
display: flex; align-items: center; justify-content: space-between; gap: 12px;
padding: 13px 16px; background: var(--lift); border-radius: 12px; border: 2px solid var(--border2);
```

Checked: `border-color: rgba(200,255,0,0.3); background: rgba(200,255,0,0.03)`

Big check (`.big-check`): `48×48px; border: 2px solid var(--border2); border-radius: 14px`  
Done: `background: var(--accent); border-color: var(--accent); color: #000; font-weight: 900`

### Cardio Block (`.cardio-block`)

```css
background: var(--lift); border: 2px solid var(--border2); border-radius: 12px;
padding: 13px 16px; display: flex; flex-direction: column; gap: 10px;
```

Checked: `border-color: rgba(61,159,255,0.35); background: rgba(61,159,255,0.04)`

Type row: `display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none` ← **never wraps**

Type button (`.cardio-type-btn`): `flex-shrink: 0; padding: 7px 16px; border-radius: 100px; border: 1px solid var(--border2); DM Mono 10px; letter-spacing 1.5px; uppercase`  
Selected: `background: var(--blue-dim); border-color: var(--blue); color: var(--blue); font-weight: 700`

Duration input: `border-radius: 10px; padding: 10px 14px; DM Mono 13px`  
Filled: `border-color: rgba(61,159,255,0.3); color: var(--blue); bg: rgba(61,159,255,0.04)`

### Water Tracker

`.water-track`: `display: flex; align-items: center; gap: 16px`  
`.water-btn`: `44×44px; border-radius: 12px; border: 1px solid var(--border2); bg: var(--lift2); font-size: 22px`  
`.water-count`: Bebas Neue 48px, `var(--text)`  
`.water-bars`: `display: flex; gap: 4px; margin-top: 8px`  
`.water-bar`: `height: 4px; flex: 1; border-radius: 2px` — active: `var(--blue)`; inactive: `var(--lift2)`

### Calendar Grid

`.cal-month`: Bebas Neue 28px, letter-spacing 3px  
`.cal-nav-btn`: `36×36px; border-radius: 10px; bg: var(--card); border: 1px solid var(--border2); color: var(--text2)`  
`.cal-grid`: `display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px`  
`.cal-dow`: DM Mono 9px, `var(--text3)`, uppercase, `padding: 4px 0 8px`  
`.cal-cell`: `aspect-ratio: 1; border-radius: 8px; bg: var(--lift); border: 1px solid transparent`  
Today: `border-color: var(--accent)`  
Has session: `background: var(--lift2)`  
Selected: `border-color: var(--text2)`  
`.cal-day-num`: DM Mono 11px, `var(--text3)` — today: `var(--accent)`, font-weight 700  
`.cal-dot`: `6×6px; border-radius: 50%; margin-top: 3px`

### Cal Detail (day expand)

`.cal-detail`: `border-radius: 16px; border: 1px solid var(--border2); background: var(--card); margin-top: 12px; animation: fadeUp 0.2s ease`  
`.cal-detail-header`: `padding: 16px 18px 14px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between`  
`.cal-detail-date`: DM Mono 10px, `var(--text3)`, letter-spacing 2px  
`.cal-detail-name`: Bebas Neue 24px, letter-spacing 2px  
`.cal-close`: `32×32px; border-radius: 8px; bg: var(--lift2); color: var(--text2)`

### History Session Badges

`.hist-ex-name`: DM Mono 9px, `var(--text3)`, letter-spacing 2px, uppercase, `margin-bottom: 6px; margin-top: 12px`  
`.hist-sets`: `display: flex; flex-wrap: wrap; gap: 5px`  
`.hist-set`: DM Mono 11px, `var(--lift2)` bg, `var(--border2)` border, border-radius 7px, `padding: 5px 10px; color: var(--text2)`  
`.hist-set.done`: `border-color: rgba(200,255,0,0.2); color: var(--accent); background: var(--accent-dim)`

### Authentication (`.auth-*`)

`.auth-logo`: Bebas Neue 52px, letter-spacing 5px, centered — `em` accent: `var(--accent)`  
`.auth-sub`: DM Mono 10px, letter-spacing 3px, `var(--text3)`, uppercase, centered, `margin-bottom: 36px`  
`.auth-box`: `max-width: 380px; bg: var(--card); border: 1px solid var(--border2); border-radius: 20px; padding: 28px 24px`  
`.auth-tabs`: `display: flex; gap: 4px; bg: var(--lift); border-radius: 10px; padding: 4px; margin-bottom: 24px`  
`.auth-tab`: DM Mono 11px, letter-spacing 2px, uppercase — active: `bg: var(--accent); color: #000; font-weight: 700`  
`.auth-input`: `bg: var(--lift2); border: 1px solid var(--border2); border-radius: 12px; padding: 13px 16px; DM Mono 14px` — focus: `border-color: var(--accent)`  
`.auth-btn`: `bg: var(--accent); color: #000; border-radius: 12px; padding: 14px; DM Mono 12px; letter-spacing 3px; font-weight 700`  
`.auth-error`: DM Mono 11px, `var(--red)`, centered

### Save Button (`.save-btn`)

`display: flex; align-items: center; gap: 7px; padding: 11px 20px; background: var(--accent); color: #000; border: none; border-radius: 100px; DM Mono 10px; letter-spacing 2px; font-weight 700`

### Toast (`.toast`)

`position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(20px); background: var(--accent); color: #000; DM Mono 11px; letter-spacing 2px; font-weight 700; padding: 12px 24px; border-radius: 100px; opacity: 0; transition: all 0.3s cubic-bezier(.2,.8,.3,1); z-index: 9999`  
`.toast.show`: `opacity: 1; transform: translateX(-50%) translateY(0)`  
`.toast.error`: `background: var(--red); color: #fff`

### WeekStrip (`src/components/ui/WeekStrip.tsx`)

Nav buttons: `w-8 h-8 rounded-[8px] border border-[#2a2a2a] text-[#aaa] hover:text-white hover:border-[#555] disabled:opacity-25`  
Month label: `font-[DM_Mono] text-[11px] text-[#555] tracking-[2px]`  
Day cell: `flex flex-col items-center gap-0.5 py-2 rounded-[12px] border`  
Selected: `bg-[#c8ff00]/10 border-[#c8ff00]/60`  
Default: `border-[#1e1e1e] hover:border-[#2a2a2a]`  
Day letter: DM Mono 9px uppercase — selected: `text-[#c8ff00]`, today: `text-[#aaa]`, else: `text-[#555]`  
Day number: Bebas Neue 20px — selected: `text-[#c8ff00]`, today: `text-[#f2f2f2]`, else: `text-[#555]`

> ⚠️ Was: `border-[#333]`, `text-[#888]`, `text-white` for today — corrected to match `--border2`, `--text2`, `--text`.  
Dot: `w-1 h-1 rounded-full` — color-dot uses custom `style` prop

### Macros Banner

`.macros-banner`: `border-radius: 14px; border: 1px solid var(--border2); bg: var(--card); padding: 12px 16px`  
Phase label: DM Mono 8px, letter-spacing 3px, `var(--text3)`, uppercase  
Kcal: Bebas Neue 22px, `var(--accent)`, letter-spacing 2px  
Macro pills: `display: flex; gap: 8px` — each: `flex: 1; bg: var(--lift2); border-radius: 10px; padding: 8px 10px`  
Value: Bebas Neue 18px — protein: `#ff8c8c`, carbs: `#6ab8ff`, fat: `#ffb84d`

### Modal (`src/components/ui/Modal.tsx`)

Backdrop: `fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4`  
Container: `bg-[#111] border border-[#1e1e1e] rounded-[20px] w-full max-w-lg max-h-[90vh] overflow-y-auto`

> ⚠️ Was: `bg-[#0d0d0d] border-[#222]` — corrected to `--card` and `--border`.

### SlidePanel (`src/components/ui/SlidePanel.tsx`)

`fixed right-0 top-0 bottom-0 z-50 bg-[#111] border-l border-[#1e1e1e] flex flex-col shadow-2xl`  
Width: responsive (full on mobile, 480px on sm+)  
Backdrop: `fixed inset-0 z-40 bg-black/60 backdrop-blur-sm`

> ⚠️ Was: `bg-[#0d0d0d] border-[#222]` — corrected to `--card` and `--border`.

### StatCard (`src/components/ui/StatCard.tsx`)

Base: `rounded-[16px] border bg-[#111]`  
Accent variant: `bg-[#c8ff00]/5 border-[#c8ff00]/20`  
Normal: `border-[#1e1e1e]`

> ⚠️ Was: `border-[#222]` — corrected to `--border`.

---

## Tailwind Classes

### Layout

`flex` `flex-col` `flex-1` `flex-wrap` `flex-shrink-0`  
`items-center` `items-start` `items-end` `items-baseline`  
`justify-center` `justify-between` `justify-end`  
`grid` `grid-cols-2` `grid-cols-4` `grid-cols-7`  
`gap-1` `gap-1.5` `gap-2` `gap-3` `gap-4` `gap-6`  
`space-y-1` `space-y-2` `space-y-3` `space-y-4` `space-y-5` `space-y-6`  
`w-full` `h-full` `min-h-screen` `min-h-[100dvh]`  
`max-w-sm` `max-w-lg` `max-w-xl` `max-w-[380px]` `max-w-[480px]`  
`w-8` `h-8` `w-9` `h-9` `w-10` `h-10` `w-12` `h-12`  
`w-[240px]` `ml-[240px]`  
`overflow-hidden` `overflow-y-auto` `overflow-x-auto`  
`fixed` `absolute` `relative` `sticky`  
`inset-0` `top-0` `bottom-0` `right-0` `left-0`  
`z-40` `z-50` `z-[200]`

### Sizing / Spacing

`p-3` `p-4` `p-5` `p-6` `p-8` `p-10`  
`px-1.5` `px-2.5` `px-3` `px-4` `px-5` `px-6` `px-8`  
`py-0.5` `py-1` `py-2` `py-2.5` `py-3` `py-3.5` `py-4`  
`pt-4` `pt-5` `pt-6`  
`pb-10` `pb-24`  
`mt-0.5` `mt-1` `mt-1.5` `mt-2` `mt-3` `mt-6`  
`mb-1` `mb-2` `mb-3` `mb-4` `mb-6` `mb-8`  
`ml-auto` `ml-2`  
`shrink-0` `min-w-0`

### Typography

`font-[Bebas_Neue]` `font-[DM_Mono]`  
`text-[8px]` `text-[9px]` `text-[10px]` `text-[11px]` `text-[12px]` `text-[13px]` `text-[15px]`  
`text-sm` `text-base` `text-lg` `text-xl` `text-2xl` `text-3xl` `text-4xl` `text-5xl`  
`font-bold` `font-semibold` `font-medium`  
`tracking-[0.5px]` `tracking-[1px]` `tracking-[1.5px]` `tracking-[2px]`  
`tracking-wider` `tracking-widest`  
`uppercase` `capitalize`  
`leading-none` `leading-snug` `leading-relaxed`  
`truncate` `line-clamp-2`

### Colors (text)

`text-white` `text-[#c8ff00]` `text-[#ff3d3d]` `text-[#3d9fff]` `text-[#a855f7]`  
`text-[#080808]` `text-[#333]` `text-[#444]` `text-[#555]` `text-[#666]` `text-[#888]` `text-[#aaa]`  
`text-[#f59e0b]` `text-[#ff8c8c]`  
`text-emerald-400`  
`placeholder:text-[#333]` `placeholder:text-[#444]`

### Colors (background)

`bg-[#080808]` `bg-[#0d0d0d]` `bg-[#111]` `bg-[#111]/80` `bg-[#1a1a1a]`  
`bg-[#c8ff00]` `bg-[#c8ff00]/5` `bg-[#c8ff00]/10` `bg-[#c8ff00]/80`  
`bg-[#ff3d3d]/5` `bg-[#ff3d3d]/10` `bg-[#ff3d3d]/20`  
`bg-[#3d9fff]/10`  
`bg-[#a855f7]/10`  
`bg-black/60` `bg-black/70` `bg-black/80`  
`bg-transparent`  
`bg-emerald-500/10`

### Colors (border)

`border-[#222]` `border-[#333]` `border-[#444]` `border-[#1a1a1a]`  
`border-[#c8ff00]` `border-[#c8ff00]/20` `border-[#c8ff00]/30` `border-[#c8ff00]/40` `border-[#c8ff00]/60`  
`border-[#ff3d3d]/30` `border-[#ff3d3d]/40`  
`border-[#3d9fff]/30`  
`border-[#a855f7]/30`  
`border-emerald-500/30`  
`border-l` `border-r` `border-t` `border-b`

### Border Radius

`rounded-[5px]` `rounded-[6px]` `rounded-[7px]` `rounded-[8px]` `rounded-[10px]`  
`rounded-[12px]` `rounded-[14px]` `rounded-[16px]` `rounded-[20px]` `rounded-[100px]`  
`rounded-full`

### Effects / Transitions

`transition-all` `transition-colors` `transition-opacity`  
`duration-150` `duration-300`  
`backdrop-blur-sm`  
`shadow-2xl`  
`opacity-0` `opacity-100` `opacity-25` `opacity-40`  
`active:scale-95`  
`disabled:opacity-40` `disabled:cursor-not-allowed`  
`cursor-pointer` `cursor-not-allowed`

### Hover States

`hover:text-white` `hover:text-[#ff3d3d]` `hover:text-[#c8ff00]`  
`hover:bg-[#1a1a1a]` `hover:bg-[#222]` `hover:bg-[#ff3d3d]/5` `hover:bg-[#ff3d3d]/20` `hover:bg-[#c8ff00]/10`  
`hover:border-[#444]` `hover:border-[#555]` `hover:border-[#c8ff00]`

### Focus States

`focus:outline-none` `focus:border-[#c8ff00]` `focus:border-[#ff3d3d]`

### Display / Visibility

`block` `hidden` `inline-flex` `aspect-square` `aspect-ratio`  
`last:border-0`

---

## Inconsistencies Found

> ✅ = Fixed in this document | ⚠️ = Still requires code change

### 1. Dual Variable System
**Problem**: Hero pages use `var(--bg)`, `var(--card)` etc from `design-system.css`. Coach/admin pages use hardcoded Tailwind values like `bg-[#0d0d0d]`, `border-[#222]`.  
**Impact**: Same background values differ slightly — `--bg` is `#080808`, but coach sidebar uses `bg-[#0d0d0d]` and `bg-[#111]` vs `--card: #111111`. Near-identical but not unified.  
**Fix**: ⚠️ Unify into one set of CSS vars and reference them everywhere via Tailwind config.

### 2. Border Color Mismatch ✅
**Problem**: Hero cards use `var(--border)` = `#1e1e1e`. Coach/admin Card used `border-[#222]` = `#222222`. WeekStrip used `border-[#222]` and `border-[#333]`.  
**Fix applied**: All borders corrected to `#1e1e1e` (--border) or `#2a2a2a` (--border2) throughout this document.

### 3. Hardcoded Colors in Coach/Admin Pages
**Problem**: Coach and admin pages use raw hex values instead of CSS vars.  
**Fix**: ⚠️ Replace hardcoded values in all coach/admin/Sidebar/WeekStrip/Modal/SlidePanel files using corrected values from this document.

### 4. Card Component vs `.card` CSS Class
**Problem**: Two card implementations. Hero pages use `.card` CSS class. Coach/admin use `Card` React component with slightly different border.  
**Fix applied**: Card component border corrected to `#1e1e1e` in this document. ⚠️ Update Card.tsx in code.

### 5. Input Component vs `.set-input` / `.auth-input` ✅
**Problem**: Three separate input styles with different radius, padding, bg, border.  
**Fix applied**: Input component corrected to `rounded-[12px] px-4 py-3 bg-[#1e1e1e] border-[#2a2a2a] text-[#f2f2f2] placeholder-[#555]` to align with auth-input pattern. `.set-input` remains compact (pad `12px 10px`) for the log grid context.

### 6. Font Reference Inconsistencies
**Problem**: Fonts referenced three different ways across hero/admin/CSS.  
**Fix**: ⚠️ Standardize on `font-[Bebas_Neue]` and `font-[DM_Mono]` Tailwind classes everywhere, with CSS fallback in body.

### 7. Letter Spacing Inconsistency on Labels
**Problem**: DM Mono section labels use inconsistent tracking values.  
**Fix**: ⚠️ Use `tracking-[2px]` for standard labels, `tracking-[3px]` for section/checklist headers, `tracking-[1.5px]` for buttons.

### 8. Purple Color Defined Only in Tailwind ✅
**Problem**: `#a855f7` was in Tailwind config but wrong — not the purple used in the design.  
**Fix applied**: Corrected to `#c084fc` everywhere (matches Day 5 Volume split accent in tracker).

### 9. Orange / Macro Colors Not in Variables ✅
**Problem**: `#f59e0b` (orange) was listed as carbs color but is not used — `#6ab8ff` is the carbs color.  
**Fix applied**: Removed `#f59e0b`. Macro colors are: protein `#ff8c8c`, carbs `#6ab8ff`, fat `#ffb84d`. ⚠️ Add these as CSS variables: `--macro-protein`, `--macro-carbs`, `--macro-fat`.

### 10. Redundant `color-card2` Variable ✅
**Problem**: `--color-card2: #1a1a1a` differed from `--lift2: #1e1e1e`.  
**Fix applied**: Corrected `--color-card2` to `#1e1e1e` to match `--lift2`.

### 11. Missing `.card` Usage in Some Hero Pages
**Problem**: `HeroNutrition` and `HeroJournal` use inline style containers.  
**Fix**: ⚠️ Replace inline style containers with `.card` CSS class or `var(--card)` bg + `var(--border)` border.

### 12. `emerald-*` Tailwind Utility in Badge ✅
**Problem**: Green Badge used `emerald` scale (`#34d399`) instead of our `--green-pr` (`#00e676`).  
**Fix applied**: Green badge corrected to `bg-[#00e676]/10 text-[#00e676] border-[#00e676]/30`.
