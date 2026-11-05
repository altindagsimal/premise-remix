# Spatial Resonator

**Course:** NMED 3203 – Interactive Media Applications  
**Premises Combined:** **Context** (Window Geometry & Room Illumination) × **Feedback** (Multi-Channel State Legibility & Threshold Withdrawal)  
**One-Sentence Description:** *Spatial Resonator* is a web-based step sequencer in which the browser window and room light shape the musical loop while dynamically governing which visual feedback signals remain visible on screen.

> **Premise Coupling Formula:**  
> *"Through **Context**, the participant reshapes the instrument by resizing the browser window and changing the ambient light of the room, and through **Feedback**, this environmental state transforms both the musical pattern and which visual state signals remain visible versus hidden."*

- **Live Demo (GitHub Pages):** https://altindagsimal.github.io/premise-remix/
- **Design Rationale (350 words):** [RATIONALE.md](./RATIONALE.md)

---

## How to Use

1. **Place or remove notes:** Click/tap any cell in the grid, or move the keyboard cursor with the **Arrow keys** and press **Space** / **Enter**.
2. **Start or pause playback:** Click **▶ Play** or press **P**.
3. **Reshape the spatial context (Window / Frame):**
   - Drag the edges of your browser window (or rotate your phone) to change the number of steps (width → loop length, `4–16` steps), pitch rows (height → pentatonic range, `3–10` notes), and room echo delay (window area).
   - **Keyboard & Button Alternative:** Use the **Narrower (`N`)**, **Wider (`W`)**, **Shorter (`S`)**, **Taller (`T`)**, and **Full (`R`)** frame buttons or keys when window resizing is unavailable (e.g., fullscreen or mobile).
   - Notes outside a smaller window are **never deleted**; they are preserved as **folded notes** (`→n` to the right, `↑n` above) and return when you expand the window.
4. **Shift the atmospheric context (Room Light):**
   - **Camera Sensor (Optional):** Click **◉ Measure light with camera (`C`)** to sample average room brightness in real time. A tiny `64 × 48` grayscale preview shows the exact luminance image the system measures; no video ever leaves your device.
   - **Slider & Keyboard Alternative:** Drag the **Room light** slider or press **D** (Darker) and **B** (Brighter).
5. **Observe the Feedback loop:**
   - Check **What the system knows** and **Signals on screen** in the right-hand panel.
   - As room light drops below `55%`, `40%`, `25%`, and `10%`, visual signals (**grid lines**, **ripples**, **playhead**, and **note markers**) progressively fade out, leaving acoustic echo, click flashes (`+`/`−`), and plain-text status readouts.

---

## Project Files

| File | Purpose |
| :--- | :--- |
| [`index.html`](./index.html) | Semantic page structure, accessible controls, live status readout panel, and ARIA announcements. |
| [`style.css`](./style.css) | Layout, high-contrast typography, focus rings, and responsive rules for desktop and mobile viewports. |
| [`js/config.js`](./js/config.js) | **Single source of truth for live code edits:** all grid thresholds, light thresholds, signal cutoffs, audio parameters, and edit cooldown rules. |
| [`js/rules.js`](./js/rules.js) | Pure mapping functions translating context inputs (pixels, area, luminance, light) into system rules (steps, notes, BPM, echo, signal visibility). |
| [`js/context.js`](./js/context.js) | `STATE` store and `CONTEXT` sensor manager (window measurement, keyboard frame, and optional webcam luminance sampling). |
| [`js/audio.js`](./js/audio.js) | Web Audio synthesizer and feedback delay network (echo time scales with window area; decay and repeats scale with room light). |
| [`js/sequencer.js`](./js/sequencer.js) | Persistent `16 × 10` pattern matrix, step clock, non-destructive folded-note counting, and edit cooldown enforcement. |
| [`js/render.js`](./js/render.js) | HTML5 Canvas renderer drawing the frame, grid, playhead (`▲`/`△`), stored/folded notes (`→n`/`↑n`), ripples, click flashes (`+`/`−`/`×`), and resize badges. |
| [`js/main.js`](./js/main.js) | Event wiring (pointer, keyboard, buttons, camera) and live plain-language state updates. |
| [`RATIONALE.md`](./RATIONALE.md) | 350-word design rationale connecting design decisions to Dey (2001), Dourish (2004), and Hutchins et al. (1985). |

