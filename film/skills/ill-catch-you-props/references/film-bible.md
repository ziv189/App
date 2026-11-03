# I'll Catch You: Film Bible

The single source of truth for every prompt in this production. Every skill in the suite carries a copy of this file. Read only the sections your task needs.

## Contents
1. The film
2. The pipeline (asset-first, no 3D)
3. Higgsfield settings
4. Style lock (paste verbatim)
5. Texture budget
6. Lighting locks
7. Words the models take literally
8. Face maps
9. Ages and wardrobe
10. The lights
11. Flat people
12. Props and heirlooms
13. Locations
14. Palette
15. Personalities (for video prompts)
16. Known risks and the fixes that work
17. Asset register

---

## 1. The film

**I'll Catch You** (German title: *Ich fang dich auf*). A wordless animated short, about 2:40, in cinematic 21:9 widescreen, ten scenes. Van Gogh-style world, Picasso-style characters. No dialogue. Apart from sound effects, the only sound that matters is a five-note hummed melody that falls and then rises on its last note. It is composed and recorded separately, never generated.

**Story:** two small lights play in a swirling sky before they are born. The amber one goes first and becomes the mother who catches the little one at birth. A lifetime later, the daughter is caught again in the sky, and becomes the brave one for a new little light.

**The idea:** the people who love us go first, into the world and out of it, so they can catch us. One day we go first for someone else.

**Visual rules of the story**
- You get your face by being seen. A newborn's face is a smooth unfinished oval until someone looks at it with love; under that gaze it builds itself.
- People nobody really looks at go flat: gray cut-out silhouettes in strict side profile.
- Love sees every side and every age at once. That is why the faces are cubist. At the two biggest moments (scenes 7 and 9) a face shows every age at once.
- The world feels what they feel. Brushstrokes swirl faster with joy and stop completely in grief (scene 8). In grief the world and her skin turn blue; only her hair, her cardigan and her amber eye keep their warmth.
- One shape runs through the film: a crescent curled around a dot, like an arm around a baby's head.

**Scenes**

| # | Title | What happens |
|---|---|---|
| 1 | Two Lights | Act One, the sky. Two small lights play in a swirling night sky. A world of wheat fields and lit windows lies far below. |
| 2 | Going First | A downward spiral opens. The amber light lets go and drifts down. The little light waits alone and grows dim, sees one amber window, hears five notes, lets go. |
| 3 | The Catch | The little light drifts down through night, dawn and morning into a pair of arms at birth. The mother's crescent-shaped mark. The baby's face builds under her gaze. |
| 4 | Jump | Act Two, the world. The garden wall. The toddler, then the girl, jump; the mother always catches. |
| 5 | The Wrong Side of the Wall | The teenager jumps off the other side and walks away. In her eyes her mother is flat. The mother's open arms slowly come down. |
| 6 | The Flat City | A rainy night city of flat people. She is flattening. A stranger looks at her and she unfolds. Time passes. A small light falls into her arms. She hums the five notes without meaning to. |
| 7 | All of Her | She comes home with her baby. Her old mother opens the door. She sees her whole, every age at once, remembers, and falls into her arms. |
| 8 | Going First, Again | She catches her mother now. One night her mother hums the five notes and the last note never comes. The amber light rises. The world stops and turns blue. |
| 9 | Jump, Again | Act Three, all at once. Her child's off-key humming starts the world again. Time passes. Old, she catches her grandchild jumping from the wall. Her family sees every age of her. She isn't afraid. |
| 10 | I'll Catch You | Her light rises and is caught by the amber light. The last note finally sounds. They play. A new little light appears, and she becomes the one who goes first. End card: crescent and dot, then the title. |

---

## 2. The pipeline (asset-first, no 3D)

**Asset-first:** the quality of the image inputs decides the quality of the film. If the inputs are unclear, sloppy or inconsistent, the film will be too. Image inputs are the style frames, character sheets, prop sheets, background plates and effect sheets.

**No 3D.** Where the Higgsfield team used a Blender previs to control a shot, this production uses keyframes (painted start and end frames), rough hand-drawn layout sketches, and screenshots of good takes.

**Gates, in order.** Gates 1 and 2 start from text alone (Soul 2.0). From gate 3 on, each gate attaches approved images from the earlier gates (Seedream 5.0 Pro).
1. Style frames (5): the look. Make nothing else until all five feel like the same film.
2. Hero faces (2): one close-up of the mother, one of the daughter. Make many takes and keep one of each.
3. Lineups: each of them at every age, built from her hero face.
4. Character sheets: turnarounds, expressions, poses, special states.
5. Props: only the ones that recur.
6. Background plates.
7. Effects.
8. Test stage: put approved assets straight into short video tests before production. Whatever breaks here becomes a project rule.
9. Keyframes for the shots that need control.
10. Video shots.

**Canon folder.** Put only approved images in it, and attach only canon images as references. If you attach an image that has drifted, every image made from it inherits the mistake.

**Fix, don't re-roll.** When an image is 90% right, fix the one wrong detail with an edit or by hand instead of running the prompt again.

**Read every prompt before pasting it.** Claude organizes the information, but check that the details match the design before you generate.

