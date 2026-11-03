---
name: ill-catch-you-environments
description: Writes Higgsfield-ready prompts for background plates, locations and the sky style frames (SF1, SF5) in the animated short I'll Catch You - the swirling night sky, the world seen from above, the tall sky for the fall, the birth room, the garden and stone wall in every season and mood, the cottage window at night, and the rainy flat city. Applies the film's Van Gogh world style, the fixed lighting lock for each location, and the no-people rule for empty plates, and makes seasonal and emotional variants as edits of one canon base plate so the place never changes. Use this whenever the user asks for a background, BG, plate, location, environment, set, sky, landscape or establishing image, any of the codes SF1, SF5 or BG1 to BG17, or wants to change the time of day, season, weather or mood of a place.
---

# I'll Catch You: environment prompts

Turn a short request ("the garden in autumn") into a complete background-plate prompt for Higgsfield, plus the settings, the references to attach, and the checks before canon.

## What the Higgsfield team learned about locations

Locations taught them the most. Their first fully painted locations looked "sloppy, dirty and soulless", and they nearly abandoned the style. Two things fixed it:
- **Light:** flat midday light made everything dull. Low warm sun and long shadows gave volume and depth, and that became their formula: generate the location in the painted style, then put a fixed lighting phrase in every prompt.
- **Readable texture:** the paint has to describe the forms, not bury them. That's why this film's WORLD block asks for clear, readable shapes.

Two more lessons apply here:
- **Empty frames attract strangers.** With no characters in frame, random people appeared in their video tests. Every plate prompt forbids people, figures, animals and faces.
- **Test early.** Put an approved plate into a short video test (a slow push-in, no characters) before production. If the texture smears or crawls, simplify the plate now, while it's cheap.

## Before writing

Read `references/film-bible.md`, sections 4 (style lock), 5 (texture budget), 6 (lighting locks), 7 (literal words), 13 (locations) and 17 (asset register).

Decide three things:
1. **Which location and which lighting lock.** Every location has exactly one lock per scene (section 6). Paste it word for word; a reworded lock gives a different light.
2. **Base plate or variant.** Each place has one base plate: BG8 for the garden, BG14 for the city, BG1 for the sky. Make every other season, time and mood of that place as an edit of its canon base plate with the image-edits skill, so the wall, the door and the trees stay identical. Generate from scratch only the base plates and the places that appear once.
3. **Where the characters will stand,** so the plate leaves room for them.

## Prompt order

1. **Place and moment:** one or two sentences. What the place is, and the story moment it serves.
2. **Layout of the space:** camera height and angle, then foreground, middle ground and background, the screen positions of the key landmarks, and where the open space for characters is.
3. **Lighting lock:** word for word from section 6.
4. **Style:** the WORLD block, word for word.
5. **Layout block:** below.
6. **Consistency line:** whenever references are attached.
7. **Negative:** from section 4, plus "No people, no figures, no animals and no faces anywhere."

Rules that keep plates usable:
- Never name a painting. "Starry Night" and other titles make the model copy that composition. Describe the sky in your own words.
- In skies that contain a crescent-shaped light, add "not the moon".
- In every garden plate, the key light comes from the left.
- For the stillness of scene 8, write "completely still, every brushstroke stopped mid-swirl, painted only in shades of blue". Never write "frozen" (ice) or "Blue Period" (Picasso paintings).
- In scene 7, the wall looks small because the camera is higher. Never make the wall itself smaller.

## Sky style frames (SF1, SF5)

These two are the film's first gate, so write them before any plate. Add the LIGHTS block after WORLD, describe the lights' positions and moods in the layout of the space (section 10 of the bible), use the key-frame layout instead of the plate layout, and replace the no-people line with "No people, no figures and no faces anywhere. The lights have no faces." Both are made from text alone in Soul 2.0, which can't take image inputs, so they have no consistency line. If SF5's paint drifts from SF1, match it afterwards with a Seedream edit (the image-edits skill).

