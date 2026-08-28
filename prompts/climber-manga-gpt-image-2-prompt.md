# THE CLIMBER — Manga Art-Style Prompt Pack for GPT Image 2.0

A production-grade, ultra-detailed style prompt reconstructing the visual language of
**_Kokou no Hito_ / _The Climber_** (孤高の人) — the seinen mountaineering manga serialized in
Shueisha's *Weekly Young Jump* (Nov 2007 – Oct 2011, 17 tankōbon), illustrated by Shin-ichi
Sakamoto, written with Yoshio Nabeta and Hiroshi Takano, adapted from Jirō Nitta's 1973 novel,
itself based on the real solo alpinist **Katō Buntarō (1905–1936)**.

Built from 60+ researched references (§8). Written for **GPT Image 2.0 / `gpt-image-2`**, and
portable to any modern text-to-image model.

---

## 0. HOW TO USE THIS FILE

| Section | Use it for |
|---|---|
| §1 | The style DNA — why every clause in the prompt exists |
| §2 | **THE MASTER PROMPT** — copy/paste, ~1,900 words, maximum fidelity |
| §3 | Short prompt (~180 words) for fast iteration and chat-UI use |
| §4 | Modular swap blocks — change mountain, weather, moment, framing |
| §5 | Negative constraints / anti-slop block |
| §6 | API parameters and settings |
| §7 | Craft notes, failure modes, iteration protocol |
| §8 | The 60+ references |

**One critical rule first.** Do **not** write "in the style of Shin-ichi Sakamoto." He is a living
artist; GPT Image 2's guidance is explicitly to *reference styles, not living artists*, and named-artist
prompts get diluted or refused. Every clause below therefore describes the style as **physical facts
about marks on paper** — nib width, hatch spacing, ink order, tone density, panel geometry. This is
also simply the better prompt: the model reproduces described physics far more reliably than it
reproduces a name. The guiding maxim from the GPT Image 2 prompting guides — *"describe physics,
not vibes."*

---

## 1. STYLE DNA — WHAT THE RESEARCH ACTUALLY SAYS

Distilled from §8. These are the load-bearing facts the prompt encodes.

### 1.1 The paradox: hyper-detail under discipline
Reviewers converge on one description: the art is *hyper-detailed and aggressively dark, using
shadow as a structural element*, yet the line quality is **restrained and disciplined** — "over the
top" imagery delivered with controlled marks. It is **not** scribbly, not "gritty," not noisy. Every
line is placed. This is the single hardest thing to get out of an image model, which defaults to
decorative scratchiness when it hears "detailed manga."

### 1.2 Two line languages, evolving across the run
The style visibly transforms from **hard-edged inking** (early volumes) toward **the softer look of a
technical pencil** (later volumes) — strokes built so delicately they read as soft graphite, with a
*transparency* that is difficult to replicate with traditional inking tools. Compare vol. 1 and vol. 17
covers and the shift is stark. The master prompt asks for the **late-run synthesis**: nib-hard
contours on rock and gear, pencil-soft transparent rendering on skin, snow, and air.

### 1.3 The face is built in a specific order
Inking begins with **eyes, nose, and lips** — lips drawn plump and "sun-kissed," a signature. A single
continuous gesture stroke travels **eyebrow → nose → upper lip → mouth** to establish the head. Lips,
hair, and eyelashes are the expressive controls: the same face shifts from innocent to monstrous purely
through how those three are rendered. Seinen eye convention applies — narrower shapes, no sparkle,
strong lid shadow, lash mass built as a filled shape with hatching inside rather than as separate spikes.

### 1.4 Hair as an engineered system
An archive of **2,000+ pre-designed hairstyles** is maintained and recombined per character; clothing is
traced from self-shot photo reference; custom Clip Studio Paint materials supply hair and fabric texture.
The visible result: hair reads as **discrete threaded strands in layered planes**, razor-cut and
sharply tipped, never as a hatched helmet.

### 1.5 Panels: rigid grid vs. luscious spread
The defining rhythm — **hyper-detailed drawings contained in rigid grids, alternating with luscious
full-bleed spreads**, producing a specific cinematic flow. Many chapters carry **almost no dialogue**,
and the work is notable for a **near-total absence of sound effects**. Silence is a rendering choice.
Reproduce it: no SFX katakana, no speed lines as decoration, minimal or zero text.

### 1.6 Symbol layered onto document
The series is known for **visual metaphor** — interior state externalized into the image. An avalanche
is drawn as **skyscrapers and semi-trucks plummeting downhill at blistering speed**. That is the register:
one impossible object inside an otherwise forensically documentary frame. Use sparingly — one metaphor
per image, or none.

### 1.7 The body is the subject
Anatomy is drawn as a machine under load. The forearm's **flexor digitorum profundus** and **flexor
digitorum superficialis** are the visible cords; a **crimp** puts roughly three times fingertip force
through the **A2 pulley**. The protagonist is described as **thin but muscular, ~6–10% body fat**,
short layered **razor-cut** hair with parted bangs, and — unusually for a Japanese character —
**blue eyes**. Even a static panel should look like it is straining.

### 1.8 The mountains are real places with real textures
- **Tsurugi-dake (剱岳)** — the "Palace of Rock and Snow," glacially chiselled crags; the **Chinne**, an
  enormous blade of rock whose Left Ridge runs 13 pitches over knife-edges and pinnacles "like the teeth
  on a circular saw"; Genjirō, Yatsumine, Hayatsuki, Bessan ridges. In winter: mean winds **over 20 m/s**,
  snow metres deep. "A man who can climb Tsurugi in winter can climb anywhere."
- **Kita-dake Buttress** — Japan's second-highest peak (3,192 m) carries a **600 m east face**; the No.4
  ridge (first climbed 1934) is a sharp arête suspended up the centre of the face, on **chert** that is
  **downward-sloping and largely frictionless**.
- **K2, Abruzzi Spur** — the **Bottleneck** at ~8,200 m, 400 m below the summit, 50–60° hard ice,
  overhung by the **hanging serac** of the eastern ice field.
- Ice vocabulary that must be drawn *differently*: **rime** (opaque, granular, feathered, accreted into
  the wind), **verglas** (glassy, transparent, a skin over rock), **névé** (compacted granular snow),
  **blue ice** (compressed, enlarged crystals, deep-toned), **seracs** (tilted, overhanging towers).

