# Spatial Resonator

**Course:** NMED 3203 – Interactive Media Applications  
**Premises Combined:** **Context** (Window Geometry & Room Illumination) × **Feedback** (Multi-Channel State Legibility & Threshold Withdrawal)  
**One-Sentence Description:** *Spatial Resonator* is a retro Win95/Winamp-inspired `8 × 8` (`A1–H8`) step sequencer in which the browser window and room light shape pitch, acoustic echo, and tempo while dynamically governing which visual feedback layers remain visible on screen.

> **Premise Coupling Formula:**  
> *"Through **Context**, the participant reshapes the instrument by resizing the browser window and changing the ambient light of the room, and through **Feedback**, this environmental state transforms both the acoustic response (pitch, echo, tempo) and which visual state signals remain visible versus hidden."*

- **Live Demo (GitHub Pages):** https://altindagsimal.github.io/premise-remix/
- **Design Rationale (350 words):** [RATIONALE.md](./RATIONALE.md)

---

## How to Use

1. **Place or remove notes (`A1–H8`):**
   - Click/tap any of the 64 pads (`rows A–H × columns 1–8`), or move the keyboard cursor with the **Arrow keys** and press **Space** / **Enter**.
   - Every pad from `A1` to `H8` has its own **unique musical frequency** (rows `H → A` set the octave register from low to high; columns `1 → 8` step up through an 8-note scale as the playhead sweeps across).
2. **Start or pause playback:** Click **▶ PLAY** or press **P**.
3. **Reshape the spatial context (Window / Room Size):**
   - Drag the edges of your browser window (or rotate your phone) to reshape the `A1–H8` grid. All 64 pads stay anchored in their coordinates so you never lose a square when resizing.
   - **Narrow / Small Window:** Pads compress, pitch shifts higher (`Pitch ×1.45 High / Narrow`), ripples tighten, and the room echo dries out (`Room Echo 3% (0.09s)`).
   - **Wide / Large Window:** Pads expand, pitch deepens (`Pitch ×0.72 Deep / Wide`), ripples widen, and a spacious hall echo opens (`Room Echo 42% (0.30s)`).
   - **Keyboard & Button Alternative:** Use the **↔ WINDOW / ROOM SIZE** buttons (`Narrower [N]`, `Wider [W]`, `Shorter [S]`, `Taller [T]`, `Full Size [R]`) when window resizing is unavailable.
4. **Shift the atmospheric context (Room Light):**
   - **Camera Sensor (Optional):** Click **◉ CAMERA SENSOR (`C`)** to sample average room brightness in real time. A `64 × 48` grayscale preview shows the exact luminance image the system measures; no video ever leaves your device.
   - **Slider & Keyboard Alternative:** Drag the **☀ ROOM LIGHT** fader or click **Darker (`D`)** / **Brighter (`B`)**.
5. **Observe the self-explanatory Feedback loop:**
   - **Context → Sound Rules Deck:** Every readout explicitly shows what context input is measured and what sound rule it changes (`☀ Room Light 75% → Tempo 116 BPM`, `↔ Width 920px → Pitch ×1.00`, `□ Room Size 100% → Room Echo 30%`).
   - **Context → Visual Feedback Layers:** The 4 layer indicators (`Grid Lines & Labels`, `Wave Ripples`, `Playhead Bar (▲)`, `Note Pads (A1–H8)`) explicitly state whether each layer is `VISIBLE` or `HIDDEN` and what Room Light percentage it requires (`≥55%`, `≥40%`, `≥25%`, `≥10%`).

---

## Sources & How Each Reading Governs a Design Rule

Every source listed in the bottom bar of the application is tied directly to a concrete rule in the code:

1. **Dey, A. K. (2001).** *Understanding and using context.* Personal and Ubiquitous Computing, 5(1), 4–7. [PDF ↗](https://sites.cc.gatech.edu/fce/ctk/pubs/PeTe5-1.pdf)
   - **Concept:** Context is measurable information characterizing the situation of a person, place, or object.
   - **Design Rule Controlled (`js/rules.js`):** `RULES.pitchMultiplier(gridW)` and `RULES.echoMix(gridW, gridH)` translate browser window pixel dimensions into pitch (`×1.45` to `×0.72`) and room echo (`3%` to `42%`), while `RULES.bpmFromLight(light)` translates room brightness into tempo (`68–132 BPM`) and note decay (`0.48s–0.18s`).
   - **Limitation:** Dey reduces context to fixed numerical sensor variables and does not account for how people interpret or renegotiate those measurements.

2. **Dourish, P. (2004).** *What we talk about when we talk about context.* Personal and Ubiquitous Computing, 8(1), 19–30. [PDF ↗](https://www.dourish.com/publications/2004/PUC2004-context.pdf)
   - **Concept:** Context is not a fixed set of passive sensor values (*representational view*), but an *interactional* process actively produced and negotiated by participants in action.
   - **Design Rule Controlled (`js/context.js` & `index.html`):** Instead of hiding the webcam reading as an objective truth, `CONTEXT.sampleCamera()` displays the live `64 × 48` grayscale luminance preview (`#cam-preview`) and pairs it with the **☀ ROOM LIGHT** slider (`Darker [D]` / `Brighter [B]`) and **↔ WINDOW / ROOM SIZE** buttons (`N/W/S/T/R`) so participants can inspect and override what the system senses.
   - **Limitation:** While Dourish critiques predefined thresholds, software still requires concrete numerical cutoffs (`CONFIG.camera.darkLuma = 0.08`, `brightLuma = 0.55`) to run.

3. **Hutchins, E. L., Hollan, J. D., & Norman, D. A. (1985).** *Direct manipulation interfaces.* Human–Computer Interaction, 1(4), 311–338. [PDF ↗](https://www.lri.fr/~mbl/ENS/FONDIHM/2013/papers/Hutchins-HCI-85.pdf)
   - **Concept:** Interfaces narrow the *Gulf of Evaluation* when visible signals clearly and distinctly reflect internal system states with minimal *semantic distance*.
   - **Design Rule Controlled (`CONFIG.signals` in `js/config.js` & `js/render.js`):** I gave each state a separate visual cue—3D colored pads with coordinate labels (`A1–H8`) for stored notes, `★` + expanding rings for currently sounding notes, `▲` (filled) vs. `△` (hollow) for playing vs. paused playhead, and `+`/`−`/`×` flashes for click acknowledgement.
   - **Limitation / How My Project Challenges This Reading:** Hutchins et al. assume maximum visual legibility is always ideal. My rule in `RULES.signalVisible(name, light)` deliberately challenges this assumption: as room light drops below `55%`, `40%`, `25%`, and `10%`, the system progressively hides `Grid Lines & Labels`, `Wave Ripples`, `Playhead Bar (▲)`, and `Note Pads (A1–H8)`, widening the visual Gulf of Evaluation on purpose so the user shifts from looking to listening.

4. **Seven, M. (2026).** *Interactive Media Applications lab.* (NMED 3203). [IMA Lab Bibliography ↗](https://mertseven.com/ima/lab/bibliography.html)
   - **Design Rule Controlled:** Combines the environmental threshold rule of **Collection 06 (*Letter Rain*)** with the 8-step clock and state-legibility experiments of **Collection 03 (*Mini Sequencer*)**.

---

## Project Files

| File | Purpose |
| :--- | :--- |
| [`index.html`](./index.html) | Win95/Winamp window layout, single-line instruction banner, self-explanatory Cause→Effect LED deck, 4 visual layer status pills, controls, and 4-column Sources & Design Rules footer. |
| [`style.css`](./style.css) | Retro 90s/Y2K beveled chrome, neon LED chips, high-contrast focus rings, and responsive layout. |
| [`js/config.js`](./js/config.js) | **Single source of truth for live code edits:** grid dimensions, pitch/echo bounds, light thresholds, signal cutoffs, and edit cooldown rules. |
| [`js/rules.js`](./js/rules.js) | Pure mapping functions translating context inputs (width, area, luminance, light) into system rules (pitch, echo, BPM, signal visibility). |
| [`js/context.js`](./js/context.js) | `STATE` store and `CONTEXT` sensor manager (window measurement, keyboard frame, and optional webcam luminance sampling). |
| [`js/audio.js`](./js/audio.js) | Web Audio synthesizer and low-pass filtered delay network (pitch and echo scale with window size; tempo and decay scale with room light). |
| [`js/sequencer.js`](./js/sequencer.js) | Persistent `8 × 8` (`A1–H8`) pattern matrix, step clock, and edit cooldown enforcement. |
| [`js/render.js`](./js/render.js) | HTML5 Canvas renderer drawing the `A–H × 1–8` grid, playhead (`▲`/`△`), 3D beveled pads, wave ripples, dark-room explanation banner, click flashes (`+`/`−`/`×`), and context badges. |
| [`js/main.js`](./js/main.js) | Event wiring (pointer, keyboard, buttons, camera) and live Cause→Effect LED updates. |
| [`RATIONALE.md`](./RATIONALE.md) | 360-word design rationale connecting design decisions to Dey (2001), Dourish (2004), and Hutchins et al. (1985). |

---

## Live Code Modification Quick Reference

All tunable constants are grouped at the top of [`js/config.js`](./js/config.js), and all input-to-output mappings are isolated in [`js/rules.js`](./js/rules.js):

- **Double the echo / delay time:** In `js/config.js` → `CONFIG.audio.echoMinSec` (`0.09 → 0.18`) and `CONFIG.audio.echoMaxSec` (`0.30 → 0.60`).
- **Rate-limit how often a participant can edit notes:** In `js/config.js` → `CONFIG.edits.cooldownMs` (`0 → 1000` for a 1-second cooldown; blocked clicks display `×` and announce the remaining wait time).
- **Remove a feedback signal in a mode:** In `js/config.js` → `CONFIG.signals` (set `playhead: 2` or `ripples: 2` to disable that channel completely, or `0` to keep it visible at all light levels).
- **Swap which input controls which output:** In `js/rules.js` → swap `pitchMultiplier(gridW)` and `bpmFromLight(light)` so window width controls tempo and room light controls pitch.

---

## AI Usage Statement

- **Tools Used & Purpose:** I used Claude and Gemini (in Google Antigravity) while building this project to organize my code into modular files (`config.js`, `rules.js`, `context.js`, `audio.js`, `sequencer.js`, `render.js`, `main.js`), adjust the Web Audio delay filter, and style the Win95/Winamp interface.
- **What I Rejected or Corrected from AI Output:**
  1. **Rejected Hiding Cells on Window Resize & Non-Sequential Labels:** An earlier AI-generated version hid outer rows and columns when the window shrank ("folded notes") and labeled rows from bottom to top with note names (`G3, B3, D4...`). When I tested it, I rejected this because clicking a square in a large window and then shrinking the window made that square disappear or move. I changed it to a fixed `8 × 8` alphabetical grid (`A–H` top-to-bottom × `1–8` left-to-right) so no square ever disappears when resizing.
  2. **Corrected Identical Row Frequencies & Cryptic Labels:** In the initial draft, every cell in the same row (`A1–A8`) played the exact same note, and short labels like `GRID ≥55%` did not explain what they measured. I changed the sound rule in `js/rules.js` (`midiForCell`) so all 64 pads (`A1–H8`) play different notes across columns `1–8`, and I rewrote the LED indicators so each one explicitly states its input-to-output rule (`☀ Room Light 75% → Tempo 116 BPM`, `✓ Grid Lines & Labels · VISIBLE (Light ≥55%)`).
  3. **Fixed the Echo Mix & Filter:** The first AI delay setup used a 100% wet signal that made the melody muddy; I fixed this by adding a `1800 Hz` low-pass filter and scaling `echoMix` from `3%` (small window) to `42%` (large window).
