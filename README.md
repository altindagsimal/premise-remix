# Spatial Resonator

**Course:** NMED 3203 – Interactive Media Applications  
**Premises Combined:** **Context** (Window Geometry & Room Illumination) × **Feedback** (Multi-Channel State Legibility & Threshold Withdrawal)  
**One-Sentence Description:** *Spatial Resonator* is a retro Win95/Winamp-inspired `8 × 8` (`A1–H8`) step sequencer in which the browser window and room light shape pitch, acoustic echo, and tempo while dynamically governing which visual feedback signals remain visible on screen.

> **Premise Coupling Formula:**  
> *"Through **Context**, the participant reshapes the instrument by resizing the browser window and changing the ambient light of the room, and through **Feedback**, this environmental state transforms both the acoustic response (pitch, echo, tempo) and which visual state signals remain visible versus hidden."*

- **Live Demo (GitHub Pages):** https://altindagsimal.github.io/premise-remix/
- **Design Rationale (350 words):** [RATIONALE.md](./RATIONALE.md)

---

## How to Use

1. **Place or remove notes (`A1–H8`):**
   - Click/tap any of the 64 pads (` rows A–H × columns 1–8`), or move the keyboard cursor with the **Arrow keys** and press **Space** / **Enter**.
   - Every pad from `A1` to `H8` has its own **unique musical frequency** (rows `H → A` set the octave register from low to high; columns `1 → 8` step up through an 8-note scale as the playhead sweeps across).
2. **Start or pause playback:** Click **▶ PLAY** or press **P**.
3. **Reshape the spatial context (Window / Room Size):**
   - Drag the edges of your browser window (or rotate your phone) to reshape the `A1–H8` grid. All 64 pads stay anchored in their coordinates so you never lose a square when resizing.
   - **Narrow / Small Window:** Pads compress, pitch shifts higher (`PITCH ×1.45 HIGH/TİZ`), ripples tighten, and the room echo dries out (`ECHO 3% · 0.09s`).
   - **Wide / Large Window:** Pads expand, pitch deepens (`PITCH ×0.72 DEEP/BAS`), ripples widen, and a spacious hall echo opens (`ECHO 42% · 0.30s`).
   - **Keyboard & Button Alternative:** Use the **ROOM SIZE** buttons (`⇥⇤ N`, `⇤⇥ W`, `⤓⤒ S`, `⤒⤓ T`, `FULL R`) when window resizing is unavailable.
4. **Shift the atmospheric context (Room Light):**
   - **Camera Sensor (Optional):** Click **◉ CAM (`C`)** to sample average room brightness in real time. A `64 × 48` grayscale preview shows the exact luminance image the system measures; no video ever leaves your device.
   - **Slider & Keyboard Alternative:** Drag the **☀ LIGHT** fader or press **D** (Darker) and **B** (Brighter).
5. **Observe the Feedback loop:**
   - Watch the Winamp-style **LED deck** and the 4 **Signal LEDs** (`✓ GRID ≥55%`, `✓ WAVE ≥40%`, `✓ HEAD ≥25%`, `✓ PADS ≥10%`).
   - As room light drops below `55%`, `40%`, `25%`, and `10%`, visual signals (**grid lines**, **wave ripples**, **playhead ▲**, and **note pads**) progressively turn off, leaving sound, click flashes (`+`/`−`), and the LED status readout.

---

## Project Files

| File | Purpose |
| :--- | :--- |
| [`index.html`](./index.html) | Win95/Winamp window layout, single-line instruction banner, LED readout deck, 4 signal LEDs, and accessible controls. |
| [`style.css`](./style.css) | Retro 90s/Y2K beveled chrome, neon LED chips, high-contrast focus rings, and responsive layout. |
| [`js/config.js`](./js/config.js) | **Single source of truth for live code edits:** grid dimensions, pitch/echo bounds, light thresholds, signal cutoffs, and edit cooldown rules. |
| [`js/rules.js`](./js/rules.js) | Pure mapping functions translating context inputs (width, area, luminance, light) into system rules (pitch, echo, BPM, signal visibility). |
| [`js/context.js`](./js/context.js) | `STATE` store and `CONTEXT` sensor manager (window measurement, keyboard frame, and optional webcam luminance sampling). |
| [`js/audio.js`](./js/audio.js) | Web Audio synthesizer and low-pass filtered delay network (pitch and echo scale with window size; tempo and decay scale with room light). |
| [`js/sequencer.js`](./js/sequencer.js) | Persistent `8 × 8` (`A1–H8`) pattern matrix, step clock, and edit cooldown enforcement. |
| [`js/render.js`](./js/render.js) | HTML5 Canvas renderer drawing the `A–H × 1–8` grid, playhead (`▲`/`△`), 3D beveled pads, wave ripples, click flashes (`+`/`−`/`×`), and context badges. |
| [`js/main.js`](./js/main.js) | Event wiring (pointer, keyboard, buttons, camera) and live LED state updates. |
| [`RATIONALE.md`](./RATIONALE.md) | 350-word design rationale connecting design decisions to Dey (2001), Dourish (2004), and Hutchins et al. (1985). |