### 1.9 Light is documented, not invented
**Alpenglow** — indirect pinkish-red band opposite the sun, striking summits *before* sunrise or *after*
sunset, most intense on snow-covered peaks; it bleeds into **blue hour** as the red leaches out. In
monochrome this becomes a *narrow horizontal band of near-white on the summit snow with the valley in
deep tone*. Chiaroscuro logic governs: **black grounds the page like rhythm in music**; large black
shapes energize and drive the eye.

### 1.10 The face at altitude
High-altitude frostbite compounds freezing with **hypoxia and dehydration**; climbers characteristically
carry a **sunburn/frostbite combination**; **breath condensation ices up in beard and hood ruff**;
ears, nose, lips are the exposed casualties. Goggle tan-lines, split lips, waxy white patches on
cheekbones, blood-crusted nostrils.

### 1.11 Gear that is drawn correctly
60–80 cm mountaineering axe, **no rubber grip**, head weighted enough to bite frozen ice. **12-point
crampons with anti-balling plates.** A high-altitude harness of **thin non-absorbent webbing, minimal
padding**, designed to be donned without stepping through loops (over a one-piece down suit and
crampons). Goggles for summit day. And — the historical signature of Katō Buntarō — **jika-tabi**,
split-toe canvas shoes with rubber soles, worn on serious alpine ground.

### 1.12 Lineage
Gekiga realism, and the post-Otomo New Wave discipline of drawing **each blade of grass individually,
knowing the collective makes the field** — realism through deliberateness, not through more screentone.
Behind that, sumi-e: **ma**, negative space as an active compositional member, mountains rendered with
minimal detail and the unpainted void doing the work.

---

## 2. THE MASTER PROMPT

> Copy everything between the fences. Structured in labelled blocks because GPT Image 2 rewards
> structure (Scene / Subject / Details / Style / Lighting / Technical / Constraints). Default scene is
> the winter Chinne blade on Tsurugi-dake; swap it from §4 without touching the style blocks.