**Hand-finish pass** on every approved asset. This is what made the Higgsfield team's characters and backgrounds look like one film.
- Correct the color toward the palette. Raise saturation and brightness if the take came out dull.
- Paint back any missing locked detail: the crescent-shaped mark, the blue plane, the amber fleck.
- On characters, paint a slightly uneven brushed contour line by hand. It ties the clean cubist people to the painted world without putting texture on them.
- Check the never-change list before the image goes into canon.

---

## 3. Higgsfield settings

- **Made from text alone: Soul 2.0.** Soul 2.0 can't take image inputs, so it makes the images that start from nothing: the five style frames and the two hero faces. Cinema Studio, Soul 2.0, paste the prompt, set the aspect ratio, batch of 4, generate. Compare the four, keep the best, and borrow details from the others with an edit.
- **Anything that must match an approved image: Seedream 5.0 Pro,** with the canon images attached. That covers every sheet, plate, prop and effect after the hero faces, every edit and variant, and every keyframe. The Higgsfield team split the work the same way: Soul 2.0 for the first designs, Seedream 5.0 Pro (their tutorial transcript calls it "Cream 5.0 Pro") whenever they attached the approved car. If Seedream drifts, try Nano Banana Pro with the same prompt and attachments.
- **If Soul 2.0 pulls the cubist faces toward realism** or a plastic 3D look after a few batches, try the same text-only prompt in Nano Banana Pro and compare. Decide during the style-frame gate.
- **Aspect ratio:** the film is 21:9 widescreen. Every background, keyframe and video is 21:9, so check the setting before every generation. Sheets, portraits and the style frames use the ratio listed in the asset register.
- **Resolution:** the highest available.
- **Video:** attach the assets as image inputs, and keyframes as start and end frames where the video model supports them. Use a video model that can generate at 21:9.
- Higgsfield's lineup changes often. Test any new model against the approved style frames before switching mid-production.

---

## 4. Style lock (paste verbatim)

These exact sentences go into prompts. Changing the wording changes the look, so copy them and don't paraphrase. If Higgsfield refuses an artist's name, delete just the name; the description carries the style on its own.

**WORLD**
> Hand-painted oil environment in the style of Vincent van Gogh's late landscapes: thick impasto paint, long rhythmic brushstrokes that follow every form, skies built from swirling curved dashes, cypress trees like dark green flames, wheat fields of rippling ochre and gold strokes, visible canvas weave. Bold complementary color pairs, cobalt against chrome yellow and viridian against vermilion. Clear, readable shapes: the strokes describe the forms instead of burying them in noise. No smooth gradients, no photographic detail, no hard geometric shapes in the landscape.

**CHARACTERS**
> Characters designed in the style of Pablo Picasso's cubist portraits: each face shows the front view and the profile at the same time, built from a few flat planes of matte color separated by bold dark contour lines. Simplified, slightly elongated bodies, large gentle hands, flat matte paint with only a faint brush texture, clean edges. No swirling brushwork and no heavy texture on the characters, no soft shading, no realism, no plastic 3D look. Warm, gentle and appealing, never grotesque: exactly two eyes, one nose and one mouth per face, five fingers on each hand.

**OBJECTS** (things a character wears or holds)
> Painted like the film's cubist characters: simple shapes built from flat planes of matte color with bold dark contour lines, faint brush texture, clean edges. No swirling brushwork, no heavy texture, no realism, no plastic 3D look.

**LIGHTS**
> The lights are small glowing points painted in thick luminous brushstrokes, like stars in a Van Gogh night sky: a bright core with a soft ring of short curved paint dabs around it. Painted light, not a lens flare and not a CGI glow. The lights have no faces and no bodies.

**FLAT PEOPLE**
> Unseen people are flat cut-out silhouettes seen only in strict side profile: one flat shade of cool gray with a darker gray outline and a visible paper grain, no color, no volume, no facial features beyond the outline, a slight drop shadow beneath the edge. No scissors, no hands holding them, no craft table.

**MIX** (any image with both a place and people)
> The world is painted in thick Van Gogh impasto; the people are painted in clean, flat cubist planes. Keep them separate: no swirling strokes on the people, no geometric planes in the landscape. All the texture lives in the world.

**NEGATIVE** (end of every image prompt)
> No text, letters, labels, numbers, captions, watermark, signature or picture frame anywhere in the image. No photorealism, no 3D render, no anime, no flat vector illustration.

**CONSISTENCY LINE** (whenever character sheets, prop sheets or plates are attached)
> Use the attached reference images as the exact design. Characters, environments and props 100% match the reference images: the same face maps, proportions, colors and clothing.

**STYLE FRAME LINE** (whenever a style frame is attached: style frames guide the paint, never the design or the layout)
> Image [N] is a style frame, for the paint only: match its paint handling, brushwork and colors; don't copy its composition.

---

## 5. Texture budget

From the Higgsfield team's taxi lesson: a heavily textured prop on a heavily textured background is two dense textures fighting in every frame, and it falls apart in motion ("like a PNG stretched over 3D geometry"). Their fix: the moving thing went clean and the paint stayed in the world.

- **The world** (skies, fields, walls, rooms, streets): full impasto.
- **Characters:** clean flat planes, faint brush texture only.
- **Things a character wears or holds** (the dress, the blanket, the cardigan, the scarf, the bag, the oranges): painted like the characters, clean.
- **Things that belong to a place** (the wall, the door, the window): painted like the world.
- **The lights:** a simple bright core and a soft ring. The sky around them carries the strokes.

