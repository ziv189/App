---
name: ill-catch-you-characters
description: Writes Higgsfield-ready image prompts for every character asset in the animated short I'll Catch You (Picasso-style cubist characters in a Van Gogh-style world, no dialogue) - the style frames with people in them (SF2, SF3, SF4), hero faces, turnarounds, expression sheets, pose sheets, age lineups, the flat gray crowd, the soul lights, and special states such as the unfinished newborn face, the flattening and unfolding stages and the all-ages portraits. Use this whenever the user asks for a character, character sheet, model sheet, turnaround, expressions, poses, lineup or design for the mother, the daughter, the partner, their child, the grandchild, the flat people or the lights, or gives a code like SF2, SF3, SF4, HF1, HF2, CM1 to CM8, CD1 to CD16, CP1, CP2, CC1, CG1, CF1, CX1, CS1 or CS2, even if the request is only a few words or written in German.
---

# I'll Catch You: character prompts

Turn a short request ("mom at 65, turnaround") into a complete image prompt for Higgsfield, plus the settings, the references to attach, and what to check before the image goes into canon.

The film is built asset-first: character sheets are the image inputs for every shot, so a vague or inconsistent sheet damages every shot it touches. Cubist faces are the hardest style to keep consistent, because the model reinvents the fracture on every take. That is why each character has a fixed face map, and why the prompt order below never changes.

## Before writing

Read `references/film-bible.md`, sections 4 (style lock), 5 (texture budget), 7 (literal words), 8 (face maps), 9 (ages and wardrobe) and 17 (asset register). Add section 10 for the lights and section 11 for flat people.

Work out four things from the request:
1. Who, and at what age.
2. Sheet type: hero face, turnaround, expressions, poses, lineup, stages, light sheet or key frame.
3. The asset code, if the request matches a row in the register.
4. Which canon images to attach. Use the register's Attach column, and remind the user that each one must already be approved. Anything attached means Seedream 5.0 Pro, because Soul 2.0 can't take image inputs.

If something is missing, choose the most sensible option from the register and say what you chose in one line. Ask only when the answer changes the design, for example a new character the bible doesn't cover. For a new character, propose a face map in the same format as section 8 (a distinct cubist signature, colors, never-change list) and get it approved before writing sheets.

## Prompt order

Image models weigh the start of a prompt most, so the most important information comes first:

1. **Subject:** one or two sentences. Who, what age, what the sheet shows, and the feeling.
2. **Face map:** the block from section 8 for every character in the image, word for word. Don't add facial details beyond it; extra description makes the model redesign the face.
3. **Age and clothes:** from section 9, including the facet count for that age ("age adds facets").
4. **Content list:** the six expressions, four poses, lineup order or stages, in order from left to right.
5. **Style lock:** CHARACTERS, word for word. Add LIGHTS for the lights and FLAT PEOPLE for flat states. Add WORLD and MIX only if the image includes a place (always for the style frames), plus that place's lighting lock from section 6.
6. **Layout:** the matching block below.
7. **References:** whenever character references are attached, the consistency line from section 4. When an earlier style frame is attached, name it and give it a paint-only job instead, for example: "The attached image is the film's first style frame. Match its paint handling, brushwork and colors; don't copy its composition." The consistency line would make the model copy that frame's scene.
8. **Negative:** from section 4.

Write in plain sentences. Use color names, never hex codes, because models paint hex codes into images as text. Check every noun against section 7: write "crescent-shaped mark, horns pointing up", never "like a cradle"; write "smooth unfinished oval", never "blank face".

## Layout blocks

- **Hero face:** Close-up portrait, front view, head and shoulders, centered on a plain warm off-white paper background, soft even light, no cast shadows.
- **Turnaround:** Character turnaround sheet on a plain warm off-white paper background: the same character drawn four times in one row at the same scale (front, three-quarter, side profile, back), full body, relaxed standing pose, soft even light, no cast shadows, generous space between the views.
- **Expressions:** Expression sheet on a plain warm off-white paper background: the same head drawn six times in a three-by-two grid, all the same size and at the same three-quarter angle, each with a different expression.
- **Poses:** Pose sheet on a plain warm off-white paper background: full-body figures in four poses in one row, all at the same scale, soft even light.
- **Lineup:** Lineup sheet on a plain warm off-white paper background: the figures stand side by side in one row, front view, full body, at true relative heights, soft even light, generous space between them.
- **Stages:** Sequence sheet on a plain warm off-white paper background: the subject drawn in stages from left to right, the same size and in the same position in every stage.
- **Light sheet:** Design sheet on a plain deep night-blue background: the lights drawn side by side in one row, to scale, with space between them.
- **Key frame** (style frames SF2, SF3, SF4 and CM7): Cinematic 16:9 film still, composed like a key frame from a hand-painted animated film.

## Output format

Use this template every time:

**[Code] [Asset name]**
Model: Soul 2.0 in Cinema Studio, batch of 4, if nothing is attached; Seedream 5.0 Pro if anything is attached (Soul 2.0 can't take image inputs) · Aspect ratio: [ratio]
Attach (canon only): [each code and what it is], or "Nothing, this is the first image of this character."

```
[the full prompt]
```

**Check before approving**
- [three to six checks specific to this character and sheet, taken from the never-change list and the sheet type]
- Exactly two eyes, one nose and one mouth per face; five fingers; no text anywhere.

**Hand-finish**
- [color correction toward the palette names that matter here; paint back any missing locked mark; a brushed contour line around the silhouette]

If the request covers several assets, repeat the template for each, in production order (the order of the register).

## Special states

- **Hero faces (HF1, HF2):** made from text alone in Soul 2.0. Tell the user to make several batches and keep exactly one. Every later image of that character is built from it.
- **Unfinished newborn (CD3, CC1):** "a smooth unfinished oval with no features yet, soft and peaceful". Gentle, never eerie.
- **Flat and unfolding (CM7, CD10, CP2):** use the FLAT PEOPLE block. The silhouette must stay recognizably that person (her bun and apron; her coat and scarf). Stage sheets are read backwards for unfolding.
- **All of her (CM8, CD16):** one face whose planes each show a different age, fitted together and centered on the character's mark. Warn the user that this is the hardest image in the film. If one prompt can't hold it, build it with edit passes from the lineup (the image-edits skill) or assemble it by hand.
- **The lights (CS1, CS2):** no faces and no bodies; feeling shows only through brightness, size and motion.
- **Two characters in one image (CD13, CF1, poses with a child):** include both face maps and say who is screen-left and who is screen-right.

## Reviewing the batch

When the user shares the four results, act as the asset manager: rank them against the face map, the clothes and the appeal; say which one to keep; and say what to borrow from the others with an edit. The Higgsfield team built their final heroine by moving the hoodie and sneakers from one take onto another. Then hand the fix to the image-edits skill, or use the asset-review skill for a full review.

Watch for two failures the Higgsfield team saw: a different hairstyle in every view of a turnaround, and faces that came out "too realistic" or "plasticky". Both mean reject, not approve-and-fix-later.

## Example

Request: "mom at 65 turnaround"

**CM6 Mother, 60s: turnaround**
Model: Seedream 5.0 Pro (references attached) · Aspect ratio: 3:2
Attach (canon only): HF1 (her hero face), CM1 (her age lineup)

```
The mother in her mid-sixties, frail but warm, shown as a full character turnaround.

THE MOTHER: a tall, gentle oval face split vertically down the middle. Her right half (screen-left) is seen from the front: a rose-pink plane with one large dark almond-shaped eye, and just under that eye, on her cheek, a small glowing amber crescent-shaped mark, horns pointing up, about as wide as the eye. Her left half (screen-right) is seen in profile: a warm ochre plane with a sideways eye. Her nose is drawn in profile along the split, pointing to screen-right. Small full lips. Dark umber hair in a low, loose bun with one wavy lock falling over her left shoulder. She always wears blue.

She is in her mid-sixties. Her hair is now silver-white, in the same low bun with the same single lock. Her face is divided into many small facets, while the vertical split, the eyes and the amber crescent-shaped mark stay exactly the same; the mark glows as brightly as ever. She wears a blue knitted cardigan with wooden buttons over a plain gray dress.

Characters designed in the style of Pablo Picasso's cubist portraits: each face shows the front view and the profile at the same time, built from a few flat planes of matte color separated by bold dark contour lines. Simplified, slightly elongated bodies, large gentle hands, flat matte paint with only a faint brush texture, clean edges. No swirling brushwork and no heavy texture on the characters, no soft shading, no realism, no plastic 3D look. Warm, gentle and appealing, never grotesque: exactly two eyes, one nose and one mouth per face, five fingers on each hand.

Character turnaround sheet on a plain warm off-white paper background: the same character drawn four times in one row at the same scale (front, three-quarter, side profile, back), full body, relaxed standing pose, soft even light, no cast shadows, generous space between the views.

Use the attached reference images as the exact design. Characters, environments and props 100% match the reference images: the same face maps, proportions, colors and clothing.

No text, letters, labels, numbers, captions, watermark, signature or picture frame anywhere in the image. No photorealism, no 3D render, no anime, no flat vector illustration.
```

**Check before approving**
- Vertical split, front eye on her right (screen-left), ochre profile half on her left.
- The amber crescent-shaped mark under the front eye, horns up, visible in the front and three-quarter views.
- More, smaller facets than CM2, but the same split and the same eyes.
- The same bun and lock in all four views.
- Blue cardigan with wooden buttons. It becomes an heirloom, so PR8 and CD14 must match it.
- Exactly two eyes, one nose and one mouth; five fingers; no text anywhere.

**Hand-finish**
- Lift the amber of the mark if it came out dull: it is the key color of the film.
- Paint a brushed contour line around the silhouette.