```text
=== MEDIUM AND OUTPUT FORMAT ===
A single finished full-bleed interior illustration page from a Japanese seinen mountaineering manga,
as printed in a weekly anthology on slightly warm cream pulp paper. Strictly monochrome: pure black
ink on white paper. No color of any kind. No painted grey, no digital airbrush, no soft blur gradients.
Every midtone in this image must be physically constructed from visible marks — pen-nib line, parallel
hatching, cross-hatching lattice, stipple, dry-brush scratch, and adhesive halftone screentone dots.
If a value looks smooth and photographic, it is wrong. Zoom-level truth: at 100% the greys resolve
into individual strokes and dots; at reading distance they fuse into continuous tone.

=== LINE LANGUAGE — TWO COEXISTING SYSTEMS ===
System A, the hard nib line. A flexible steel G-nib loaded with black India ink. Strokes swell and
taper within a single pass, from a 0.1 mm hairline at entry to a 1.0–1.4 mm belly at maximum pressure
and back to a hairline at exit. Confident, unbroken, committed — no sketchy chicken-scratch, no
searching lines, no feathered repeats. Contours terminate cleanly; they do not fray. Use System A for:
rock edges and fracture lines, ice-axe and crampon steel, harness webbing, boot welts, rope, zipper
tape, the silhouette of the figure against sky, and every load-bearing structural edge.
System B, the soft technical-pencil line. Fine graphite laid so delicately that the stroke reads as
semi-transparent — you can see paper tooth through it, and strokes overlap into gauzy accumulations
rather than opaque black. It has a quality that traditional inking tools cannot easily produce.
Use System B for: skin, the interior modelling of the face, breath vapour, wind-borne snow, distant
ridgelines dissolving into atmosphere, fabric folds in soft shell, and any surface that is receding,
warm, or alive.
The two systems must not blend into mush. They meet at hard boundaries: a nib-black rock edge sits
directly against pencil-soft snow haze with no transitional smudge.

=== RENDERING AND VALUE CONSTRUCTION ===
Hatching is directional and describes form, never decorative. Parallel strokes follow the surface
curvature of what they sit on; on a convex bulge they arc, on a planar slab they run straight and
parallel. Value darkens by tightening line spacing, not by pressing harder. Cross-hatch in a second
layer laid at roughly 25–40 degrees to the first, never at a flat 90 degrees, and add a sparse third
pass only in the deepest cores. Screentone is used sparingly and deliberately — a 60-line dot tone for
mid-sky, a 27.5-degree gradation tone for atmospheric fall-off — with the tone angle rotated a few
degrees between adjacent regions so no moiré clash appears. Hatching does the majority of the tonal
work; the tone is support, not substitute.
Spot blacks are a compositional system, not shadow filler. Deploy large, deliberately shaped solid
black masses — a shadowed gully, the underside of a roof, the inside of a hood, a wind-scoured couloir —
as designed silhouettes that anchor the page and drive the eye. These black shapes must read as
legible abstract shapes even squinted at, and they carry rhythm the way percussion carries a bar of
music. Against them, keep pure untouched white paper as the brightest note: sunlit snow, ice glare,
and the exhaled plume are left as bare paper with no marks at all.
Overall value plan: roughly 25 percent solid black, 15 percent pure untouched white, 60 percent built
tone. Contrast is high and hard-edged, chiaroscuro-driven, closer to scratchboard than to watercolour.

=== SUBJECT — THE CLIMBER ===
A solo Japanese male alpinist in his mid-to-late twenties, alone in frame, mid-move on near-vertical
mixed ground. Build: lean and stripped, thin but heavily muscled, approximately 6 to 10 percent body
fat — no bulk, only cord and tendon under thin skin. Shoulders and lats are wide relative to a narrow
waist. Neck tendons stand out under strain.
Head and face: short layered razor-cut black hair, choppy sharply tipped ends, straight on top and
layered at the nape, damp and partly frozen at the tips, bangs parted so the eyes are fully visible.
Draw hair as discrete threaded strands grouped into overlapping planes with clean white gaps between
locks — never a solid hatched cap. Eyes are narrow, deep-set, unusually pale and light-irised, with a
hard specular pinpoint left as untouched white paper and a heavy lid shadow above. Eyelashes are drawn
as a filled dark mass, thicker at the outer corner and tapering inward, with hatching inside the mass
rather than as separate spikes. The nose is thin and high-bridged. The lips are full and plump with a
clearly defined vermilion border and a sun-darkened upper lip, cracked and split in two places with
dried blood in the fissures. The whole head reads as though established by one continuous gesture
running from eyebrow, down the bridge of the nose, into the upper lip and mouth.
Face at altitude, rendered honestly: sunburn and frostbite together on the same face. Deep raccoon
goggle tan-line, near-white protected skin around the eye sockets against wind-flayed dark cheeks.
Waxy grey-white frostnip patches on the cheekbones and the tip of the nose. Cracked, peeling lips.
Breath condensation frozen into a crust of rime in the beard stubble and along the hood ruff, drawn as
individual accreted ice crystals catching light. Eyelashes carrying frozen beads. Ice glaze on the
eyebrows. Eyes bloodshot, pupils small, the thousand-yard focus of hypoxia and 40 hours without sleep.
Hands: this is the emotional centre of the image. Fingers in a half-crimp on a rock edge, the last two
joints curled hard. The forearm shows the two flexor cords standing proud under the skin — flexor
digitorum profundus and superficialis — with veins raised and branching over them. Knuckles skinned
and scabbed, nails split, fingertips taped with frayed cloth tape gone grey. Dry chalk residue where
the glove is off; the other hand still gloved. Every tendon on the back of the hand individually drawn.

=== CLOTHING AND EQUIPMENT — TECHNICALLY CORRECT, DRAWN FROM OBSERVATION ===
Layered technical alpine clothing with functional detail rendered exactly: a hardshell with a helmet-
compatible hood and a wired brim, storm flap over a water-resistant front zip, pit zips, articulated
elbows, hem drawcord, taped seams shown as faint parallel double lines on the inside face of a flapping
panel. Fabric behaves like fabric: stiff, wind-loaded, cracking and snapping in the gale, with hard
directional creases radiating from stress points at shoulder, elbow, and hip — not soft cloth drape.
Frost has crept into every seam and stitch line as fine white accretion.
Harness: thin non-absorbent webbing, minimal padding, worn over the outer layer, gear loops racked with
ice screws, a nut tool, and wire-gate carabiners. Ice axe with a 60 to 80 centimetre shaft, bare metal
with no rubber grip, a weighted pick pitted and scarred at the tip from striking rock, leash frozen
stiff. Twelve-point steel crampons with anti-balling plates, front points bitten a centimetre into
hard ice with radial fracture lines spidering out from each placement. Rope: 8 mm half rope, ice-stiff,
hanging in tight memory coils rather than soft curves, individual sheath weave picked out where it
catches light. Optional historical note if desired: split-toe jika-tabi canvas shoes with rubber soles
instead of boots, worn on serious alpine ground.

=== SETTING — THE MOUNTAIN AS A DOCUMENTED PLACE ===
Winter, high on a Japanese alpine granite blade — an enormous knife-edged fin of rock rising in a
sequence of pinnacles and knife-edges like the teeth of a circular saw, cut by glacial action, plastered
with snow and ice. Draw four distinct ice materials, each with its own mark language, and do not let
them look alike:
Rime ice — opaque, granular, matte; feathered plumes accreted horizontally into the prevailing wind on
every windward edge; render with dense short stipple and broken outline, no highlight.
Verglas — glassy, transparent, a thin skin over rock so the rock's texture and fracture lines show
through it, with hard specular white slivers left as bare paper along its edges.
Névé — compacted granular snow, matte and slightly grained, rendered with fine even stipple over a
light tone.
Blue ice and seracs — deeply compressed ice with enlarged crystals, drawn with the darkest ice tone,
internal fracture planes as long parallel nib lines, tilted overhanging towers with undercut bases.
The rock itself: fine-grained granite and downward-sloping, largely frictionless chert. Every facet
crystalline and faceted, with true geological logic — joint sets running consistently in one direction
across the whole face, exfoliation flakes, water-worn runnels, lichen mottling near the base, and
snow lodged only on the ledges that could physically hold it. Rock is rendered with tight
cross-hatching that follows each plane's angle, so that adjacent facets read as different values and
the volume of the face is unmistakable.
Air is a drawn substance: spindrift streams off the arête in long horizontal ribbons under a 20 metre
per second wind, individual snow grains resolved near the viewer and dissolving into pencil-soft haze
further out. The scale is brutal — the face continues far beyond the top and bottom of the frame, and
the drop below the climber's heels falls away into blank white void with no visible bottom, so the
viewer feels the exposure in their stomach.

=== LIGHTING — PHYSICS, NOT MOOD ===
Late alpenglow into blue hour. The sun is already below the horizon; the light is indirect. A narrow
horizontal band of near-white sits on the highest snow and the upper third of the rock blade — this
band is left as pure untouched paper. Below it the value falls off fast into deep built tone and then
into solid spot black in the couloirs and the north-facing side of every flake. The sky is a smooth
gradation tone, darkest at the top of the frame, thinning toward the horizon, with a scatter of the
first stars punched out as tiny white dots.
The climber is lit hard from the upper right at a raking angle, so the illuminated edge of the face,
shoulder, and forearm is a bright rim of bare paper one to three millimetres wide, and everything
turned away from it drops immediately into cross-hatched shadow with almost no transition. Frost on
fabric catches this rim light as a hundred tiny white specks. Breath vapour is a pure white plume torn
sideways by the wind, drawn as untouched paper with a soft pencil edge only.

=== COMPOSITION AND CAMERA ===
Vertical portrait format. Camera positioned slightly above and outside the climber, looking down and
across the face at roughly a 40-degree angle, so the viewer's eye is pulled along the arête and then
off into the void — a vertiginous, precarious point of view that makes the reader feel unroped.
The climber occupies about 22 percent of the frame height, placed just left of centre on the lower
third — small enough that the mountain dominates and dwarfs him, large enough that every detail of
face, hand, and gear is fully legible. A strong diagonal of the rock blade runs from lower-left to
upper-right and exits the frame. Deep negative space in the upper-left quadrant is left almost
entirely empty — bare paper and light tone — as an active compositional member, the emptiness carrying
as much weight as the drawn form and giving the whole page room to breathe.
Depth in three clean planes with no muddy middle: foreground rock and the figure in maximum detail and
hardest contrast; mid-ground ridge in reduced contrast and lighter tone; far range in the faintest
pencil-soft line, nearly dissolved into the sky.

=== TONE AND INTENT ===
Solemn, austere, physically punishing, quietly reverent. Silence rather than spectacle. This is a
document of a man alone at the limit of what a body can do, and the drawing should read as an act of
patient observation rather than of flourish — hyper-detailed, but disciplined and restrained, with
every mark placed on purpose. Awe and dread in equal measure.

=== TECHNICAL SPECIFICATION ===
Ultra-detailed, high-fidelity, sharp and crisp line reproduction at print resolution. Vertical portrait
aspect ratio 2:3. Deep blacks with no compression banding; clean white paper with no grey cast. Ink
should look laid down on the paper surface, with the faintest suggestion of cream pulp tone and paper
grain in the untouched areas.

=== CONSTRAINTS — WHAT MUST NOT APPEAR ===
No color, no sepia, no blue tint, no duotone. No painted or airbrushed grey — all value from marks.
No text of any kind: no speech balloons, no sound effects, no katakana, no signature, no watermark,
no panel numbers, no logo. No panel borders or gutters — this is a single full-bleed image. No motion
lines or radiating speed lines used as decoration. No glowing highlights, no lens flare, no bokeh, no
depth-of-field blur, no chromatic aberration, no film grain overlay, no vignette. No cel-shaded anime
look, no thick uniform outlines, no flat cartoon fills. No large sparkling eyes, no blush marks, no
chibi or moe features, no exaggerated stylized proportions. Anatomically correct hands: five fingers
per hand, correct joint count, plausible grip mechanics on the hold. Gear must be mechanically
plausible — no floating carabiners, no rope passing through solid rock, no crampons drawn as smooth
plates. No modern sport-climbing gym aesthetic, no bright technical-apparel branding. No crowd, no
second climber, no helicopter, no visible town or road. Not photorealistic, not 3D-rendered, not a
photograph — this is ink and pencil on paper.
```

