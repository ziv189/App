---
name: ill-catch-you-keyframes
description: Plans shots and writes keyframe prompts for the animated short I'll Catch You - the painted start and end frames that control camera, staging, poses and expressions in shots that would otherwise need 3D previs. Marks which shots need keyframes and which can go straight to video, composes the approved character sheets, prop sheets and background plates into exact film frames, designs match-frame transitions where one scene hands over to the next through a shared shape, and checks that every keyframe agrees with the sheets before it becomes a reference. Use this whenever the user asks for a keyframe, start frame, end frame, first or last frame, storyboard frame, layout, composition, camera angle or transition between scenes, or wants to plan or break down the shots of a scene.
---

# I'll Catch You: keyframes and shot planning

This production has no 3D. The Higgsfield team used a gray Blender previs for shots with specific movement, camera angles or timing, because "if it's quicker to animate an action than to explain it in words, make a previs". Here, the same control comes from four tools:
- **Keyframes:** painted start and end frames for image-to-video.
- **Layout sketches:** a rough drawing of the composition, attached as a reference.
- **Screenshots of good takes:** attached to lock a camera angle once a take gets it right.
- **Splitting:** a hard action broken into shorter shots.

## Before writing

Read `references/film-bible.md`, sections 1 (scenes), 4 (style lock), 6 (lighting locks), 8 (face maps), 13 (locations), 16 (known risks) and 17 (asset register).

## Step 1: route every shot

The Higgsfield team marked their storyboard panels orange for previs. Mark each shot of the scene instead:
- **K (keyframed):** a specific camera angle or framing; two or more characters in a specific arrangement; a change of expression (the performance gap, section 16); hands interacting with an object; a transition into the next scene; or anything that takes longer to explain in words than to show.
- **T (straight to video):** atmosphere, simple motion, wide shots, the lights drifting in the sky, a walk.

Boards are a guide, not a contract. Plan the story beats, leave the atmospheric shots open, and expect changes once generation starts.

Present the plan as a short list: shot number, one-line action, K or T, a one-line reason, and its length in the edit. Seedance 2.5 can generate a whole scene (up to 30 seconds) as one take, so plan keyframes only where the prompt and the plates can't pin a moment down, and split a scene into shorter takes when a beat keeps failing.

## Step 2: write the keyframes

For each K shot, write a start frame. Add an end frame when the shot has to land somewhere specific: a catch, an expression change, a hand-over to the next scene.

Prompt order:
1. **Frame:** one sentence. The shot, start or end, and the exact moment.
2. **Camera:** shot size, camera height and angle, lens feel, framing. If this is an end frame, write "the same camera as the start frame" unless the camera moves.
3. **Staging:** who is where (screen-left, screen-right, center, foreground, background), poses, eye lines, distances, and what is in their hands.
4. **Expressions:** one clear emotion per face.
5. **Place and light:** which plate, plus its lighting lock, word for word.
6. **References:** name each attached image ("Image 1 is the daughter at two (CD4)..."), then the consistency line for the sheets and plates and the style frame line from section 4 for any style frame. Add one sentence anchoring each character's never-change items. Don't paste full face maps here; the attached sheets carry the looks, and the prompt should spend its words on the composition.
7. **Style:** the MIX block, word for word.
8. **Layout:** Cinematic 21:9 widescreen film still, composed like a key frame from a hand-painted animated film.
9. **Negative:** from section 4, plus "No other people, figures or faces anywhere."

Model: Seedream 5.0 Pro, which handles several reference images in one composite (Nano Banana Pro is the alternative). Attach the character sheets, the plate and the matching style frame.

## Rules that keep keyframes usable

- **Zoom out.** The Higgsfield team's first truck-door shot failed because the frame was mostly big gray shapes, and the model couldn't tell what was where. Show enough of the surroundings to make positions obvious. Avoid frames filled by one face or one shape, except for deliberate close-ups.
- **Every reference must agree.** Before a keyframe becomes a start frame, check each character's never-change items (section 8). If anything is missing, repair it with the image-edits skill first; a missing detail in a keyframe disappears from the shot.
- **Chain the takes.** At a continuous join, the last frame of one take is the first frame of the next (the shots skill has the rules). Plan every end frame as a clean hold, and when an end keyframe exists, use it as the next take's start frame too.
- **Re-lock after any asset update.** A new character design can shift the camera. Regenerate or repair the keyframe whenever a sheet changes.
- **Layout sketch option.** If a composition is hard to put into words, sketch it roughly (stick figures and boxes are fine), photograph it, and attach it with: "Match the composition and camera of the layout sketch exactly; ignore its drawing style."
- **Screenshot option.** When a take nails the camera, screenshot it, repair it so it matches the sheets, and attach it to the next attempts as the camera reference.

## Match-frame transitions

