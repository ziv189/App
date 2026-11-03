---
name: ill-catch-you-image-edits
description: Writes edit prompts that change an existing approved image in the animated short I'll Catch You instead of generating a new one - aging a character, changing clothes, season, time of day or mood, making a variant of a prop or background plate, fixing a detail that drifted, combining the best parts of several takes, and repairing screenshots or keyframes so they agree with the character sheets before they are used as references. Written for Seedream 5.0 Pro (or Nano Banana Pro) in Higgsfield, one change per pass, with everything that must stay locked spelled out, and says when a fix is faster by hand. Use this whenever the user wants to edit, fix, adjust, change, age, recolor, combine or vary an image, says a take is almost right, or says something is missing or wrong in a generated image, a screenshot or a keyframe.
---

# I'll Catch You: image edits

Turn "this is almost right, but..." into the fastest correct fix: a hand fix, an edit prompt, or a clear reason to regenerate.

## Why edit instead of regenerate

The Higgsfield team built their film by editing approved images, not by regenerating them: the roofless taxi and the back-seat view were edits of the approved car, and every character got a hand pass in Photoshop. A fresh generation changes things that were already right. An edit of a canon image keeps them.

Their screenshot lesson matters even more. They used a screenshot of a good take to lock a camera angle, but the screenshot was missing her headphones, so the headphones vanished from every take after it. Any image you attach as a reference has to agree with the character sheets. Repair it before you use it.

## Before writing

Read `references/film-bible.md`, sections 4 (style lock), 6 (lighting locks), 7 (literal words), 8 (face maps), 9 (ages and wardrobe) and 16 (known risks).

Choose the route:
- **By hand** (Photoshop, Procreate): color and saturation, a small missing mark (the crescent-shaped mark, the amber fleck, the blue plane), the brushed contour line, small cleanup. This is fastest and exact. Recommend it first whenever the fix is small.
- **By model** (Seedream 5.0 Pro in Higgsfield, or Nano Banana Pro): variants (an older age, other clothes, a season, a time of day, a mood, another view), borrowing a part from another take, larger fixes, and composites of several references.
- **Regenerate:** when the face map itself is wrong (the halves swapped or in the wrong colors, the mark on the wrong side, the wrong number of eyes), or the style is wrong (realistic, plastic, textured characters). Edits rarely fix a wrong foundation. Send the user back to the asset's skill with one line saying what to change in the prompt.

## Edit prompt structure

1. **Which image is which:** "Edit the attached image" for one image. With several images, name each one: "Image 1 is the base to edit. Image 2 is [what], for reference only."
2. **The change:** one change, described concretely. Say where in the frame it is, what it looks like (using the face-map or bible wording), and how it relates to the reference.
3. **Keep exactly the same:** everything that must not move. Name the specifics: the face-map items, the clothes, the framing and camera, the poses, the background, the lighting, the layout of a sheet.
4. **Style reminder:** one sentence (for characters, flat cubist planes with bold contours; for places, Van Gogh impasto with readable shapes). Don't paste the whole style block, because it can push the model to restyle the image.
5. **Negative:** from section 4. For plates, add "No people, no figures, no animals and no faces anywhere."

**One change per pass.** If three things are wrong, fix them in three passes (or fix the small ones by hand), and check after each pass. A variant such as a new season or an older age counts as one change, as long as everything it touches belongs to that idea.

When a variant changes the light, paste the destination's lighting lock from section 6 word for word.

## Output format

**Fix: [what is being fixed or varied] ([asset code])**
Route: by hand / by model / regenerate, with a one-line reason
Model: Seedream 5.0 Pro (or Nano Banana Pro) · Aspect ratio: same as the source
Attach: [the image to edit first, then any references, each named]

```
[the edit prompt]
```

**Check after the edit:** [two to four checks, including at least one thing that must not have changed]

For a hand fix, replace the prompt with three to five short steps (what to paint, which palette color, where).

## Example

Request: "make the garden for scene 9 from the base plate"

**Fix: the garden decades later, for scene 9 (BG12, from BG8)**
Route: by model. A season-and-time variant of the canon base plate keeps the wall, the door and the trees identical.
Model: Seedream 5.0 Pro · Aspect ratio: 16:9
Attach: BG8 (the image to edit), PR1 (the wall, for reference)

```
Image 1 is the base to edit: the garden plate. Image 2 is the garden wall's prop sheet, for reference only. Keep everything in Image 1 exactly the same except the change described below.

CHANGE: Move the garden forward several decades and into a warm early-summer evening. The stone wall is more weathered, with thicker moss along its top and in its cracks, and small white and pale-yellow wildflowers grow at its foot beside the tuft of wheat. Change the light to: Warm early-summer evening. Low gold sun from the left, long gentle shadows. The sky swirls gently in gold and blue.

KEEP EXACTLY THE SAME: the camera position and framing; the shape, height and position of the wall; the wheat field; the two cypress trees on the right; the cottage door at the far left; the open grass where the characters will stand.

The world stays painted in thick Van Gogh impasto with clear, readable shapes.

No text, letters, labels, numbers, captions, watermark, signature or picture frame anywhere in the image. No people, no figures, no animals and no faces anywhere.
```

**Check after the edit:** the wall has the same stones and height as BG8; the sun is still from the left; the door and cypresses have not moved; no people appeared.

## Two more patterns

**Repairing a reference screenshot.** Request: "this frame from shot 7-3 has the right camera, but her mark is missing."
Route: by hand if possible (paint the mark from CM6). Otherwise, by model:
```
Image 1 is the base to edit: a frame from a video take. Image 2 is the mother's character sheet, for reference only. Keep everything in Image 1 exactly the same except the change described below.

CHANGE: The mother's amber crescent-shaped mark is missing. Add it on her left cheek (the light half), just under her left eye, horns pointing up, about as wide as the eye, glowing softly, exactly as on her character sheet in Image 2.

KEEP EXACTLY THE SAME: the camera angle and framing, both characters' poses and expressions, the lighting, the background and everything else in Image 1.

Flat cubist characters with bold dark contour lines, in a world painted in Van Gogh impasto.

No text, letters, labels, numbers, captions, watermark, signature or picture frame anywhere in the image. No photorealism, no 3D render, no anime, no flat vector illustration.
```
After the repair, check every never-change item for every character in the frame before you attach it as a reference.

**Matching a style frame's paint.** Request: "SF3 doesn't look like SF1." Attach the frame to fix as Image 1 and SF1 as Image 2.
```
Image 1 is the base to edit. Image 2 is the film's first style frame, for the paint only. Keep everything in Image 1 exactly the same except the change described below.

CHANGE: Repaint the setting in Image 1 (everything except the people) with the same paint handling as Image 2: the same thickness of impasto, the same long rhythmic brushstrokes and swirling curved dashes, the same visible canvas weave.

KEEP EXACTLY THE SAME: the composition and camera, the characters and their faces, and the colors and light of Image 1. The characters stay clean, flat cubist planes. Don't copy Image 2's composition, sky or colors.

No text, letters, labels, numbers, captions, watermark, signature or picture frame anywhere in the image. No photorealism, no 3D render, no anime, no flat vector illustration.
```

**Combining takes.** Request: "take 2 has the best face but take 4 has the right hair."
Attach take 2 as Image 1 (the base) and take 4 as Image 2. CHANGE: "Replace the hair in Image 1 with the hair from Image 2: [describe it in face-map words]." KEEP EXACTLY THE SAME: the face, its planes, the eyes and the marks, the clothes, the pose and the layout.
