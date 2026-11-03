---
name: ill-catch-you-props
description: Writes Higgsfield-ready prop sheet prompts for the animated short I'll Catch You (Van Gogh-style world, Picasso-style characters) - the garden wall, the cottage door, the window, the heirloom yellow dress, the cream baby blanket, the blue cardigan, the mustard scarf, the duffel bag, the oranges, and any new object the story needs. Decides whether a prop needs a sheet at all, which style family it belongs to (painted like the world, or clean like the characters, so textures don't fight in motion), and how to make its variants as edits. Use this whenever the user asks for a prop, object, prop sheet, heirloom, set piece, costume item or any of the codes PR1 to PR9, or wants to add a new object to the film.
---

# I'll Catch You: prop prompts

Turn a short request ("the blue cardigan") into a complete prop-sheet prompt for Higgsfield, plus the settings, the references to attach, and the checks before canon.

## Why props need their own rules

Two lessons from the Higgsfield team's taxi:
- **Texture fights in motion.** Their painted taxi on a painted background looked cheap once it moved, "like a PNG stretched over 3D geometry". Their fix: the moving thing went clean and the paint stayed in the world. In this film, anything a character wears or holds is painted like the characters (clean flat planes); anything that belongs to a place is painted like the world (impasto).
- **Only recurring props get a sheet.** If an object appears once and doesn't have to match across shots, describe it in the shot prompt instead and save the time.

## Before writing

Read `references/film-bible.md`, sections 4 (style lock), 5 (texture budget), 7 (literal words), 12 (props and heirlooms) and 17 (asset register).

Decide three things:
1. **Does it need a sheet?** Yes if it recurs and must match (the heirlooms PR4, PR5 and PR8; the set pieces PR1 to PR3; the scarf PR9). For one-off props (PR6, PR7, anything new that appears once), say that a sheet is optional and offer a one-line description the user can paste into the shot prompt instead. Write the sheet anyway if the user wants one.
2. **Which style family?** Worn or held: the OBJECTS block. Part of a place: the WORLD block.
3. **What views?** Angles for solid objects (front, three-quarter, side, one detail). States for soft or changing objects (folded, worn, on a chair, drained to gray). Heirlooms that appear on characters should be built from the character sheet where they first appear, so the register lists that sheet under Attach.

## Prompt order

1. **Object and role:** one or two sentences. What it is, and its place in the story (who wears it, in which scenes). This tells the model why it matters, which keeps it from simplifying.
2. **Physical description:** shape, material, color names, size relative to a person, and the wear and tear that makes it this exact object (a patched pocket, a stretched pocket, moss in the cracks).
3. **Views:** the angles or states, from left to right, plus one close-up detail.
4. **Style:** OBJECTS or WORLD, word for word.
5. **Layout:** the matching block below.
6. **References:** the consistency line from section 4 for attached sheets and plates, and the style frame line from section 4 for any attached style frame (paint only).
7. **Negative:** from section 4, plus "No people, no hands, no figures." Leave out "no people" only when the asset is deliberately shown with a character.

Use color names, never hex codes. Check nouns against section 7.

## Layout blocks

- **Angles:** Prop sheet on a plain warm off-white paper background: the object drawn from three angles in one row (front, three-quarter, side) plus one close-up detail, consistent scale, soft even light.
- **States:** Prop sheet on a plain warm off-white paper background: the same object shown in each listed state in one row, plus one close-up detail, consistent scale, soft even light.
- **Set piece** (wall, door, window): Prop sheet on a plain warm off-white paper background: the set piece drawn from the listed sides in one row, consistent scale, soft even light, no surrounding scenery beyond its base. If scale matters, give the size in meters rather than adding a person, because an added person tends to become a character.

## Variants

Generate the main sheet once. Make every variant (the window at night, the scarf drained to gray, the cardigan on a chair, a different angle) as an edit of the canon sheet with the image-edits skill, the way the Higgsfield team made their roofless taxi and the back-seat view from the approved car. A variant generated from scratch drifts; an edit of the canon sheet stays the same object.

## Output format

**[Code] [Prop name]**
Sheet: needed / optional ([one-line reason]) · Painted like: the characters / the world
Model: Soul 2.0 in Cinema Studio, batch of 4, if nothing is attached; Seedream 5.0 Pro if anything is attached (Soul 2.0 can't take image inputs) · Aspect ratio: 3:2
Attach (canon only): [codes and what each one is]

```
[the full prompt]
```

**Check before approving**
- [three to five checks: the identifying details, scale, the style family, and that nothing textured sits on a clean prop or the other way round]
- No people or hands unless intended; no text anywhere.

**Hand-finish**
- [color correction toward the named palette color; a brushed contour line on objects painted like the characters]

**One-line description for shot prompts:** [a short sentence the user can reuse in video prompts when the prop is attached as a reference, describing its role, not its looks]

## Example

Request: "the blue cardigan"

**PR8 The blue cardigan**
Sheet: needed (an heirloom: the mother wears it in scenes 7 and 8, the daughter at 75 in scene 9) · Painted like: the characters
Model: Seedream 5.0 Pro (references attached) · Aspect ratio: 3:2
Attach (canon only): CM6 (the mother in her sixties wearing it)

```
The blue cardigan from the film: an heirloom worn by the mother in her sixties and, decades later, by her daughter at seventy-five. A prop sheet showing the same cardigan in three states.

A blue knitted cardigan with five round wooden buttons, ribbed cuffs and hem, and two patch pockets slightly stretched from years of hands resting in them. Soft and a little shapeless with age, sized for a slight elderly woman. Shown laid flat from the front, laid flat from the back, and hanging on the back of a simple wooden chair, plus one close-up of a wooden button beside a stretched pocket.

Painted like the film's cubist characters: simple shapes built from flat planes of matte color with bold dark contour lines, faint brush texture, clean edges. No swirling brushwork, no heavy texture, no realism, no plastic 3D look.

Prop sheet on a plain warm off-white paper background: the same object shown in each listed state in one row, plus one close-up detail, consistent scale, soft even light.

Use the attached reference images as the exact design. Characters, environments and props 100% match the reference images: the same face maps, proportions, colors and clothing.

No text, letters, labels, numbers, captions, watermark, signature or picture frame anywhere in the image. No photorealism, no 3D render, no anime, no flat vector illustration. No people, no hands, no figures.
```

**Check before approving**
- The same blue, the same five wooden buttons and the same stretched pockets as the cardigan the mother wears in CM6.
- Clean flat planes with bold contours; no impasto on the knit.
- The chair is plain and painted in the same clean style, not as part of a textured room.
- No people or hands; no text anywhere.

**Hand-finish**
- Match the blue to "Cardigan blue" in the palette; it must read as the same garment on both women.
- Paint a brushed contour line around each view.

**One-line description for shot prompts:** The mother's blue cardigan, later the daughter's: a worn, much-loved heirloom.