---

## 3. SHORT PROMPT (fast iteration / chat UI)

```text
Monochrome Japanese seinen manga illustration, black ink and fine technical pencil on cream paper.
A lean, corded solo alpinist — ~7% body fat, razor-cut layered black hair, narrow pale eyes, full
cracked sun-split lips, goggle tan-line, rime frozen in his stubble — half-crimping a rock edge on a
knife-edged winter granite arête, forearm flexor cords and veins standing proud, 12-point crampons
bitten into blue ice. Value built ONLY from directional cross-hatching, stipple and 60-line halftone
screentone, plus large designed spot-black masses; sunlit snow and breath vapour left as pure untouched
paper. Four distinct ice textures: granular opaque rime, glassy transparent verglas, stippled névé,
dark fractured serac ice. Alpenglow into blue hour — a narrow white band on the summit snow, valley in
deep black. Vertical 2:3, camera above and outside on a 40° angle, climber at 22% of frame height,
lower-left, dwarfed by the face; upper-left quadrant left empty as active negative space. Hyper-detailed
but disciplined and restrained, high-contrast chiaroscuro, austere and silent.
NOT: color, painted grey, airbrush, text, speech balloons, sound effects, panel borders, speed lines,
glow, blur, lens flare, cel-shaded anime, big sparkly eyes, 3D render, photograph.
```

---

## 4. MODULAR SWAP BLOCKS

Keep every style block from §2 fixed. Replace only the `SETTING`, `LIGHTING`, or `COMPOSITION` block
with one of these. This is what keeps a whole series of images on-model.

### 4.1 Mountain swaps

**A — Tsurugi-dake, the Chinne (default).** *The "Palace of Rock and Snow."*
```text
An enormous blade-like fin of granite rising out of a glacially chiselled cirque, its crest a sequence
of knife-edges and pinnacles like the teeth of a circular saw, thirteen rope-lengths of it stacked into
the sky. Ridges fall away on both sides into snow-choked gullies. Winter: metres of snow loaded on
every ledge, mean wind over 20 metres per second stripping the crest bare and throwing horizontal
spindrift plumes off the lee side.
```

**B — Kita-dake Buttress, No.4 ridge.**
```text
A 600-metre east face of downward-sloping, largely frictionless chert, its bedding planes all tilted
the wrong way like stacked roof tiles. A sharp arête hangs suspended up the centre of the face, gullies
cutting down on either side. The rock is drawn with consistent joint-set direction and shallow
outward-sloping ledges that hold almost no snow. Early summer: patchy old snow in the gully beds,
verglas in the shaded corners, cloud boiling up from the valley below the face.
```

**C — K2, the Bottleneck.**
```text
A narrow ice couloir at 8,200 metres, 400 metres below the summit, 50 to 60 degrees of hard grey-blue
ice, a fixed line running up its throat. Directly overhead and filling the top third of the frame, the
overhanging serac wall of the eastern ice field — a leaning cathedral of fractured blue ice with an
undercut base and a horizontal shear crack running its length. The air is thin enough that the sky
above is nearly black even in daylight; a bottled-oxygen mask and regulator hose on the climber's face.
Scale is absurd: the figure is a speck beneath a hundred thousand tonnes of hanging ice.
```

**D — Yarigatake, the Kitakama ridge in a January blizzard.** *Where the real Katō Buntarō died, 1936.*
```text
A long, broken, unrelenting ridge of snow-plastered rock leading toward a sharply tapered spire — the
"Matterhorn of Japan" — almost entirely erased by blizzard. Visibility under fifteen metres. The ridge
crest appears and disappears in the whiteout; cornices overhang unseen on the right. Nearly the entire
frame is untouched white paper and the faintest pencil-soft tone, with only the climber and two metres
of ridge rendered in hard nib line — a study in near-total emptiness.
```

**E — The provincial mountain, before he was anyone.**
```text
A modest forested Japanese ridge in late autumn, cedar and beech, a worn path, mist in the valley,
a distant snow-dusted range on the horizon. Warm, ordinary, quiet. The clothing is cheap and
non-technical: worn sneakers, a school jersey, a canvas daypack. The same disciplined hyper-detail
applied to bark, leaf litter, and cheap fabric — every fallen leaf drawn individually, knowing the
collective makes the ground.
```