If a test shows texture crawling or smearing on something that moves, take texture off the moving thing, never off the world.

---

## 6. Lighting locks

From the Higgsfield team's golden-hour lesson: flat midday light made everything dull, while low warm light with long shadows gave volume and depth and became their formula. Generate each location in the world style, then paste that location's lighting lock into the prompt, word for word, every time.

| Lock | Where | Paste this |
|---|---|---|
| L-SKY | Sky in scenes 1 and 2; scene 10 before the catch | Night. The only light comes from the stars and the glowing lights: cool cobalt shadows, warm gold highlights. |
| L-DAWN | Birth room, scene 3 | Dawn. The first gold light comes through a small window on the left; the rest of the room is in soft cool shadow. |
| L-GOLD | Garden, scene 4 | Golden late afternoon. Low warm sun from the left, long soft shadows, warm gold light on every edge. |
| L-OVERCAST | Garden, scene 5 | Overcast evening. Soft cool gray-violet light from the left, faint shadows. |
| L-RAIN | City, scene 6 | Night rain. Warm pools of gas-lamp light; everything else muted cool gray-blue. |
| L-AUTUMN | Garden, scene 7 | Autumn late afternoon. Low warm sun from the left, long shadows, falling leaves catching the light. |
| L-WINDOW | Cottage at night, scenes 8 to 10 | Night. One small warm lamp inside, cool blue moonlight through the window. |
| L-GRIEF | Scene 8, after the light leaves | Night in deep blues and blue-greens. No warm light anywhere. |
| L-EVENING | Garden, scene 9 | Warm early-summer evening. Low gold sun from the left, long gentle shadows. |
| L-HOME | Scene 10 after the catch, end card | Night that glows warm: gold and amber light spreading from the center of the sky. |

In every garden plate, the key light comes from the left.

---

## 7. Words the models take literally

From the Higgsfield team's explosion lesson: "mushroom-shaped explosion" gave them an explosion with an actual mushroom in it. Name shapes and materials, not loaded nouns.

| Avoid | It may give you | Write instead |
|---|---|---|
| crescent (on its own) | the moon | crescent-shaped mark, or crescent-shaped glow, horns pointing up (in sky shots add: not the moon) |
| cradle | a baby crib | curved like an arm holding a baby; horns pointing up |
| soul | ghosts, angels | small glowing light |
| halo | an angel ring | a soft ring of short curved paint dabs |
| whirlpool | water | a downward spiral of brushstrokes in the sky |
| falling star, comet, meteor | fire and smoke | drifting down, trailing a soft streak of paint |
| paper cut-out | scissors, hands, a craft table | flat cut-out silhouette, plus the FLAT PEOPLE block |
| flat (on its own) | the whole image goes flat | flat gray cut-out silhouette, and say the world stays fully painted |
| Blue Period, Picasso (in world prompts) | Picasso paintings or cubist shapes in the landscape | painted only in shades of blue, monochrome |
| Starry Night, or any painting title | a copy of that painting | describe the sky in your own words |
| frozen | ice and snow | completely still, every brushstroke stopped mid-swirl |
| mosaic | tiles | fitted together into one face, each plane showing a different age |
| blank face, faceless | a horror mask | a smooth unfinished oval with no features yet, soft and peaceful |
| humming | an open singing mouth | humming with lips closed |

---

## 8. Face maps

Cubist faces drift more than any other style, because the model reinvents the fracture on every take. So each face is fixed. "Her right" means the character's own right, which is screen-left in a front view.

In image prompts, paste the block verbatim. In video prompts, don't describe faces at all: the attached references carry them.

**THE MOTHER (the split face)**
> THE MOTHER: a tall, gentle oval face split vertically down the middle into two warm halves: her right half (screen-left) a deeper ochre-brown plane, her left half (screen-right) a light rose-peach plane. Both eyes face forward: large dark almond-shaped eyes under fine dark brows, one in each half. Just under her left eye (screen-right), on the light half of her cheek, a small glowing amber crescent-shaped mark, horns pointing up, about as wide as the eye. Her nose is drawn as a single line along the split. Small full red lips. Copper-auburn hair parted in the middle and gathered into two large round buns, one at each side of her head, just behind the ears. She always wears blue.

Never changes: the split into a deeper ochre-brown half (her right, screen-left) and a light rose-peach half (her left, screen-right) · both eyes facing forward · the amber crescent-shaped mark under her left eye, on the light half · copper-auburn hair in two round side buns · blue clothes.

**THE DAUGHTER (the blue half)**
> THE DAUGHTER: a soft oval face split vertically down the middle. Her right half (screen-left) is pale cream-peach, with a dark brown eye. Her left half (screen-right) is a clear medium-blue plane, and the eye in it is amber. Both eyes face forward under bold dark brows. Her nose is drawn as a single line along the split. Small mouth. Deep brick-red auburn hair, darker and redder than her mother's copper; white in old age.

Never changes: the blue left half (screen-right) with the amber eye in it · the cream-peach right half with the dark brown eye · the nose line along the split · deep auburn hair. From scene 9 only: a small amber crescent-shaped mark under her right eye, on the cream half, smaller than her mother's.

