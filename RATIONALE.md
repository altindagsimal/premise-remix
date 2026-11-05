# Design Rationale: Spatial Resonator (Context × Feedback)

## 1. Idea
*Spatial Resonator* is a web-based step sequencer shaped by its surroundings. Instead of treating the browser window and room lighting as neutral containers, the system turns them into musical and informational rules. Through **Context**, participants resize the viewport or shift ambient light; through **Feedback**, those environmental conditions transform both the active melody and which visual state signals remain legible.

## 2. Premises: Context × Feedback
**Context** operates through two inputs in `js/context.js` and `js/rules.js`: viewport geometry and room light (measured via webcam luminance or controlled with keyboard and slider alternatives). Width sets loop length (`100 px` per step), height sets pitch range (`60 px` per row), and area controls echo delay. **Feedback** (`js/render.js`, `js/main.js`) distinguishes stored notes, folded notes (`→n`, `↑n`), playhead state (`▲` playing, `△` paused), click acknowledgement (`+`/`−`), and a live readout panel. Rather than sitting apart, Context governs Feedback: as light drops below thresholds in `CONFIG.signals` (`55%`, `40%`, `25%`, `10%`), visual channels progressively fade, shifting evaluation from sight to sound and text.

## 3. Theory
Anind Dey defines context as measurable information characterizing the situation of an entity and its environment (Dey, 2001). This concept shaped our rule mappings, translating pixel dimensions into grid size and camera luminance (`0.08–0.55`) into tempo (`66–132 BPM`) and decay. However, Dey’s model reduces context to fixed sensor variables. Following Paul Dourish’s critique that context is enacted through activity rather than passively captured (Dourish, 2004), we exposed the grayscale camera preview alongside keyboard overrides so participants can renegotiate what the sensor measures.

Edwin Hutchins, James Hollan, and Donald Norman argue that interfaces narrow the *Gulf of Evaluation* by minimizing semantic distance between system states and visible signals (Hutchins et al., 1985). This informed our distinct indicators for stored, playing, and paused notes. Yet their framework assumes maximal visual legibility is always ideal; our design challenges this by withdrawing visual cues in darkness to foreground listening.

## 4. What I Learned
In our first prototype, clicking triggered fleeting ripples and resizing shifted pitch, but unguided testers believed shrinking the window deleted their notes and could not tell why the sound changed. Observing this confusion led us to store a persistent `16 × 10` pattern, add folded-note badges (`→n`, `↑n`), and display a live status readout.

---

### Links & References
- **Live Experience (GitHub Pages):** https://altindagsimal.github.io/premise-remix/
- **Source Repository:** https://github.com/altindagsimal/premise-remix
- Dey, A. K. (2001). Understanding and using context. *Personal and Ubiquitous Computing*, 5(1), 4–7. https://doi.org/10.1007/s007790170019
- Dourish, P. (2004). What we talk about when we talk about context. *Personal and Ubiquitous Computing*, 8(1), 19–30. https://www.dourish.com/publications/2004/PUC2004-context.pdf
- Hutchins, E. L., Hollan, J. D., & Norman, D. A. (1985). Direct manipulation interfaces. *Human–Computer Interaction*, 1(4), 311–338. https://www.lri.fr/~mbl/ENS/FONDIHM/2013/papers/Hutchins-HCI-85.pdf