### 4.2 Moment swaps

| Swap | Replace `SUBJECT` action + `COMPOSITION` with |
|---|---|
| **The bivouac** | Hunched in a bivy sack on a ledge the width of his shoulders, knees to chest, one arm through a sling clipped to two pitons; head tipped back against rock, eyes shut, breath plume rising vertically in still air; stove flame the only pure white in a near-black frame. |
| **The fall** | Body inverted and rotating in open air, one crampon still trailing torn ice, rope slack and whipping into an S, gear on the harness flying outward; face upside-down, eyes wide and utterly clear. Camera locked below him looking up so the mountain hangs above like a ceiling. |
| **The summit** | Standing, back to the viewer, tiny at the extreme lower-right, the ridge running away flat into a sea of cloud lit by alpenglow. 90 percent of the frame is empty sky and cloud. No triumph — only exhaustion and a very long way back down. |
| **The hands, macro** | Extreme close-up filling the whole frame: two hands on a granite edge, half-crimped, one gloved and one bare. Skin, tape, split nails, chalk dust, ice crystals in the knuckle creases, granite crystals at 1:1. Nothing else in frame. Pure texture study. |
| **The avalanche (metaphor mode)** | The avalanche is not drawn as snow. It is drawn as a cascade of **skyscrapers and semi-trailer trucks tumbling downhill at blistering speed**, rendered with the same forensic detail as the rock — plate glass, girders, tyres, all of it pouring down the couloir toward the viewer. Everything else in the frame stays documentary. Exactly one impossible object; no other stylization. |

### 4.3 Format swaps

**Multi-panel manga page** — replace the `MEDIUM` and `COMPOSITION` blocks:
```text
A full manga page laid out as a rigid grid: a 3-row structure, top row split into two narrow vertical
panels, middle row one wide horizontal panel, bottom row a single large panel bleeding off the page
edge. Clean 4 mm white gutters, crisp black panel rules of uniform 0.5 mm weight, right-to-left
reading order. Panel 1: the climber's eyes in extreme close-up. Panel 2: his gloved hand testing a
hold, ice crystals falling. Panel 3: wide establishing shot of the whole face with the figure as a
speck. Panel 4: full-width low-angle of the arête against the alpenglow sky, figure silhouetted.
Absolutely no dialogue, no balloons, no sound effects anywhere on the page — the sequence is silent.
```

**Double-page spread** — replace `COMPOSITION`, and set aspect to 3:2 or wider:
```text
A single uninterrupted double-page spread, horizontal, no panel divisions. The mountain face spans the
full width. The climber is one small figure in the lower-left quadrant, no more than 6 percent of the
frame height. The remaining space is mountain, sky, and void. Compose so the eye enters at the figure
and travels the length of the ridge to exit at the far upper-right corner.
```

**Tankōbon cover** — replace `MEDIUM` and `CONSTRAINTS` (this is the one case where limited color is on-model):
```text
A manga tankōbon volume cover. Predominantly the same monochrome ink-and-pencil rendering, but with a
single restrained duotone accent: warm sepia-ochre limited strictly to skin and the alpenglow band on
the snow, everything else left pure black and white. Centred vertical portrait of the climber from the
chest up against a vast pale empty sky, immense negative space above his head, wind lifting his hair.
Leave the upper 20 percent and lower 15 percent of the frame clear of detail as typography safe areas.
Still no text — the type will be added separately.
```

### 4.4 Style-era swaps

| Era | Replace the `LINE LANGUAGE` block |
|---|---|
| **Early run (vol. 1–4)** | Use System A only. Hard-edged brush-and-nib inking throughout, heavier contour weight, blunter blacks, more aggressive screentone coverage, slightly more conventional seinen faces. Rawer, more graphic, less atmospheric. |
| **Late run (vol. 12–17) — default** | Use both systems as written in §2, weighted toward System B. Delicate, semi-transparent pencil-toned rendering dominating; nib line reserved for structural edges. Softer, more luminous, more psychologically interior. |

---

## 5. STANDALONE NEGATIVE / ANTI-SLOP BLOCK

Append verbatim to any variant. GPT Image 2 has no separate negative-prompt field, so state exclusions
as explicit in-prompt constraints.

```text
Do not include: color, sepia, blue tint, or duotone of any kind. Do not use painted or airbrushed grey,
soft gradients, or smooth digital shading — every value must be built from visible marks. Do not include
any text, lettering, speech balloons, sound effects, katakana, kanji, signatures, watermarks, page
numbers, or logos. Do not draw panel borders or gutters. Do not add speed lines, motion streaks, glowing
edges, light bloom, lens flare, bokeh, depth-of-field blur, chromatic aberration, film grain, or vignette.
Do not render in a cel-shaded anime style, with thick uniform outlines, or with flat cartoon fills.
Do not give the character large sparkling eyes, blush marks, moe or chibi features, or stylized
exaggerated proportions. Do not deform the hands: exactly five fingers per hand, correct joints,
mechanically plausible grip on the hold. Do not draw physically impossible equipment: no floating
carabiners, no rope intersecting solid rock, no featureless plate-like crampons, no rubber-gripped
mountaineering axe. Do not add a second climber, a crowd, a helicopter, a road, buildings, or any
modern sport-climbing gym aesthetic. Do not make it photorealistic, 3D-rendered, or photographic.
```

---

## 6. API PARAMETERS AND SETTINGS

```jsonc
{
  "model": "gpt-image-2",
  "prompt": "<§2 master prompt>",
  "size": "2048x3072",        // vertical 2:3 — best for the default splash composition
  "quality": "high",
  "output_format": "png",
  "n": 4                       // generate 3–4 variants and select; do not one-shot
}
```

**Format notes drawn from the current GPT Image 2 specs:**

- Aspect ratios run from 3:1 to 1:3, with native 16:9 and 9:16. At 2K/4K, `5:4`, `4:5`, `3:1`, `1:3`
  and `9:21` are **not** supported — so if you want the ultra-wide spread from §4.3, cap it at
  16:9 or 2:1 rather than 3:1 at high res.