**THE PARTNER (the two-level eyes)**
> THE PARTNER: a squarish face seen from the front, split horizontally at the eye line, olive green above and terracotta below. Both eyes face forward at clearly different heights, his right eye (screen-left) lower. A long nose drawn in profile, pointing to screen-right. Short curly black hair, white in old age. Navy peacoat and dark green scarf.

Never changes: the horizontal split · olive over terracotta · the uneven eyes.

**THEIR CHILD (the mix)**
> THEIR CHILD: a round face seen from the front, both eyes forward, a small nose in profile pointing to screen-right. Warm peach face with a small olive plane on the chin and a small pale-blue plane on the left cheek. Dark curly hair. As a small child, a red jumper.

**THE GRANDCHILD (the little one)**
> THE GRANDCHILD: a small round face with big front-facing eyes and a tiny nose in profile; warm peach face with a little pale-blue plane on the forehead; short dark-auburn hair with one curl on top. Wears a sunflower-yellow toddler smock dress with a round collar and one patched pocket.

**Age adds facets.** Newborns start as a smooth unfinished oval. Childhood faces have a few large planes; the teenager's are sharp and clashing; adults have five or six; old faces are divided into many small facets. The split, the eyes and the marks never move. Only the number of facets, the hair and the clothes change.

---

## 9. Ages and wardrobe

| Who | Age | Scenes | Hair | Clothes |
|---|---|---|---|---|
| Mother | early 30s | 3, 4 | copper-auburn, two round side buns | cobalt-blue dress, sleeves pushed up, barefoot |
| Mother | late 40s | 5 | the same two side buns, one silver streak | faded cobalt dress, work apron |
| Mother | mid-60s | 7, 8 | silver-white, the same two side buns | blue knitted cardigan with wooden buttons over a gray dress |
| Daughter | newborn | 3 | none | cream knitted blanket with one pale-blue border stripe |
| Daughter | 2 | 4 | short auburn curls | sunflower-yellow smock dress, round collar, one patched pocket; bare feet |
| Daughter | 7 | 4 | two short auburn bunches | yellow pinafore over a white shirt, scuffed knees, sandals |
| Daughter | 16 | 5 | short asymmetrical cut | charcoal hoodie, black trousers, scuffed boots, olive canvas duffel bag |
| Daughter | 25 | 6 | long, wavy deep auburn, center part | gray wool coat, mustard scarf |
| Daughter | 30 | 6, 7 | auburn, tied back | mustard coat |
| Daughter | 34 | 8 | auburn, low bun | ochre cardigan |
| Daughter | 75 | 9, 10 | white bun | her mother's blue cardigan, her own mustard scarf |
| Partner | 27 | 6 | curly black | navy peacoat, dark green scarf |
| Partner | 75 | 9 | curly white | navy cardigan |
| Their child | newborn | 6 | none | the cream blanket |
| Their child | 4 | 9 | dark curls | red jumper |
| Their child | 45 | 9 | dark curls going gray | plain dark clothes |
| Grandchild | 3 | 9 | dark auburn, one curl on top | the heirloom yellow smock dress |

**Color logic:** the mother always wears blue, the color of her daughter's light. The daughter wears yellow and mustard, the warmth of her mother's amber, except as a teenager and when she goes flat. Auburn is the family hair: the mother's is copper, the daughter's a deeper brick red. In scene 8 (SF4) the world and the daughter's skin turn blue, while her auburn hair, her ochre cardigan and her amber eye keep their warm colors.

---

## 10. The lights

| Light | Who | Look |
|---|---|---|
| Amber | the mother before birth and after death | a crescent-shaped glow, horns up, amber core, a warm gold ring of dabs, trailing small amber dabs; about twice the size of the little light |
| Pale | the daughter | a small round pale blue-white glow with a flickering edge |
| Pale, after a lifetime | the daughter in scene 10 | same size and shape, warm white core with an amber rim |
| Green-tinted | the daughter's child, falling in scene 6 | a small round glow with a faint green tint |
| Lilac | the new light in scene 10 | a tiny, faint lilac-white glow, trembling |

The lights show feeling only through brightness, size and motion. Laughing is a bright flare with a ring. Fear is shrinking and dimming. Letting go stretches the light into a soft streak. The lights move on curves, never in straight lines.

---

## 11. Flat people

Anyone nobody really looks at: the city crowd, the mother as her teenage daughter sees her (scene 5), the daughter in the city before he looks at her, and the partner before he looks up. Strict side profile, one flat gray, a darker outline, paper grain, a slight drop shadow. Each flat silhouette must still be recognizably that person (her two buns and apron, her coat and scarf).

Unfolding is flattening in reverse: color seeps in, the planes turn outward, the full cubist face returns. The mustard scarf's color is the first thing to come back.

---

## 12. Props and heirlooms

Build a sheet only for props that recur and must match from shot to shot. That is the Higgsfield team's rule. Describe one-off props in the shot prompt instead.

