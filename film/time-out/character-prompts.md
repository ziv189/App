# TIME OUT: Character Reference Prompts

There's one prompt per character. They all share the same **Style**, **Framing**, **Lighting** and **Avoid** paragraphs word for word, so the whole cast comes out looking like it belongs in the same movie. Only the face, clothes and pose change.

## How to use them

1. **Use one image model for the whole cast** and keep the same settings every time: vertical 2:3, highest quality.
2. **Attach the character's sketch** from `refs/` as the reference image, then paste their prompt.
3. **Make Glenn first.** Once you have a Glenn you like, attach that image as a *second* reference for everyone else. Each prompt tells the model to copy only the style from it, not the character. This is what keeps the cast consistent.
4. **Brayden needs two images.** Make the regular one first. For war mode, attach your finished regular Brayden instead of the sketch.
5. **Officer Dale has no sketch.** Generate him from the prompt with just your Glenn image attached for style.
6. **Make a few versions of each** and pick the one closest to the sketch. These become the reference images for every shot in `scenes.md`.
7. **If Higgsfield cuts a prompt off**, delete the Avoid paragraph first.

**Two things to watch for once you start making shots:**
- **Props can leak.** Props in these images (Glenn's mug, Marco's vape, Dale's donut) are just for the pose. If one keeps showing up in shots where it shouldn't, add "no mug" (or whatever it is) to that shot's prompt.
- **Shoes can creep back.** The thieves wear shoes here, but they're in socks from Scene 4 on. The shot prompts already say so. If shoes still show up, add "in socks, no shoes."

---

## Glenn Kowalski (the dad)

**Attach:** `refs/glenn-sketch.jpg`

> Full-body character portrait of GLENN KOWALSKI, a worn-out ex-army dad, for a stylized 3D animated feature film.
>
> Reference: the attached pen sketch is this character's face. Match its face shape, hairline, eyebrows, eyes, nose, mouth, teeth, ears and facial hair exactly, and turn the rough drawing into a fully rendered 3D character. If a second image is attached, copy only its rendering style, lighting and colors, never its character.
>
> Face and body: 41 years old, about 5 foot 11. A long oval face. Thick, bushy dark-brown hair, messy on top. Heavy, straight, thick black eyebrows. Big, round, wide-open eyes with small dark pupils, staring like he hasn't blinked in a while. A long straight nose. A full, thick dark beard and mustache covering his cheeks and chin. A huge open-mouthed grin showing crooked, gappy teeth and a bit of tongue: a frozen, too-big smile, like a man who decided years ago to smile through everything. Broad soldier's shoulders gone soft, and a round dad belly.
>
> Clothes: a faded maroon terry-cloth bathrobe hanging open with the belt untied, worn thin at the cuffs. Under it, a faded olive-drab army t-shirt with a small coffee stain on the chest. Metal dog tags on a ball chain around his neck. Blue-and-green plaid flannel pajama pants, a little too long. One red sock and one green sock, no shoes.
>
> Pose and expression: standing relaxed with slumped shoulders and his weight on one leg. One hand holds a plain white coffee mug at chest height, and the other is jammed in his bathrobe pocket. His body looks exhausted, but his face is locked in that wide-eyed frozen grin, staring just past the camera.
>
> Style: stylized 3D animated feature-film look, exaggerated cartoon proportions, big expressive faces, soft global illumination, warm saturated colors. Smooth sculpted forms, soft skin with subtle subsurface scattering, detailed fabric, hair and beard textures, and clean, appealing shapes, like a still from a modern big-studio CG animated movie.
>
> Framing: full-body character portrait, head to toe, centered, with a little empty space above the head and below the feet. Three-quarter view, body turned about 30 degrees to the left, face toward the camera. Camera at the character's chest height with a 50mm lens and no wide-angle distortion. Vertical 2:3 frame.
>
> Lighting and background: soft studio character lighting. A large warm key light from the front left at 45 degrees, a gentle cool fill light from the right, and a thin bright rim light from behind outlining the hair and shoulders. A soft contact shadow under the feet. Plain seamless warm light-grey studio backdrop with a subtle gradient, and nothing else in the frame.
>
> Avoid: photorealism, anime, flat 2D illustration, text, logos, watermarks, extra fingers or limbs, cropped feet, and any props or scenery not described above.

---

## Brayden Kowalski (the brat), regular

**Attach:** `refs/brayden-sketch.jpg` + your finished Glenn image (for style)

> Full-body character portrait of BRAYDEN KOWALSKI, a bratty 4-year-old boy, for a stylized 3D animated feature film.
>
> Reference: the attached pen sketch is this character's face. Match its face shape, hairline, eyebrows, eyes, nose, mouth, teeth, ears and facial hair exactly, and turn the rough drawing into a fully rendered 3D character. If a second image is attached, copy only its rendering style, lighting and colors, never its character.
>
> Face and body: a short, stocky 4-year-old, about 3 foot 4, with a chubby toddler body and an oversized head. A wide, round head that's wider than it is tall. Huge jug ears sticking straight out from the sides. Short, messy dark-brown hair sticking up in tufts on top. Thick, heavy dark eyebrows slanted down toward his nose in a scheming scowl. Small, round, beady eyes with the pupils pushed to one side, glancing sideways. A tiny upturned button nose. An enormous ear-to-ear grin packed with rows of small, jagged, pointy teeth. Rosy, slightly dirty cheeks.
>
> Clothes: a bright green fleece dinosaur onesie with soft orange spikes down the back, a stubby tail, built-in footies, and the hood down. It's grubby: ketchup stains down the chest, grass stains on the knees, and one chewed-up sleeve.
>
> Pose and expression: standing with his feet planted wide and his little fists on his hips, chest puffed out, chin tucked down. His eyes slide sideways toward the camera above that huge jagged grin, like a tiny villain who has already planned something terrible.
>
> Style: stylized 3D animated feature-film look, exaggerated cartoon proportions, big expressive faces, soft global illumination, warm saturated colors. Smooth sculpted forms, soft skin with subtle subsurface scattering, detailed fabric, hair and beard textures, and clean, appealing shapes, like a still from a modern big-studio CG animated movie.
>
> Framing: full-body character portrait, head to toe, centered, with a little empty space above the head and below the feet. Three-quarter view, body turned about 30 degrees to the left, face toward the camera. Camera at the character's chest height with a 50mm lens and no wide-angle distortion. Vertical 2:3 frame.
>
> Lighting and background: soft studio character lighting. A large warm key light from the front left at 45 degrees, a gentle cool fill light from the right, and a thin bright rim light from behind outlining the hair and shoulders. A soft contact shadow under the feet. Plain seamless warm light-grey studio backdrop with a subtle gradient, and nothing else in the frame.
>
> Avoid: photorealism, anime, flat 2D illustration, text, logos, watermarks, extra fingers or limbs, cropped feet, and any props or scenery not described above.

---

## Brayden Kowalski, war mode

**Attach:** your finished regular Brayden image (not the sketch)

> Full-body character portrait of BRAYDEN KOWALSKI in war mode, for a stylized 3D animated feature film.
>
> Reference: the attached image is this exact character. Keep his face, body, proportions and grubby dinosaur onesie exactly the same, and only add what's described below.
>
> Face and body: the same 4-year-old Brayden, with the same jug ears, heavy slanted eyebrows, sideways-glancing beady eyes and huge jagged grin. Two thick, smeared stripes of black camo face paint under each eye.
>
> Clothes: the same grubby green dinosaur onesie. On his head is his dad's adult-size olive-drab army helmet, way too big for him, tipped forward down to his eyebrows, with his jug ears sticking out underneath.
>
> Pose and expression: standing at attention with his chin up and his chest out, snapping a sharp salute with his right hand. The salute has knocked the helmet crooked so it's sliding down over one eye. The same huge jagged grin, eyes glancing sideways at the camera.
>
> Style: stylized 3D animated feature-film look, exaggerated cartoon proportions, big expressive faces, soft global illumination, warm saturated colors. Smooth sculpted forms, soft skin with subtle subsurface scattering, detailed fabric, hair and beard textures, and clean, appealing shapes, like a still from a modern big-studio CG animated movie.
>
> Framing: full-body character portrait, head to toe, centered, with a little empty space above the head and below the feet. Three-quarter view, body turned about 30 degrees to the left, face toward the camera. Camera at the character's chest height with a 50mm lens and no wide-angle distortion. Vertical 2:3 frame.
>
> Lighting and background: soft studio character lighting. A large warm key light from the front left at 45 degrees, a gentle cool fill light from the right, and a thin bright rim light from behind outlining the hair and shoulders. A soft contact shadow under the feet. Plain seamless warm light-grey studio backdrop with a subtle gradient, and nothing else in the frame.
>
> Avoid: photorealism, anime, flat 2D illustration, text, logos, watermarks, extra fingers or limbs, cropped feet, and any props or scenery not described above.

---

## Vince (the "mastermind")

**Attach:** `refs/vince-sketch.jpg` + your finished Glenn image (for style)

> Full-body character portrait of VINCE, a small-time crook who thinks he's a criminal mastermind, for a stylized 3D animated feature film.
>
> Reference: the attached pen sketch is this character's face. Match its face shape, hairline, eyebrows, eyes, nose, mouth, teeth, ears and facial hair exactly, and turn the rough drawing into a fully rendered 3D character. If a second image is attached, copy only its rendering style, lighting and colors, never its character.
>
> Face and body: mid-50s, about 5 foot 6, wiry, with skinny arms and legs and a small gut. An angular face that narrows down to a sharp, pointed chin. A big swoop of spiky jet-black hair, gelled up and swept down over one side of his forehead. Heavy, angled black eyebrows. Shifty eyes that always glance off to the side. A long, pointy nose. A bushy black mustache and a scruffy black goatee on the point of his chin. Big jug ears. Crooked buck teeth showing in a smug smirk.
>
> Clothes: a shiny black leather jacket a size too big, scuffed at the elbows, over a tight black turtleneck. A chunky gold rope chain on top of the turtleneck, and gold aviator sunglasses hooked on the collar. A gold pinky ring. Black slacks and pointy black loafers.
>
> Pose and expression: leaning back with cocky swagger, a laminated sheet of paper tucked under one arm, his other hand pointing a finger-gun at the camera. One eyebrow raised, eyes sliding sideways, smug and completely untrustworthy.
>
> Style: stylized 3D animated feature-film look, exaggerated cartoon proportions, big expressive faces, soft global illumination, warm saturated colors. Smooth sculpted forms, soft skin with subtle subsurface scattering, detailed fabric, hair and beard textures, and clean, appealing shapes, like a still from a modern big-studio CG animated movie.
>
> Framing: full-body character portrait, head to toe, centered, with a little empty space above the head and below the feet. Three-quarter view, body turned about 30 degrees to the left, face toward the camera. Camera at the character's chest height with a 50mm lens and no wide-angle distortion. Vertical 2:3 frame.
>
> Lighting and background: soft studio character lighting. A large warm key light from the front left at 45 degrees, a gentle cool fill light from the right, and a thin bright rim light from behind outlining the hair and shoulders. A soft contact shadow under the feet. Plain seamless warm light-grey studio backdrop with a subtle gradient, and nothing else in the frame.
>
> Avoid: photorealism, anime, flat 2D illustration, text, logos, watermarks, extra fingers or limbs, cropped feet, and any props or scenery not described above.

---

## Marco (the deadpan one)

**Attach:** `refs/marco-and-duane-sketch.jpg` (the **left** face) + your finished Glenn image (for style)

Tip: crop the sketch down to just Marco's face before you attach it, so the model doesn't mix him up with Duane.

> Full-body character portrait of MARCO, a bored, deadpan burglar, for a stylized 3D animated feature film.
>
> Reference: the attached pen sketch is this character's face. Match its face shape, hairline, eyebrows, eyes, nose, mouth, teeth, ears and facial hair exactly, and turn the rough drawing into a fully rendered 3D character. If a second image is attached, copy only its rendering style, lighting and colors, never its character.
>
> Face and body: 30s, about 6 foot 1, lanky and slouched. A long, narrow face. Messy, uncombed dark hair sticking out at odd angles. Heavy-lidded, half-closed eyes that look bored by everything, with dark bags underneath. A few small moles on his cheeks and forehead. A long, thin nose. A huge, bushy black beard that hangs down to a point a few inches below his chin. A slightly open mouth showing crooked, jagged teeth inside the beard. A small silver hoop earring in one ear.
>
> Clothes: a black puffer vest over a black hoodie with the hood down and the sleeves pushed up. Baggy black cargo pants and scuffed black high-top sneakers.
>
> Pose and expression: slouched with all his weight on one leg, one hand shoved in his vest pocket, the other holding a slim vape pen near his mouth with a thin curl of vapor drifting up. A flat, deadpan, totally unimpressed stare straight at the camera.
>
> Style: stylized 3D animated feature-film look, exaggerated cartoon proportions, big expressive faces, soft global illumination, warm saturated colors. Smooth sculpted forms, soft skin with subtle subsurface scattering, detailed fabric, hair and beard textures, and clean, appealing shapes, like a still from a modern big-studio CG animated movie.
>
> Framing: full-body character portrait, head to toe, centered, with a little empty space above the head and below the feet. Three-quarter view, body turned about 30 degrees to the left, face toward the camera. Camera at the character's chest height with a 50mm lens and no wide-angle distortion. Vertical 2:3 frame.
>
> Lighting and background: soft studio character lighting. A large warm key light from the front left at 45 degrees, a gentle cool fill light from the right, and a thin bright rim light from behind outlining the hair and shoulders. A soft contact shadow under the feet. Plain seamless warm light-grey studio backdrop with a subtle gradient, and nothing else in the frame.
>
> Avoid: photorealism, anime, flat 2D illustration, text, logos, watermarks, extra fingers or limbs, cropped feet, and any props or scenery not described above.

---

## Duane (the big one)

**Attach:** `refs/marco-and-duane-sketch.jpg` (the **right** face) + your finished Glenn image (for style)

Tip: crop the sketch down to just Duane's face before you attach it.

> Full-body character portrait of DUANE, a huge, soft-hearted burglar, for a stylized 3D animated feature film.
>
> Reference: the attached pen sketch is this character's face. Match its face shape, hairline, eyebrows, eyes, nose, mouth, teeth, ears and facial hair exactly, and turn the rough drawing into a fully rendered 3D character. If a second image is attached, copy only its rendering style, lighting and colors, never its character.
>
> Face and body: 30s, a towering 6 foot 6, wide and soft, with a big round belly, huge hands and thick legs. Bald and shiny on top with short dark hair on the sides, and worry lines across his forehead. Big, round jug ears. Droopy, sad puppy-dog eyes with heavy bags, and eyebrows tilted up in the middle with worry. A few small moles on his cheeks. A long nose. A thick, full, bushy black beard. A nervous, open-mouthed grin showing crooked teeth.
>
> Clothes: a grey hoodie stretched tight over his belly, the sleeves too short for his arms. Khaki cargo shorts. A neon-green fanny pack around his waist. White tube socks pulled up high and beat-up white sneakers.
>
> Pose and expression: standing a little hunched and timid despite his size, shoulders raised, knees turned slightly in, wringing his huge hands together in front of his belly. A nervous, hopeful grin and worried eyes looking at the camera.
>
> Style: stylized 3D animated feature-film look, exaggerated cartoon proportions, big expressive faces, soft global illumination, warm saturated colors. Smooth sculpted forms, soft skin with subtle subsurface scattering, detailed fabric, hair and beard textures, and clean, appealing shapes, like a still from a modern big-studio CG animated movie.
>
> Framing: full-body character portrait, head to toe, centered, with a little empty space above the head and below the feet. Three-quarter view, body turned about 30 degrees to the left, face toward the camera. Camera at the character's chest height with a 50mm lens and no wide-angle distortion. Vertical 2:3 frame.
>
> Lighting and background: soft studio character lighting. A large warm key light from the front left at 45 degrees, a gentle cool fill light from the right, and a thin bright rim light from behind outlining the hair and shoulders. A soft contact shadow under the feet. Plain seamless warm light-grey studio backdrop with a subtle gradient, and nothing else in the frame.
>
> Avoid: photorealism, anime, flat 2D illustration, text, logos, watermarks, extra fingers or limbs, cropped feet, and any props or scenery not described above.

---

## Officer Dale (cameo)

**Attach:** your finished Glenn image (for style only; Dale has no sketch)

> Full-body character portrait of OFFICER DALE, a bored suburban cop, for a stylized 3D animated feature film.
>
> Reference: there's no sketch for this character, so build him from the description below. If an image is attached, copy only its rendering style, lighting and colors, never its character.
>
> Face and body: 50s, about 5 foot 10, heavyset with a round belly. A round, ruddy face with red cheeks and a red nose. Tired, droopy, half-lidded eyes. A huge grey walrus mustache that covers his whole upper lip. Short grey hair under his cap.
>
> Clothes: a navy-blue police uniform shirt with a plain gold badge and plain shoulder patches with no department name, the buttons straining over his belly. A navy police cap. Navy uniform trousers, a black duty belt with a radio and handcuffs, and polished black shoes.
>
> Pose and expression: leaning back with one thumb hooked in his belt, holding a half-eaten pink-frosted donut with sprinkles in his other hand, mid-chew, with a bored, seen-it-all expression.
>
> Style: stylized 3D animated feature-film look, exaggerated cartoon proportions, big expressive faces, soft global illumination, warm saturated colors. Smooth sculpted forms, soft skin with subtle subsurface scattering, detailed fabric, hair and beard textures, and clean, appealing shapes, like a still from a modern big-studio CG animated movie.
>
> Framing: full-body character portrait, head to toe, centered, with a little empty space above the head and below the feet. Three-quarter view, body turned about 30 degrees to the left, face toward the camera. Camera at the character's chest height with a 50mm lens and no wide-angle distortion. Vertical 2:3 frame.
>
> Lighting and background: soft studio character lighting. A large warm key light from the front left at 45 degrees, a gentle cool fill light from the right, and a thin bright rim light from behind outlining the hair and shoulders. A soft contact shadow under the feet. Plain seamless warm light-grey studio backdrop with a subtle gradient, and nothing else in the frame.
>
> Avoid: photorealism, anime, flat 2D illustration, text, logos, watermarks, extra fingers or limbs, cropped feet, and any props or scenery not described above.

---

## Optional: the whole cast lineup

Do this last, once every character is approved. It's a quick check that everyone matches in style and size, and it makes a good extra reference for group shots.

**Attach:** your finished image of every character (use regular Brayden)

> Group lineup of six characters for a stylized 3D animated feature film, using the attached images. Keep every character exactly as they look in their image: same face, body, clothes and colors.
>
> Order, left to right: BRAYDEN, GLENN, VINCE, MARCO, DUANE, OFFICER DALE. All standing side by side, full body, facing the camera, feet on the same floor line, arms relaxed at their sides, no props.
>
> Relative heights must be correct: Brayden is tiny, with the top of his head level with Glenn's waist. Vince is short at 5 foot 6. Dale is 5 foot 10. Glenn is 5 foot 11. Marco is 6 foot 1. Duane towers over everyone at 6 foot 6.
>
> Style: stylized 3D animated feature-film look, exaggerated cartoon proportions, big expressive faces, soft global illumination, warm saturated colors. Smooth sculpted forms, soft skin with subtle subsurface scattering, detailed fabric, hair and beard textures, and clean, appealing shapes, like a still from a modern big-studio CG animated movie.
>
> Framing: wide horizontal 16:9 frame with everyone fully in shot from head to toe and a little space around the group. Camera at Glenn's chest height with a 50mm lens and no wide-angle distortion.
>
> Lighting and background: soft studio character lighting. A large warm key light from the front left at 45 degrees, a gentle cool fill light from the right, and a thin bright rim light from behind outlining the hair and shoulders. A soft contact shadow under the feet. Plain seamless warm light-grey studio backdrop with a subtle gradient, and nothing else in the frame.
>
> Avoid: photorealism, anime, flat 2D illustration, text, logos, watermarks, extra fingers or limbs, cropped feet, and any props or scenery not described above.