The film flows best when one scene hands over to the next through a shared shape: the last frame of the outgoing shot and the first frame of the incoming shot put the same shape in the same place on screen. Generate the in-between with a video model that takes a start and an end frame. Suggested hand-overs:

| From, to | Shared shape |
|---|---|
| 1 to 2 | The calm eye of the great swirl opens into the downward spiral, at the same screen center. |
| 2 to 3 | The little light's soft streak keeps drifting down through the layers of sky. |
| Inside 3 | The light lands exactly where the newborn's head is in the next frame. |
| 3 to 4 | The mother's arm curved around the newborn's head becomes the curve of the wheat swirling around the wall. |
| 4 to 5 | The same wall, the same framing: years pass, and the teenager stands where the toddler stood. |
| 5 to 6 | The road twisting away becomes the long reflections on the wet city street. |
| 6 to 7 | The long road seen from the apartment window becomes the garden path to the door. |
| 8 to 9 | The same frame of the still blue garden, as color flows back into it. |
| 9 to 10 | Her light rises through the window, and the camera follows it into the sky. |

## Output format

**Scene [N]: [title]. Shot plan**
- [N-1] [action] · K/T · [reason] · [seconds]
- ...

Then, for each K shot:

**[N-x] start frame** (and **[N-x] end frame**)
Model: Seedream 5.0 Pro · Aspect ratio: 21:9
Attach (canon only): [Image 1, Image 2... with codes]

```
[the full keyframe prompt]
```

**Check before using it:** [the never-change items visible in this frame; positions readable; nothing extra in frame]

## Example

Request: "keyframes for the jump in scene 4"

**Scene 4: Jump. Shot plan**
- 4-1 The toddler wobbles along the wall; her mother waits below with open arms · K · two characters in a specific arrangement · 3 s
- 4-2 She jumps; caught and spun; the wheat swirls · K · the catch must land · 3 s
- 4-3 Older now, the girl in mid-air, caught again · K · a time jump inside the scene · 2 s
- 4-4 The field swirling with joy, wide · T · atmosphere · 2 s

**4-2 start frame**
Model: Seedream 5.0 Pro · Aspect ratio: 21:9
Attach (canon only): Image 1 CD4 (the daughter at two), Image 2 CM2 (the mother in her thirties), Image 3 BG8 (the garden), Image 4 SF2 (style frame)

```
Start frame of scene 4, shot 2: the moment the toddler leaves the wall.

CAMERA: Medium-wide shot at a child's eye level, about one meter high, static. The wall runs from the left third of the frame toward the right. Both characters are fully in frame, with plenty of garden around them.

STAGING: The toddler has just pushed off from the top of the wall, right of center, in mid-air with both arms wide and her yellow dress lifting, leaning toward screen-left. The mother stands on the grass left of center, knees slightly bent, both arms open and reaching up toward her, her face turned up to the child.

EXPRESSIONS: The toddler: fearless delight, laughing. The mother: calm, warm and ready.

PLACE AND LIGHT: The garden from Image 3. Golden late afternoon. Low warm sun from the left, long soft shadows, warm gold light on every edge.

REFERENCES: Image 1 is the daughter at two. Image 2 is the mother in her thirties. Image 3 is the garden plate. Use Images 1 to 3 as the exact design: characters, environments and props 100% match them, with the same face maps, proportions, colors and clothing. Image 4 is a style frame, for the paint only: match its paint handling, brushwork and colors; don't copy its composition. The mother keeps her split face (deeper ochre-brown half on her right, light rose-peach half on her left) and the amber crescent-shaped mark under her left eye; the daughter keeps her blue left half with the amber eye.

The world is painted in thick Van Gogh impasto; the people are painted in clean, flat cubist planes. Keep them separate: no swirling strokes on the people, no geometric planes in the landscape. All the texture lives in the world.

Cinematic 21:9 widescreen film still, composed like a key frame from a hand-painted animated film.

No text, letters, labels, numbers, captions, watermark, signature or picture frame anywhere in the image. No photorealism, no 3D render, no anime, no flat vector illustration. No other people, figures or faces anywhere.
```

**4-2 end frame**
Same attachments. Replace FRAME, STAGING and EXPRESSIONS:

```
End frame of scene 4, shot 2: caught, mid-spin. The same camera as the start frame.

STAGING: The mother, now at center, holds the toddler against her chest. They are turned slightly in the spin, the toddler's arms around her mother's neck, the yellow dress swinging out behind. Beyond them, the wheat bends in a swirl around the two of them.

EXPRESSIONS: Both laughing; the mother's eyes closed with joy.
```
(Keep the PLACE AND LIGHT, REFERENCES, style, layout and negative blocks from the start frame unchanged.)

**Check before using it:** the mother's mark is visible on her left cheek in both frames; the toddler's dress matches PR4; the wall and the light from the left match BG8; no extra figures in the wheat.
