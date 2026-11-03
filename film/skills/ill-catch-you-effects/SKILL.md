---
name: ill-catch-you-effects
description: Writes Higgsfield-ready prompts for effect sheets in the animated short I'll Catch You - a light rising out of a body, the downward spiral in the sky, a face building itself, rain, blossom and snow as brushstrokes, brushstroke birds, the crescent-shaped mark and the end-card glow - choosing wording the models won't take literally, keeping the lights faceless, and saying which effects are better built in the edit than generated. Use this whenever the user asks for an effect, FX, effect sheet, glow, particles, weather, a magic or transition moment, the end card, or any of the codes FX1 to FX6. (The designs of the lights themselves, CS1 and CS2, live in the characters skill.)
---

# I'll Catch You: effect prompts

Turn a short request ("the light leaving her body") into a complete effect-sheet prompt for Higgsfield, plus the settings, the references, and advice on whether to generate the effect or build it in the edit.

## Two lessons from the Higgsfield team's explosion

- **Models take words literally.** Their "mushroom-shaped explosion" came back as an explosion with an actual mushroom in it. Effects are where this happens most, because effect words are metaphors: soul, halo, crescent, comet, whirlpool. Describe shape, color, motion and material instead (section 7 of the bible lists the swaps).
- **Generated effects need a hand-made finish.** Their final explosion worked only after they painted their own textures over the generated base, so it matched the rest of the film. Treat every generated effect as a base for a hand-finish, not a final.

## Before writing

Read `references/film-bible.md`, sections 4 (style lock), 5 (texture budget), 7 (literal words), 10 (the lights), 16 (known risks) and 17 (asset register).

Decide two things:
1. **Generate, or build in the edit?** Some effects are steadier as painted stills or composites than as generated video:
   - A face building itself (FX1): paint the stages as stills, then dissolve between them in the edit. Generate the sheet as the design for those stills.
   - A glow pulsing, a light drifting, a trail of dabs: composite these in the edit over the plate, using the sheet as the design.
   - Weather (FX4): overlay painted rain, blossom or snow strokes in the edit, so they never fight the plate's texture.
   - The end card (FX6): the title text is always added in the edit, never generated.

   Tell the user which route you recommend, in one line.
2. **Background color:** deep night-blue for anything glowing, pale sky-blue for dark strokes (birds), plain warm off-white for marks and faces.

## Prompt order

1. **Effect and moment:** one or two sentences. What the effect is, and the story moment it serves.
2. **Stages or elements:** numbered from left to right, each describing shape, color, size and motion.
3. **Literal-word guard:** one sentence saying what it is not (not the moon, not a flame, not a comet, not water), whenever a shape could be read as an object.
4. **Style:** LIGHTS for anything glowing, WORLD for weather and birds, CHARACTERS for the face-building stages and the mark.
5. **Layout block:** below.
6. **References:** the consistency line from section 4 for attached sheets and plates, and the style frame line from section 4 for any attached style frame (paint only).
7. **Negative:** from section 4, plus "No people, no figures and no faces anywhere." Leave the people line out of FX1, which is a face.

## Layout blocks

- **Glow sheet:** Effect design sheet on a plain deep night-blue background: the elements drawn side by side from left to right at the same scale.
- **Stroke sheet:** Effect design sheet on a plain pale sky-blue background: the elements drawn side by side at the same scale.
- **Stages on paper** (FX1): Sequence sheet on a plain warm off-white paper background: the subject drawn in stages from left to right, the same size and in the same position in every stage.
- **Single design** (FX5): Design sheet on a plain warm off-white paper background, the subject centered, soft even light.
- **End card** (FX6): Centered on a plain deep night-blue background with generous empty space all around.

## Output format

**[Code] [Effect name]**
Route: generate as the final element / generate as the design, build it in the edit ([one-line reason])
Model: Soul 2.0 in Cinema Studio, batch of 4, if nothing is attached; Seedream 5.0 Pro if anything is attached (Soul 2.0 can't take image inputs) · Aspect ratio: [ratio]
Attach (canon only): [codes and what each one is]

```
[the full prompt]
```

**Check before approving**
- [three to five checks: shapes read correctly, no literal accidents, color names match the palette, the lights have no faces]
- No people, figures, faces or text (except FX1).

**Hand-finish**
- [paint your own dabs or strokes over the generated effect so it matches the world; adjust glow color toward the palette]

## Example

Request: "the light leaving her body"

**FX2 A light rising**
Route: generate as the design, build it in the edit. A composited glow on a curve stays steadier than a generated one, and it lets you time the rise exactly to the missing last note.
Model: Seedream 5.0 Pro (references attached) · Aspect ratio: 21:9
Attach (canon only): CS1 (the lights)

```
A design sheet for the moment a life ends in the film: an amber light lifting away and returning to the sky, shown in five stages from left to right.

1. A warm amber glow gathering low in the frame, soft and round.
2. The glow lifting free and shaping itself into a crescent-shaped glow, horns pointing up.
3. The crescent-shaped glow rising on a gentle curve, trailing a few small amber paint dabs.
4. Higher still, its soft ring of short curved paint dabs brightening.
5. At the top of the frame, merging into the curve of a swirl of cobalt and gold brushstrokes.
The glow follows one smooth upward curve across the five stages. It is not the moon, not a flame and not a comet.

The lights are small glowing points painted in thick luminous brushstrokes, like stars in a Van Gogh night sky: a bright core with a soft ring of short curved paint dabs around it. Painted light, not a lens flare and not a CGI glow. The lights have no faces and no bodies.

Effect design sheet on a plain deep night-blue background: the elements drawn side by side from left to right at the same scale.

Use the attached reference images as the exact design. Characters, environments and props 100% match the reference images: the same face maps, proportions, colors and clothing.

No text, letters, labels, numbers, captions, watermark, signature or picture frame anywhere in the image. No photorealism, no 3D render, no anime, no flat vector illustration. No people, no figures and no faces anywhere.
```

**Check before approving**
- The crescent-shaped glow matches the amber light in CS1: horns up, amber core, warm gold ring of dabs.
- No moon, no flame, no comet tail, no smoke.
- The five stages sit on one smooth curve.
- No people, figures, faces or text.

**Hand-finish**
- Paint your own amber dabs along the trail so it matches the brushwork of the sky plates.
- Keep the glow at the palette's Amber, with Amber glow around it.
