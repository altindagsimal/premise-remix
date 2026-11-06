# Design Rationale: Spatial Resonator (Context × Feedback)

## 1. Idea
*Spatial Resonator* is a web-based step sequencer shaped by its surroundings. Instead of treating the browser window and room light as neutral containers, the system turns them into acoustic and informational rules. Through **Context**, participants resize the viewport or shift ambient light; through **Feedback**, those conditions transform both the sounding melody and which visual state signals remain legible.

## 2. Premises: Context × Feedback
**Context** operates through two inputs in `js/context.js` and `js/rules.js`: viewport geometry and room light (sampled via webcam luminance or controlled with keyboard and slider alternatives). Narrowing the window compresses the grid, raises pitch (`1.45x`), tightens ripples, and dries echo (`3%`); expanding it deepens pitch (`0.72x`) and opens spacious echo (`42%`). **Feedback** (`js/render.js`, `js/main.js`) distinguishes active pads, playhead state (`▲` playing, `△` paused), click flashes, and a live LED deck. Rather than sitting apart, Context governs Feedback: as light drops below `CONFIG.signals` thresholds (`55%`, `40%`, `25%`, `10%`), visual channels (`GRID`, `WAVE`, `HEAD`, `PADS`) turn off, shifting evaluation from sight to listening.

## 3. Theory
Anind Dey defines context as measurable information characterizing an entity’s situation and environment (Dey, 2001). This shaped our rule mappings, translating pixel dimensions into pitch and echo, and camera luminance into tempo (`68-132 BPM`) and decay. Yet Dey reduces context to fixed sensor variables. Following Paul Dourish’s critique that context is enacted through activity rather than passively captured (Dourish, 2004), we exposed the grayscale camera preview and manual overrides so participants can renegotiate what the sensor measures.

Edwin Hutchins, James Hollan, and Donald Norman argue that interfaces narrow the *Gulf of Evaluation* by minimizing semantic distance between system states and visible signals (Hutchins et al., 1985). This guided our distinct indicators for stored, playing, and paused pads. However, their model assumes maximal visual legibility is always ideal; our design challenges this by withdrawing visual cues in darkness to foreground listening.

## 4. What I Learned
In an earlier prototype, shrinking the window hid outer cells, rows used non-sequential labels, and rows shared one pitch. Testing showed that losing clicked squares on resize and hearing identical notes across a row confused users. Consequently, we anchored a permanent `A1-H8` grid, gave all 64 pads unique frequencies, and replaced text walls with compact LED readouts.

---

### Links & References
- **Live Experience (GitHub Pages):** https://altindagsimal.github.io/premise-remix/
- **Source Repository:** https://github.com/altindagsimal/premise-remix
- Dey, A. K. (2001). Understanding and using context. *Personal and Ubiquitous Computing*, 5(1), 4–7. https://sites.cc.gatech.edu/fce/ctk/pubs/PeTe5-1.pdf
- Dourish, P. (2004). What we talk about when we talk about context. *Personal and Ubiquitous Computing*, 8(1), 19–30. https://www.dourish.com/publications/2004/PUC2004-context.pdf
- Hutchins, E. L., Hollan, J. D., & Norman, D. A. (1985). Direct manipulation interfaces. *Human–Computer Interaction*, 1(4), 311–338. https://www.lri.fr/~mbl/ENS/FONDIHM/2013/papers/Hutchins-HCI-85.pdf