---

## Live Code Modification Quick Reference

All tunable constants are grouped at the top of [`js/config.js`](./js/config.js), and all input-to-output mappings are isolated in [`js/rules.js`](./js/rules.js):

- **Double the echo / delay time:** In `js/config.js` → `CONFIG.audio.echoMinSec` (`0.08 → 0.16`) and `CONFIG.audio.echoMaxSec` (`0.45 → 0.90`).
- **Rate-limit how often a participant can edit notes:** In `js/config.js` → `CONFIG.edits.cooldownMs` (`0 → 1000` for a 1-second cooldown; blocked clicks display `×` and announce the remaining wait time).
- **Remove a feedback signal in a mode:** In `js/config.js` → `CONFIG.signals` (set `playhead: 2` or `ripples: 2` to disable that channel completely, or `0` to keep it visible at all light levels).
- **Swap which input controls which output:** In `js/rules.js` → swap `stepsFromWidth` / `notesFromHeight` or change `bpmFromLight(light)` so window width controls tempo and light controls step count.

---

## AI Usage Statement

- **Tools Used & Purpose:** Claude and Gemini (via Google Antigravity) were used during development to refactor the initial single-file prototype into a modular architecture (`config.js`, `rules.js`, `context.js`, `audio.js`, `sequencer.js`, `render.js`, `main.js`), structure the Web Audio delay feedback loop, and check word-count constraints on the rationale.
- **What Was Rejected or Corrected from AI Output:**
  1. **Rejected Simulated-Only Context:** An early AI-generated prototype represented "ambient light" solely through an on-screen range slider and triggered unconnected random notes on an `8 × 8` grid. I rejected this design because an on-screen slider alone does not engage the physical setting beyond the screen, and random notes did not allow participants to compare stored state against playback state. We replaced it with optional real-time webcam luminance sampling paired with explicit keyboard/slider fallbacks and a persistent step sequencer.
  2. **Corrected Color-Only Feedback & Destructive Resizing:** The initial AI draft communicated pitch and light primarily through HSL hue shifts and cleared out-of-bounds cells when the canvas shrank. To meet accessibility requirements and support the *Gulf of Evaluation* (Hutchins et al., 1985), I required shape, symbol, and text distinctions (`▲` vs. `△` playhead, `+`/`−`/`×` edit flashes, `→n`/`↑n` folded-note counters, and the *What the system knows* panel) so meaning is never conveyed by color alone and no notes are lost when resizing.

---

## Sources & Acknowledgements

- **Course & Starter Inspiration:** Designed for **NMED 3203 – Interactive Media Applications**, taught by **Mert Seven, PhD** ([Interactive Media Applications lab.](https://mertseven.com/ima/lab/index.html#home)). Inspired by the lab experiments *Letter Rain* (Collection 06: Context) and *Mini Sequencer* (Collection 03: Feedback).
- **Academic References:**
  - Dey, A. K. (2001). Understanding and using context. *Personal and Ubiquitous Computing*, 5(1), 4–7. https://doi.org/10.1007/s007790170019
  - Dourish, P. (2004). What we talk about when we talk about context. *Personal and Ubiquitous Computing*, 8(1), 19–30. https://www.dourish.com/publications/2004/PUC2004-context.pdf
  - Hutchins, E. L., Hollan, J. D., & Norman, D. A. (1985). Direct manipulation interfaces. *Human–Computer Interaction*, 1(4), 311–338. https://www.lri.fr/~mbl/ENS/FONDIHM/2013/papers/Hutchins-HCI-85.pdf