## Layout blocks

- **Plate:** Background plate with no people, no characters and no animals. Cinematic 16:9 widescreen composition with clear open space where characters will be placed later.
- **Tall plate** (BG6): Background plate with no people, no characters and no animals. Tall vertical composition made for a slow downward camera move.
- **Key frame** (SF1, SF5): Cinematic 16:9 film still, composed like a key frame from a hand-painted animated film.
- **Triptych** (BG15): Three panels side by side, the same camera angle in each, no people, no characters and no animals.

## Output format

**[Code] [Location name]**
Base plate or variant: [base / edit of BG8, BG14 or BG1, in which case give the edit prompt from the image-edits skill instead]
Lighting lock: [lock name]
Model: Soul 2.0 in Cinema Studio, batch of 4, if nothing is attached; Seedream 5.0 Pro if anything is attached (Soul 2.0 can't take image inputs) · Aspect ratio: [ratio]
Attach (canon only): [codes and what each one is]

```
[the full prompt]
```

**Check before approving**
- [three to five checks: landmarks in the right place, the light from the right side, open space for the characters, texture readable and not muddy]
- No people, figures, animals, faces or text anywhere.

**Video test:** [one line: what to watch for in a five-second push-in test of this plate]

## Example

Request: "the garden plate for the jumping scene"

**BG8 Garden: childhood**
Base plate or variant: the base plate. Every other garden plate is an edit of this one.
Lighting lock: L-GOLD
Model: Seedream 5.0 Pro (references attached) · Aspect ratio: 16:9
Attach (canon only): SF2 (style frame: catch at the wall), PR1 (the garden wall)

```
The garden of a small stone cottage, the place where a little girl learns to jump from a wall into her mother's arms. This is the base plate for every garden scene in the film.

The camera is at a child's eye level, about one meter high, looking across the garden. In the foreground, the garden side of a low dry fieldstone wall about one meter twenty high runs from the left third of the frame toward the right, its worn flat top clearly visible, moss in the cracks and a tuft of wheat at its foot. Open grass in front of the wall, center and left, leaves clear space where a mother and child will stand. Beyond the wall, a rippling wheat field stretches to the horizon, with two tall cypress trees on the right. A weathered faded-blue cottage door with a worn stone step is just visible at the far left edge. A wide sky fills the top third.

Golden late afternoon. Low warm sun from the left, long soft shadows, warm gold light on every edge.

Hand-painted oil environment in the style of Vincent van Gogh's late landscapes: thick impasto paint, long rhythmic brushstrokes that follow every form, skies built from swirling curved dashes, cypress trees like dark green flames, wheat fields of rippling ochre and gold strokes, visible canvas weave. Bold complementary color pairs, cobalt against chrome yellow and viridian against vermilion. Clear, readable shapes: the strokes describe the forms instead of burying them in noise. No smooth gradients, no photographic detail, no hard geometric shapes in the landscape.

Background plate with no people, no characters and no animals. Cinematic 16:9 widescreen composition with clear open space where characters will be placed later.

Use the attached reference images as the exact design. Characters, environments and props 100% match the reference images: the same face maps, proportions, colors and clothing.

No text, letters, labels, numbers, captions, watermark, signature or picture frame anywhere in the image. No photorealism, no 3D render, no anime, no flat vector illustration. No people, no figures, no animals and no faces anywhere.
```

**Check before approving**
- The wall matches PR1: the same stones, the worn flat top, moss, the tuft of wheat.
- The sun from the left, with long shadows falling to the right.
- Clear open grass center-left for the mother and child.
- Two cypresses on the right, the door at the far left.
- Texture readable, not muddy; no people, figures, animals, faces or text.

**Video test:** In a slow five-second push-in, the wheat and sky strokes should move gently while the wall stays solid. Watch for figures appearing in the wheat.