- Suggested by variant: splash `2:3` · spread `16:9` (or 3:2) · cover `2:3` · macro-hands `1:1`
  · manga page `2:3`.
- Up to **16 reference images** can be supplied. Use 2–4, not 16 — see §7.3.
- Text rendering is ~99% accurate in English and >90% in Japanese, which is precisely why the
  no-text constraint must be **explicit**: the model is very willing to add SFX and balloons to
  anything it recognizes as manga, and it will render them convincingly.
- Higher resolution does not repair a weak composition. Fix the composition in the prompt first,
  then upscale.

---

## 7. CRAFT NOTES, FAILURE MODES, ITERATION

### 7.1 The five things that break this style, and the clause that fixes each

| Failure | Why it happens | Fix |
|---|---|---|
| Output looks like smooth greyscale digital painting | "Detailed manga" reads as "render nicely" | Keep the *"every midtone constructed from visible marks… if a value looks smooth it is wrong"* clause near the **top** of the prompt |
| Scratchy, noisy, over-inked mess | "Gritty seinen" is an over-trained cliché | Keep *"disciplined and restrained, every mark placed on purpose"* — restraint is the actual signature, and it must be stated twice |
| Generic pretty anime face | Default manga prior | Force the specific face: narrow eyes, no sparkle, **plump sun-kissed lips with defined vermilion border**, filled-mass eyelashes, threaded hair strands |
| Random katakana and balloons appear | Model recognizes "manga page" | The no-text constraint must be explicit **and** repeated in §5 |
| All four ice types look identical | Model has one "snow" concept | Keep the four-material paragraph with a **distinct mark language named for each** (stipple / bare-paper slivers / fine even stipple / long parallel fracture lines) |

### 7.2 Ordering matters
GPT Image 2 weights early tokens more heavily. Order: **medium → line language → rendering → subject →
setting → lighting → composition → technical → constraints.** If one attribute keeps getting dropped,
move it earlier rather than adding more adjectives to it.

### 7.3 Reference images
Feed 2–4 references, each doing one job, and say what to take from each:
1. a monochrome hatched ink drawing → *"take the mark-making and value construction from image 1"*
2. an alpine climbing photo → *"take the pose, gear and terrain geometry from image 2"*
3. a face/lighting reference → *"take the raking light and facial structure from image 3"*

Never hand it four images and hope. State **change + preserve** explicitly, which is how GPT Image 2's
edit modes are designed to be driven.

### 7.4 Iteration protocol
1. Run §3 short prompt ×4 → pick the composition that works.
2. Feed that image back with the §2 master prompt as an edit, instructing: *"preserve the composition,
   pose, and camera exactly; rebuild all rendering as ink hatching and screentone."*
3. Lock the style, then iterate scene swaps from §4 against the locked look.
4. Only upscale at the end.

### 7.5 Attribution and honest framing
This prompt describes a **technique** — nib and pencil behaviour, hatch geometry, tone density, panel
architecture, alpine and anatomical fact — assembled from published analysis, interviews, and reference
material about a real, living artist's work and about real mountains. It deliberately avoids invoking
any living artist by name, which is both the ethical position and, per OpenAI's own prompting guidance,
the more effective one. If you publish output from it, describe it as *"manga-influenced ink
illustration,"* not as anyone's work.

---

## 8. REFERENCES

72 sources consulted while building this prompt, grouped by what each contributed.
Where a page was unreachable directly, it was consulted through indexed search summaries.