| Code | Prop | Recurs | Painted like | Notes |
|---|---|---|---|---|
| PR1 | the garden wall | scenes 4, 5, 7, 9 | the world | low dry fieldstone, about 1.2 m (twice a toddler's height), worn flat top a child can walk along, moss in the cracks, a tuft of wheat at its foot. Same stones and same height always. |
| PR2 | the cottage door | 5, 7 | the world | weathered wood painted faded blue, iron latch, worn stone step, climbing rose beside it |
| PR3 | the window | 2, 8, 9, 10 | the world | deep-set, wooden frame, a small window seat. From outside at night it glows warm amber: the window the little light sees from the sky in scene 2. |
| PR4 | the yellow dress | heirloom: 4, 9 | the characters | sunflower-yellow toddler smock, round collar, one patched pocket. The daughter at 2, the grandchild at 3. |
| PR5 | the cream blanket | heirloom: 3, 5, 6, 7 | the characters | cream knit, one pale-blue border stripe. Optional thread: the teenager packs it, wraps her own baby in it, and her mother recognizes it. |
| PR6 | the duffel bag | once: 5 | the characters | olive canvas, brown leather strap, brass buckle. Sheet optional. |
| PR7 | the bag of oranges | once: 6 | the characters | brown paper bag, bright oranges rolling on wet cobblestones, the only warm color in the flat city. Sheet optional. |
| PR8 | the blue cardigan | heirloom: 7, 8, 9 | the characters | blue knit, wooden buttons, slightly stretched pockets. The mother in her 60s, then the daughter at 75. |
| PR9 | the mustard scarf | 6, 9 | the characters | long mustard wool, fringed ends. Drained to gray when she is flat; its color returns first when she unfolds. |

---

## 13. Locations

| Codes | Location | Lighting lock | Notes |
|---|---|---|---|
| BG1 to BG4, BG17 | the sky | L-SKY, L-HOME | No ground. Swirls of cobalt and gold; a calm eye at the center of a great swirl. Never a copy of a famous painting. |
| BG5 | the world from above | L-SKY | Wheat fields, cypresses, a small village with a church spire; one cottage window glows amber. |
| BG6 | the fall | its own gradient | Tall plate: night blue at the top, dawn violet, morning gold at the bottom; birds as single dark strokes. |
| BG7 | the birth room | L-DAWN | Whitewashed walls in visible strokes, a wooden bed, a small deep-set window on the left. |
| BG8 to BG12 | the garden and wall | L-GOLD, L-OVERCAST, L-AUTUMN, L-GRIEF, L-EVENING | The garden side of the wall in the foreground, the wheat field beyond, two cypresses, the cottage door. Key light from the left. BG8 is the base plate; make the other seasons and states as edits of it so the wall, door and trees stay identical. |
| BG13 | the cottage at night | L-WINDOW | The window with its seat, a worn armchair, a dim lamp, the night sky through the glass. |
| BG14 to BG16 | the city | L-RAIN | Tall narrow buildings, gas lamps, wet cobblestones with long swirling reflections; an apartment window looking out to a long road into the countryside. |

---

## 14. Palette

Hex codes are for checking and grading only. Keep them out of prompts, because image models sometimes paint them into the picture as text. In prompts, use the color names. The character colors below were sampled from the approved hero faces (HF1, HF2) and from SF3 and SF4.

- **Sky and lights:** Midnight #0E1A3D · Cobalt #23449A · Swirl blue #5B86C5 · Star gold #F2C14E · Cream light #FFF2C6 · **Amber #F5A623 (the key color of the film)** · Amber glow #FFC46B · Pale light #DDEBFF · Green-tinted light #E4F5E0 · Lilac light #EEE6FF
- **Earth:** Wheat #E8B33A · Deep ochre #C98A1E · Field green #6E8B3D · Cypress #1F3B2D · Vermilion #D9482B
- **Faces:** Mother's light half #E6A38C · Mother's dark half #96561A · Daughter's cream half #EBC296 · Daughter's blue half #3680B5 (lift HF2's grayer #547C94 toward it) · Partner olive #8A9A5B · Partner terracotta #C9714F · Contour ink #2B1E1A
- **Hair and clothes:** Mother's copper-auburn #964617 · Daughter's brick-red auburn #782414 · Mother's cobalt #394886 · Heirloom yellow #F2B233 · Mustard scarf #B9893C · Ochre cardigan #AA6622 · Daughter's gray coat #767269 · Cardigan blue #3E5F99 · Charcoal #3B3D42 · Blanket cream #EFE6D2
- **Flat world:** Paper gray #959090 · Gray outline #5E636B · Wet street #2A3140
- **Grief (scene 8):** #1E3557 · #2F4F7A · #6B8DB5 · #A9BFD9 · her skin #71A5EF
- **Sheet background:** plain warm off-white paper #F4EEE3

---

## 15. Personalities (for video prompts)

Video prompts describe personality and quality, not looks; the references carry the looks.

- **The amber light:** bold, playful, protective. Always a little ahead, always turning back to wait.
- **The little light (the daughter):** timid and curious. Flickers when scared, flares bright when it laughs.
- **The mother:** calm, tender, endlessly patient. Her arms are always open. She moves with unhurried warmth.
- **The daughter:** at 2, fearless and wobbly. At 7, joyful and fast. At 16, sharp, guarded and proud. At 25, lonely and folded in. As a young mother, stunned by love. At 75, calm and unafraid.
- **The partner:** shy, kind, a little clumsy. He notices people.
- **Their child:** small and earnest. Hums everything wrong.
- **The grandchild:** brave and wobbly, exactly like the daughter at 2.
- **Flat people:** hurried and mechanical. They never look at anyone.

---

## 16. Known risks and the fixes that work

Lessons from the Higgsfield team's test stage, translated to this film:

- **The performance gap.** Video models handle big action (jumping, catching, spinning, rising) far better than small acting (a glance, a realization, a face breaking into tears). This film is full of small acting, so plan for it:
  - one emotional beat per shot;
  - write the holds in seconds;
  - give the model a start keyframe and an end keyframe showing the two expressions;
  - let the world carry the feeling: strokes speeding up, stopping, color draining;
  - keep acting shots medium-close rather than extreme close-ups;
  - keep hands away from fiddly objects.

  The riskiest shots are the face building (scenes 3 and 6), the teenager's glance back (5), the face breaking (7), the last hum (8) and the two all-ages faces (7 and 9). If video generation won't hold the face building or the all-ages faces, build them as painted stills and dissolves in the edit.
- **Empty frames attract strangers.** In their tests, random people appeared whenever no character was in frame. Every shot without people gets: "No people, no figures and no faces anywhere." Shots of the lights also get: "The lights have no faces."
- **Every reference must agree.** When they used a screenshot to lock a camera angle, a detail missing from the screenshot (her headphones) disappeared from every take. Before you attach a screenshot or keyframe, check it against the never-change lists and paint back anything missing.
- **Zoom out.** If the model can't read a reference, it can't follow it: when it misreads one, show more of the scene. Keyframes and layout sketches should show enough of the surroundings to make positions clear. Avoid frames filled with one big shape.
- **Changing one input changes everything.** When they swapped in a final character design, the camera drifted. After any asset update, re-lock the framing with a keyframe or a screenshot of a good take.
- **Wording.** Models take nouns literally (section 7).
- **No music in generations.** The five-note melody is composed and recorded separately.

---

## 17. Asset register

The short request for every image input. Write the full prompt with the matching skill. "Attach" lists the canon codes to add as references.

### Style frames
All five are approved and in canon. Attach them for paint only, with the style frame line from section 4. SF1 is close to the layout of Van Gogh's Starry Night, so never let it guide a composition. SF4 sets the grief look: the world and her skin blue; her hair, her cardigan and her amber eye still warm.

| Code | Asset | Type | Ratio | Scenes | Attach | Short request |
|---|---|---|---|---|---|---|
| SF1 | The two lights | key frame | 16:9 | 1 | none | Two small lights, an amber crescent-shaped glow and a pale dot, play on the curve of a great swirl in a night sky of cobalt and gold; far below, wheat fields, cypresses, a village with lit windows. |
| SF2 | Catch at the wall | key frame | 16:9 | 4 | none | Golden late afternoon. The young mother in cobalt catches the laughing toddler in yellow as she jumps from the stone wall, and spins her; the wheat swirls around them. |
| SF3 | The flat city | key frame | 16:9 | 6 | none | A rainy night street. Flat gray cut-out people slide past; in the middle, the daughter at 25 is half flattened. |
| SF4 | The stillness | key frame | 16:9 | 8 | none | Night through a cottage window. The garden completely still in deep blues and blue-greens; the daughter at 34 in profile at the window, her skin blue, her hair, cardigan and amber eye still warm, hands raised and open. |
| SF5 | The catch in the sky | key frame | 16:9 | 10 | none | A warm glowing sky. The amber crescent-shaped glow curls around a small pale light at the calm center of a great swirl. |

### Hero faces
Both are approved and in canon. From here on they, not the style frames, define the characters. HF1 is a mirror image of SF2; the bible follows HF1.

| Code | Asset | Type | Ratio | Scenes | Attach | Short request |
|---|---|---|---|---|---|---|
| HF1 | The mother | portrait | 4:5 | 3, 4 | none | The mother in her early 30s, calm and tender, faint smile, cobalt dress. |
| HF2 | The daughter | portrait | 4:5 | 6 | none | The daughter at 25, curious and open, long wavy auburn hair, mustard scarf. |

### Characters
| Code | Asset | Type | Ratio | Scenes | Attach | Short request |
|---|---|---|---|---|---|---|
| CS1 | The lights | light sheet | 21:9 | 1, 2, 6, 10 | SF1 | All five lights in one row, to scale (section 10). |
| CS2 | The little light: moods | light sheet | 21:9 | 1, 2, 10 | CS1 | Calm; laughing flare; scared and dim; trembling; letting go. |
| CX1 | The flat crowd | lineup | 21:9 | 6 | SF3 | Ten flat gray cut-out people in strict profile: coat and hat, umbrella, briefcase, cane, hands in pockets, carrying a bag, a child holding a hand, reading a newspaper, a couple walking apart, hurrying. |
| CM1 | Mother: ages | lineup | 3:2 | 3 to 8 | HF1 | Early 30s, late 40s and mid-60s side by side. |
| CM2 | Mother, 30s: turnaround | turnaround | 3:2 | 3, 4 | HF1, CM1 | Cobalt dress, sleeves pushed up, barefoot. |
| CM3 | Mother, 30s: expressions | expressions | 3:2 | 3, 4 | HF1, CM2 | Tender smile down at a baby; laughing, head back; calling encouragement, arms open; worried; tears of joy; humming with lips and eyes closed. |
| CM4 | Mother: catching poses | poses | 3:2 | 3 to 5 | HF1, CM2 | Holding a newborn, arm curved around its head; standing below the wall, arms open, looking up; catching a jumping toddler; spinning a child. |
| CM5 | Mother, late 40s: turnaround | turnaround | 3:2 | 5 | HF1, CM1 | Faded cobalt dress, apron, one silver streak. |
| CM6 | Mother, 60s: turnaround | turnaround | 3:2 | 7, 8 | HF1, CM1 | Blue cardigan over a gray dress, silver-white side buns, many small facets, the mark as bright as ever. |
| CM7 | Mother, flat | key frame | 21:9 | 5 | CM5, CX1 | Her late-40s silhouette as a flat gray cut-out in the cottage doorway, arms half open; the cottage stays painted. |
| CM8 | Mother: all of her | portrait | 4:5 | 7 | HF1, CM1 | One face whose planes show her in her mid-60s, her 30s and as a girl of about seven, fitted together, the mark at the center; overwhelming tenderness. |
| CD1 | Daughter: ages 0 to 16 | lineup | 3:2 | 3 to 5 | HF2 | Newborn in the cream blanket; 2 in the yellow dress; 7 in the yellow pinafore; 16 in the charcoal hoodie. |
| CD2 | Daughter: ages 25 to 75 | lineup | 3:2 | 6 to 9 | HF2, CD1 | 25 in the gray coat and mustard scarf; 30 in the mustard coat; 34 in the ochre cardigan; 75 in the blue cardigan and mustard scarf, with the small mark. |
| CD3 | Newborn: unfinished and built | stages | 3:2 | 3 | CD1 | Left: a smooth unfinished oval face, peaceful. Right: the face built from three large planes, eyes open. |
| CD4 | Daughter, 2: turnaround | turnaround | 3:2 | 4 | HF2, CD1 | Short auburn curls, the yellow smock dress, bare feet. |
| CD5 | Daughter, 7: turnaround | turnaround | 3:2 | 4 | HF2, CD1 | Two auburn bunches, yellow pinafore, scuffed knees, sandals. |
| CD6 | Daughter, 2 and 7: jumping poses | poses | 3:2 | 4 | CD4, CD5 | Wobbling along the wall with arms out; leaping off with arms wide; mid-air, laughing; running through wheat. |
| CD7 | Daughter, 16: turnaround | turnaround | 3:2 | 5 | HF2, CD1 | Sharp clashing planes, asymmetrical cut, charcoal hoodie, black trousers, boots, olive duffel bag. |
| CD8 | Daughter, 16: expressions | expressions | 3:2 | 5 | CD7 | Defiant, looking down; hesitating; jaw set, turning away; eyes forward, walking; a glance back over her shoulder; holding back tears. |
| CD9 | Daughter, 25: turnaround | turnaround | 3:2 | 6 | HF2, CD2 | Long, wavy deep auburn hair, gray wool coat, mustard scarf. |
| CD10 | Daughter, 25: full to flat | stages | 21:9 | 6 | CD9, CX1 | Five stages from full color to a flat gray cut-out in profile; read backwards for unfolding. |
| CD11 | Daughter, 30: turnaround with baby | turnaround | 3:2 | 6, 7 | HF2, CD2 | Mustard coat, hair tied back, the baby in the cream blanket in the crook of her arm. |
| CD12 | Daughter, 30: expressions | expressions | 3:2 | 6 to 8 | CD11 | Surprised at her own humming; love, looking down; recognition and shock; face breaking into tears; laughing through tears; grief, looking at empty hands. |
| CD13 | Daughter, 34, with her mother: poses | poses | 3:2 | 8 | CD2, CM6 | Steadying her mother's elbow on a step; carrying her; at the night window reaching up; hands closing on air. |
| CD14 | Daughter, 75: turnaround | turnaround | 3:2 | 9 | HF2, CD2, CM6 | White bun, her mother's blue cardigan, mustard scarf, many small facets, the small mark on her right cheek. |
| CD15 | Daughter, 75: poses | poses | 3:2 | 9, 10 | CD14 | Below the wall with arms open, looking up; catching a small child in yellow; at the window looking up, calm; in the armchair, eyes closed, smiling. |
| CD16 | Daughter: all of her | portrait | 4:5 | 9 | HF2, CD1, CD2 | One face whose planes show her at 75, 30, 16 and 2, centered on the higher eye with the amber fleck; peaceful, unafraid. |
| CP1 | Partner, 27: turnaround | turnaround | 3:2 | 6, 9 | HF2 | Navy peacoat, dark green scarf; kind, a little shy. |
| CP2 | Partner: flat to full | stages | 21:9 | 6 | CP1, CX1 | Kneeling on a wet street: from a flat gray cut-out to his full face, looking up in wonder. |
| CC1 | Their child: newborn and 4 | lineup | 3:2 | 6, 9 | HF2, CP1 | Newborn with an unfinished face; the same newborn built; at 4 in a red jumper, humming with lips closed. |
| CG1 | Grandchild, 3: turnaround | turnaround | 3:2 | 9 | CD4 | The same yellow smock dress, bare feet, wobbly. |
| CF1 | The family, late life | lineup | 3:2 | 9 | CP1, CC1, CG1 | The partner at 75, their child at 45, the grandchild at 3. |

### Props
| Code | Asset | Type | Ratio | Scenes | Attach | Short request |
|---|---|---|---|---|---|---|
| PR1 | The garden wall | prop sheet | 3:2 | 4, 5, 7, 9 | SF2 | Garden side, road side, top surface. |
| PR2 | The cottage door | prop sheet | 3:2 | 5, 7 | SF2 | Front, three-quarter, detail of latch and step. |
| PR3 | The window | prop sheet | 3:2 | 2, 8 to 10 | SF2 | Inside by day, inside at night, outside at night glowing amber. |
| PR4 | The yellow dress | prop sheet | 3:2 | 4, 9 | CD4 | Flat, on a hanger, from the back. |
| PR5 | The cream blanket | prop sheet | 3:2 | 3, 5 to 7 | CD3 | Folded; around a newborn; a corner peeking out of the duffel bag. |
| PR6 | The duffel bag | prop sheet | 3:2 | 5 | CD7 | Optional. Packed full, three angles. |
| PR7 | The oranges | prop sheet | 3:2 | 6 | SF3 | Optional. Upright bag; tipped over with oranges rolling; one orange in a hand. |
| PR8 | The blue cardigan | prop sheet | 3:2 | 7 to 9 | CM6 | Flat, on a chair back, worn. |
| PR9 | The mustard scarf | prop sheet | 3:2 | 6, 9 | CD9 | Flat, wrapped, drained to gray. |

### Background plates
| Code | Asset | Type | Ratio | Scenes | Attach | Short request |
|---|---|---|---|---|---|---|
| BG1 | Sky: play | plate | 21:9 | 1 | SF1 | Night sky with no ground; rivers of cobalt and gold swirling; stars with soft rings of dabs. |
| BG2 | Sky: the calm eye | plate | 21:9 | 1, 2 | SF1 | Looking into the calm center of a great swirl. |
| BG3 | Sky: the spiral opens | plate | 21:9 | 2 | SF1, BG2 | Looking down a downward spiral of brushstrokes; the tiny world at the bottom with one amber window. |
| BG4 | Sky: alone | plate | 21:9 | 2 | BG1 | The same sky, colder; bigger, darker swirls; stars far apart. |
| BG5 | The world from above | plate | 21:9 | 1, 2 | SF1, PR3 | A night landscape from high above; one cottage window glows amber. |
| BG6 | The fall | tall plate | 9:16 | 3 | SF1, SF2 | Night blue, dawn violet, morning gold from top to bottom; clouds of thick paint; brushstroke birds. |
| BG7 | The birth room | plate | 21:9 | 3 | SF2, PR3 | A cottage bedroom at dawn. |
| BG8 | Garden: childhood | plate | 21:9 | 4 | SF2, PR1 | The garden base plate. Every other garden plate is an edit of this one. |
| BG9 | Garden: the leaving | plate | 21:9 | 5 | BG8, PR1, PR2 | Both sides of the wall visible, the road twisting away, the cottage door behind. |
| BG10 | Garden: the return | plate | 21:9 | 7 | BG8, PR1, PR2 | Autumn; the camera higher, so the wall looks small. |
| BG11 | Garden: the stillness | plate | 21:9 | 8 | BG8, SF4 | Night, painted in deep blues and blue-greens, every stroke stopped. |
| BG12 | Garden: late life | plate | 21:9 | 9 | BG8, PR1 | Decades later: a mossier wall, wildflowers. |
| BG13 | Cottage: the night window | plate | 21:9 | 8 to 10 | SF4, PR3 | Window seat, armchair, a dim lamp, the night sky through the glass. |
| BG14 | The flat city | plate | 21:9 | 6 | SF3 | A rainy night street, gas lamps, long swirling reflections. |
| BG15 | The street through the seasons | triptych | 21:9 | 6 | BG14 | Blossom, snow, blossom. |
| BG16 | City apartment window | plate | 21:9 | 6 | BG14 | A window over wet rooftops; a long road out to the countryside. |
| BG17 | Sky: the return | plate | 21:9 | 10 | SF5, BG1 | The opening sky, warmer and brighter, the calm eye glowing. |

### Effects
| Code | Asset | Type | Ratio | Scenes | Attach | Short request |
|---|---|---|---|---|---|---|
| FX1 | A face building itself | stages | 21:9 | 3, 6 | CD3 | Smooth unfinished oval, one eye, a second eye at another angle, profile nose, mouth, finished planes. |
| FX2 | A light rising | FX sheet | 21:9 | 8, 10 | CS1 | An amber glow gathers, lifts as a crescent-shaped glow, rises trailing dabs, and merges into a swirl. |
| FX3 | Brushstroke birds | FX sheet | 3:2 | 3 | SF2 | Single dark curved strokes in flight positions; a loose V. |
| FX4 | Rain, blossom, snow | FX sheet | 3:2 | 6, 9 | SF3 | Slanted strokes; pink-white dabs; round white dabs. |
| FX5 | The crescent-shaped mark | design sheet | 3:2 | 3, 7, 9 | HF1 | The mark alone, large; beside it, the smaller version for the old daughter. |
| FX6 | End card | design sheet | 21:9 | 10 | CS1, SF5 | One continuous stroke of amber light drawing a crescent shape curled around a small pale dot, with empty space for the title. The title is added in the edit, never generated. |