---

## Live Code Modification Quick Reference

All tunable constants are grouped at the top of [`js/config.js`](./js/config.js), and all input-to-output mappings are isolated in [`js/rules.js`](./js/rules.js):

- **Double the echo / delay time:** In `js/config.js` → `CONFIG.audio.echoMinSec` (`0.09 → 0.18`) and `CONFIG.audio.echoMaxSec` (`0.30 → 0.60`).
- **Rate-limit how often a participant can edit notes:** In `js/config.js` → `CONFIG.edits.cooldownMs` (`0 → 1000` for a 1-second cooldown; blocked clicks display `×` and announce the remaining wait time).
- **Remove a feedback signal in a mode:** In `js/config.js` → `CONFIG.signals` (set `playhead: 2` or `ripples: 2` to disable that channel completely, or `0` to keep it visible at all light levels).
- **Swap which input controls which output:** In `js/rules.js` → swap `pitchMultiplier(gridW)` and `bpmFromLight(light)` so window width controls tempo and room light controls pitch.

---

## AI Usage Statement

- **Tools Used & Purpose:** Claude and Gemini (via Google Antigravity) were used during development to refactor the prototype into a modular architecture (`config.js`, `rules.js`, `context.js`, `audio.js`, `sequencer.js`, `render.js`, `main.js`), tune the Web Audio delay filter, and style the retro Win95/Winamp interface.
- **What Was Rejected or Corrected from AI Output:**
  1. **Rejected Hiding Cells on Window Resize & Non-Sequential Labels:** An intermediate AI-generated version hid outer rows and columns when the window shrank ("folded notes") and labeled rows from bottom to top with musical note names (`G3, B3, D4...`). During testing, I rejected this because clicking a square in a large window and then shrinking the window caused that square to disappear or shift position. I required a permanent `8 × 8` alphabetical coordinate grid (`A–H` top-to-bottom × `1–8` left-to-right) so no square is ever lost when resizing.
  2. **Corrected Identical Row Frequencies & Overwhelming Text Panels:** In the initial sequencer draft, every cell in the same row (`A1–A8`) produced the exact same pitch, and a large side panel displayed paragraphs of text. I corrected the sound rules in `js/rules.js` (`midiForCell`) so that all 64 pads (`A1–H8`) play distinct ascending frequencies across columns `1–8`, and replaced the text-heavy side panel with compact Winamp-style LED indicators (`✓ GRID ≥55%`, `✓ WAVE ≥40%`, `✓ HEAD ≥25%`, `✓ PADS ≥10%`).
  3. **Tuned Echo Mix & Filter:** The initial AI delay network used a 100% wet signal that muddied the melody; we corrected this by adding a `1800 Hz` low-pass filter and scaling `echoMix` between `3%` (small window) and `42%` (large window).

---

## Sources & Acknowledgements

- **Course & Starter Inspiration:** Designed for **NMED 3203 – Interactive Media Applications**, taught by **Mert Seven, PhD** ([Interactive Media Applications lab.](https://mertseven.com/ima/lab/index.html#home)). Inspired by the lab experiments *Letter Rain* (Collection 06: Context) and *Mini Sequencer* (Collection 03: Feedback).
- **Academic References:**
  - Dey, A. K. (2001). Understanding and using context. *Personal and Ubiquitous Computing*, 5(1), 4–7. https://doi.org/10.1007/s007790170019
  - Dourish, P. (2004). What we talk about when we talk about context. *Personal and Ubiquitous Computing*, 8(1), 19–30. https://www.dourish.com/publications/2004/PUC2004-context.pdf
  - Hutchins, E. L., Hollan, J. D., & Norman, D. A. (1985). Direct manipulation interfaces. *Human–Computer Interaction*, 1(4), 311–338. https://www.lri.fr/~mbl/ENS/FONDIHM/2013/papers/Hutchins-HCI-85.pdf
