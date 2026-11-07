# Design Rationale: Spatial Resonator (Context × Feedback)

## 1. Idea
I built *Spatial Resonator* as a web-based step sequencer shaped by the space around it. Instead of treating the browser window and room light as neutral containers, I turned them into musical and visual rules. Through **Context**, a user resizes the window or changes room light; through **Feedback**, those changes alter both the melody and which visual signals stay on screen.

## 2. Premises: Context × Feedback
I connected **Context** (`js/context.js`, `js/rules.js`) to two inputs: window size and room light (measured by webcam or adjusted via slider and keyboard). Narrowing the window compresses the grid, raises pitch (`1.45x`), shrinks ripples, and dries echo (`3%`); widening it drops pitch (`0.72x`) and opens a hall echo (`42%`). For **Feedback** (`js/render.js`, `js/main.js`), I gave each state a clear cue: lit pads, playhead (`▲` playing, `△` paused), click flashes, and an LED bar. Context directly controls Feedback: as light drops below `55%`, `40%`, `25%`, and `10%` (`CONFIG.signals`), I turn off `Grid Lines`, `Wave Ripples`, `Playhead Bar`, and `Note Pads` so users rely on listening.

## 3. Theory
Anind Dey defines context as measurable information describing the situation of a person, place, or object (Dey, 2001). I used this to map window pixels to pitch and echo, and camera brightness to tempo (`68-132 BPM`) and decay. However, Dey treats context as fixed sensor numbers. Following Paul Dourish’s argument that people actively shape context during interaction (Dourish, 2004), I showed the `64x48` grayscale camera feed and added manual controls so users can see and change what the system measures.

Edwin Hutchins, James Hollan, and Donald Norman explain that interfaces reduce the *Gulf of Evaluation* when visual signals clearly reflect system states (Hutchins et al., 1985). I applied this by separating stored, playing (`★`), and paused pads. Still, they assume maximum visual clarity is always best; my project challenges this by hiding visual signals in darkness to focus on sound.

## 4. What I Learned
In my first version, shrinking the window hid outer squares, row labels were out of order, and each row played one note. In testing, losing clicked squares on resize and hearing identical notes across a row felt confusing. So I fixed the grid to `A1-H8`, gave all 64 pads unique notes, and replaced cryptic labels with self-explanatory LED readouts.

---

### Links, Sources & Design Rules
- **Live Experience (GitHub Pages):** https://altindagsimal.github.io/premise-remix/
- **Source Repository:** https://github.com/altindagsimal/premise-remix
- **Rule 1 – Sensor-to-Sound Mapping (`js/rules.js`):** Dey, A. K. (2001). Understanding and using context. *Personal and Ubiquitous Computing*, 5(1), 4–7. https://sites.cc.gatech.edu/fce/ctk/pubs/PeTe5-1.pdf *(Maps window width/area to Pitch `×1.45–×0.72` & Room Echo `3%–42%`, and room light to Tempo `68–132 BPM`.)*
- **Rule 2 – Negotiated Context & Manual Override (`js/context.js`):** Dourish, P. (2004). What we talk about when we talk about context. *Personal and Ubiquitous Computing*, 8(1), 19–30. https://www.dourish.com/publications/2004/PUC2004-context.pdf *(Exposes the live `64×48` grayscale camera preview and manual Light Slider `D/B` + Room Size `N/W/S/T/R` overrides.)*
- **Rule 3 – State Legibility vs. Darkness (`CONFIG.signals` in `js/config.js`):** Hutchins, E. L., Hollan, J. D., & Norman, D. A. (1985). Direct manipulation interfaces. *Human–Computer Interaction*, 1(4), 311–338. https://www.lri.fr/~mbl/ENS/FONDIHM/2013/papers/Hutchins-HCI-85.pdf *(Separates stored pads, playing `★`, and playhead `▲/△`, then challenges their always-visible assumption by hiding Grid Lines `<55%`, Wave Ripples `<40%`, Playhead `<25%`, and Note Pads `<10%` in darkness.)*
- **Rule 4 – Premise Remix Inspiration:** Seven, M. (2026). *Interactive Media Applications lab.* (NMED 3203). https://mertseven.com/ima/lab/bibliography.html *(Combines Collection 06 `Letter Rain` threshold sensing with Collection 03 `Mini Sequencer` step-clock feedback.)*