### A. The manga — canon, plot, publication (1–14)
1. [The Climber (manga) — Wikipedia](https://en.wikipedia.org/wiki/The_Climber_(manga))
2. [Kokou no Hito — Wikipedia (redirect)](https://en.wikipedia.org/wiki/Kokou_no_Hito)
3. [Kokou no Hito — MyAnimeList](https://myanimelist.net/manga/7375)
4. [Kokou no Hito — MangaUpdates](https://www.mangaupdates.com/series/dogu4d4/kokou-no-hito)
5. [Kokou no Hito — AniList](https://anilist.co/manga/37375/Kokou-no-Hito)
6. [Kokou no Hito — Anime-Planet](https://www.anime-planet.com/manga/kokou-no-hito)
7. [Kokou no Hito — MangaDex chapter listing](https://mangadex.org/title/bb8310e4-6050-4a43-984e-f7bbdfce23b1/kokou-no-hito?tab=chapters)
8. [Kokou no Hito (Manga) — TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Manga/KokouNoHito)
9. [Kokou no Hito Wiki — Fandom](https://kokou-no-hito.fandom.com/wiki/Kokou_no_Hito_Wiki)
10. [Mori (Katou) Buntarō — Kokou no Hito Wiki](https://kokou-no-hito.fandom.com/wiki/Mori_(Katou)_Buntar%C5%8D)
11. [Buntarou Mori — Comic Vine](https://comicvine.gamespot.com/buntarou-mori/4005-116340/)
12. [Kokō no Hito characters — Comic Vine](https://comicvine.gamespot.com/kokou-no-hito/4050-80580/characters/)
13. [The Climber Manga: Complete Guide for New Readers](https://teachmefirstmanga.com/the-climber-manga-complete-guide/)
14. [The Climber (manga) — Grokipedia](https://grokipedia.com/page/the_climber_manga)

### B. Art-style analysis and criticism (15–26)
15. [Who is Shinichi Sakamoto? — TheCollector](https://www.thecollector.com/who-is-shinichi-sakamoto/)
16. [How to study Shin-ichi Sakamoto — Longstride Illustration](https://longstrideillustration.com/how-to-study-shin-ichi-sakamoto/)
17. [Art and Legacy of Shinichi Sakamoto: A Definitive Deep Dive — India Anime Network](https://indiananimenetwork.com/shinichi-sakamoto/)
18. [Shin-ichi Sakamoto Master Study in Pen and Ink (video)](https://www.youtube.com/watch?v=FMMvRV2ayIw)
19. [Shin-ichi Sakamoto — Wikipedia](https://en.wikipedia.org/wiki/Shin-ichi_Sakamoto)
20. [Shin-ichi Sakamoto — Grokipedia](https://grokipedia.com/page/Shin-ichi_Sakamoto)
21. [SAKAMOTO Shinichi — Innocent Wiki](https://innocent.fandom.com/wiki/SAKAMOTO_Shinichi)
22. [Shinichi Sakamoto — Anime-Planet](https://www.anime-planet.com/people/shinichi-sakamoto)
23. [Shin'ichi Sakamoto — Goodreads author page](https://www.goodreads.com/author/show/8340743.Shin_ichi_Sakamoto)
24. [Who is Shinichi Sakamoto: Creator of Innocent & The Climber — FindingDulcinea](https://findingdulcinea.com/shinichi-sakamoto/)
25. [Discover the Best of Shin'ichi Sakamoto — Walt's Comic Shop](https://waltscomicshop.com/blogs/beyond-the-panels-comics-wiki-reading-orders/discover-the-best-of-shin-ichi-sakamoto-the-climber-innocent-drcl)
26. [Mangakas who use CLIP STUDIO PAINT — Clip Studio Ask](https://ask.clip-studio.com/en-us/detail?id=67970)

### C. Reviews describing the visual experience (27–35)
27. [The Climber Is An Incredibly Beautiful, Devastating Manga About Hubris — Aftermath](https://aftermath.site/the-climber-shin-ichi-sakamoto-seinen-sports-manga-climbing/)
28. [The Climber / Kokou No Hito (The Solitary Person) — sabukaru](https://sabukaru.online/articles/the-climber/kokou-no-hito-the-solitary-person)
29. [Manga Review #1 — Kokou No Hito — Comic Vine](https://comicvine.gamespot.com/profile/yassassin/blog/manga-review-1-kokou-no-hito-the-climber/130645/)
30. [Kokou no Hito (The Climber) — Manga Review — blackwhitemangablog](https://blackwhitemangablog.wordpress.com/2015/10/20/kokou-no-hito-the-climber-manga-review/)
31. [From Loneliness to the Mountains: The Story of Kokou no Hito — Vocal](https://vocal.media/fiction/from-loneliness-to-the-mountains-the-story-of-kokou-no-hito)
32. [Kokou no Hito by Nabeda Yoshiro and Nitta Jiro — Trail Markers](https://sinarubot.wordpress.com/2013/10/02/kokou-no-hito-the-climber-by-nabeda-yoshiro-and-nitta-jiro/)
33. [Before the Best Dracula Manga Ever, Its Creator Released an Underrated Sports Adventure — ComicBook.com](https://comicbook.com/anime/news/best-dracula-manga-creator-the-climber/)
34. [The Climber, Vol. 1 — Goodreads](https://www.goodreads.com/en/book/show/17303566-the-climber-vol-1)
35. ["The Climber," gorpcore in manga — Collater.al](https://www.collater.al/en/the-climber-gorpcore-manga-style/)

### D. English publication (36–39)
36. [VIZ Spring 2025 Publishing Announcements](https://www.viz.com/blog/posts/viz-spring-2025-publishing-announcements)
37. [VIZ announces The Climber and 26 other titles — The Beat](https://www.comicsbeat.com/viz-announces-the-climber-26-other-titles-in-latest-licensing-event/)
38. [VIZ Media Announces New Titles for Spring 2025 — Anime Corner](https://animecorner.me/viz-media-announces-new-titles-for-spring-2025-including-the-climber-one-piece-heroines-ruridragon-and-more/)
39. [The Climber, Vol. 1 — Simon & Schuster](https://www.simonandschuster.com/books/The-Climber-Vol-1/Shin-ichi-Sakamoto/The-Climber/9781974751525)

### E. The real Katō Buntarō (40–44)
40. [Buntarō Katō — Wikidata (Q11399241)](https://www.wikidata.org/wiki/Q11399241)
41. [The heavy snowfall that took the life of Buntaro Kato — Yama-Kei Online](https://en.yamakei-online.com/yama-ya/detail.php?id=3727)
42. [The real reason Kato Buntaro nearly got into trouble on Mt. Hyonosen — Yama-Kei Online](https://en.yamakei-online.com/yama-ya/detail.php?id=4398)
43. [Manifesto of a solo mountaineer — One Hundred Mountains](https://onehundredmountains.blogspot.com/2011/06/manifesto-of-solo-mountaineer.html)
44. [Jika-tabi — Wikipedia](https://en.wikipedia.org/wiki/Jika-tabi)

### F. Manga drawing technique — ink, nibs, hatching, tone (45–54)
45. [Inking — How To Draw Manga, Too Corporation](https://www.too.com/manga/en/inking.html)
46. [Manga Inking Techniques — Mangaka.online](https://www.mangaka.online/become-a-mangaka/manga-inking-techniques/)
47. [Comic Inking Techniques: Brushes, Nibs, Digital Pens, and Hatching Styles — COMICPAD](https://www.comicpad.app/comic-inking-techniques-guide)
48. [Manga Drawing Process: Inking — Mangaka's Journal](http://mangakasjournal.blogspot.com/2009/01/manga-drawing-process-inking-part-1.html)
49. [How To Ink Manga — Cross Hatching Tutorial (video)](https://www.youtube.com/watch?v=wx6n0_YMiWc)
50. [Quick and Easy Ways to Apply Manga Screentones — CLIP STUDIO TIPS](https://tips.clip-studio.com/en-us/articles/6139)
51. [How to Draw Skies for Manga: Brush Material Distribution — CLIP STUDIO TIPS](https://tips.clip-studio.com/en-us/articles/10358)
52. [Manga Screentones Tutorial: Master Shading Without Color — Multic](https://www.multic.com/guides/manga-screentones-tutorial/)
53. [What Is a Screentone? Manga Shading Explained — Gootaku](https://gootaku.com/blog/what-is-screentone)
54. [How Manga Artists Use Screentones for Shading — Engineer Fix](https://engineerfix.com/how-manga-artists-use-screentones-for-shading/)

### G. Faces, panels, and the realist manga lineage (55–62)
55. [Drawing Realistic and Anime Style Eyes — CLIP STUDIO TIPS](https://tips.clip-studio.com/en-us/articles/2629)
56. [How to Draw Anime Eyelashes Step by Step — AnimeOutline](https://www.animeoutline.com/how-to-draw-anime-eyelashes-step-by-step/)
57. [Manga panel layout and comic page composition — Grid Maker Pro](https://gridmakerpro.com/learn/manga-comics-composition/)
58. [Manga Panel Composition: A Guide to Dynamic Storytelling — Mangaka Blog](https://www.mangaka.app/blogs/manga-panel-composition-a-guide-to-dynamic-storytelling)
59. [Urasawa Naoki: An 'Adult' Since He Was Young — The Comics Journal](https://www.tcj.com/urasawa-naoki-an-adult-since-he-was-young/)
60. [Naoki Urasawa and Hisashi Eguchi talk about manga in the 70s and 80s, mostly Otomo — manga brog](https://mangabrog.wordpress.com/2015/05/17/naoki-urasawa-and-hisashi-eguchi-talk-about-manga-in-the-70s-and-80s-mostly-otomo/)
61. [Manben: Behind the Scenes of Manga with Urasawa Naoki / Otomo Katsuhiro — Halcyon Realms](https://halcyonrealms.com/mangacomics/manben-behind-the-scenes-of-manga-with-urasawa-naoki-otomo-katsuhiro/)
62. [Chiaroscuro — Wikipedia](https://en.wikipedia.org/wiki/Chiaroscuro)

### H. Sumi-e, negative space, and Japanese monochrome tradition (63–65)
63. [Sumi-e: All You Need to Know About Japanese Ink Painting — Japan Objects](https://japanobjects.com/features/sumie)
64. [Sumi-e: Japanese Ink Painting and the Art of Empty Space](https://urchinshome.com/blogs/stories/sumi-e-japanese-ink-painting-art-empty-space)
65. [Chiaroscuro Techniques for Painting, Drawing, and Printmaking — Jackson's Art](https://www.jacksonsart.com/blog/2025/05/20/chiaroscuro-techniques-for-painting-drawing-and-printmaking/)

### I. The mountains, the ice, the body, the gear (66–72)
66. [Tsurugi-dake — SummitPost](https://www.summitpost.org/tsurugi-dake/153492)
67. [Tsurugidake — Chinne left ridge — CLIMB JAPAN](https://climbjapan.blogspot.com/2015/09/tsurugidake-chinne-left-ridge.html)
68. [The Kitadake Buttress No.4 ridge — CLIMB JAPAN](https://climbjapan.blogspot.com/2014/10/the-kitadake-buttress.html)
69. [Bottleneck (K2) — Wikipedia](https://en.wikipedia.org/wiki/Bottleneck_(K2))
70. [Rime, hoar and verglas — Abacus Mountain Guides](https://www.abacusmountainguides.com/blog/rime-hoar-and-verglas)
71. [Everest and 8000 m gear discussion — Project Himalaya](https://project-himalaya.com/2016/8000m-everest-gear.html)
72. [What Muscles Are Used in Crimping? — LEDGE Climbing](https://ledgeclimbing.com/blogs/new-stuff/what-muscles-are-used-in-crimping)


### J. GPT Image 2.0 prompting mechanics (73–79)
73. [GPT Image Generation Models Prompting Guide — OpenAI Cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)
74. [GPT Image 2 Prompting Guide and Examples — fal](https://fal.ai/learn/tools/prompting-gpt-image-2)
75. [GPT Image 2 Prompt Guide: 80 Prompts, Review & API Tips — PixVerse](https://pixverse.ai/en/blog/gpt-image-2-review-and-prompt-guide)
76. [The Ultimate GPT Image 2 Prompting Guide — Atlabs AI](https://www.atlabs.ai/blog/the-ultimate-gpt-image-2-prompting-guide-how-to-use-openai%E2%80%99s-best-image-model-2026)
77. [How to Use GPT Image 2: Prompt Guide, Parameters, and Workflow — CometAPI](https://www.cometapi.com/how-to-use-and-prompt-gpt-image-2/)
78. [GPT Image 2 Prompt Cheat Sheet: Formula, Aspect Ratios & Modifiers — Memons](https://memons.ai/gpt-image-2-prompt-cheat-sheet)
79. [GPT Image 2 Anime Style Prompts That Actually Work — Elser AI](https://www.elser.ai/blog/gpt-image-2-anime-style-prompts-that-actually-work)

### Also consulted
[K2 Winter on the Abruzzi — Alan Arnette](https://www.alanarnette.com/2020/12/23/k2-winter-on-the-abruzzi/) ·
[K2 Climbing Routes — Elite Exped](https://www.eliteexped.com/k2-routes-comprehensive-guide) ·
[Mount Tsurugi (Toyama) — Wikipedia](https://en.wikipedia.org/wiki/Mount_Tsurugi_(Toyama)) ·
[Alpine Climbing in Japan: Legends of the Genjiro Ridge — Outdoor Japan](https://www.outdoorjapan.com/activities/outdoors-mountain-sports/climbing-in-japan/alpine-climbing-japan-genjiro-ridge/) ·
[Special moments on Kita-dake Buttress — One Hundred Mountains](https://onehundredmountains.blogspot.com/2009/06/beating-about-buttress.html) ·
[Life and death on Japan's Matterhorn — One Hundred Mountains](https://onehundredmountains.blogspot.com/2010/10/life-and-death-on-matterhorn-of-japan.html) ·
[Mount Kita — Wikipedia](https://en.wikipedia.org/wiki/Mount_Kita) ·
[Blue ice (glacial) — Wikipedia](https://en.wikipedia.org/wiki/Blue_ice_(glacial)) ·
[Frostbite — Wikipedia](https://en.wikipedia.org/wiki/Frostbite) ·
[Frostbite Prevention and Treatment: A Climber's Guide](https://globalsummitguide.com/frostbite-prevention-and-treatment-a-climbers-guide/) ·
[Gear List for 7000 m and 8000 m peaks — Expedition Himalaya](https://www.expeditionhimalaya.com/component/content/article/gear-list-for-7000m-and-8000m-peak?catid=27&Itemid=411) ·
[Muscles Used In Rock Climbing — The Wandering Climber](https://www.thewanderingclimber.com/muscles-used-in-rock-climbing/) ·
[Stunning Images And Tips For Photographing Alpenglow — Light Stalking](https://www.lightstalking.com/alpenglow/) ·
[What Is Alpenglow? — Digital Photography School](https://digital-photography-school.com/what-is-alpenglow/)
