---
name: ill-catch-you-shots
description: Writes Seedance 2.5 video prompts for the shots and scenes of the animated short I'll Catch You, in the production's house format - INPUTS with numbered image reference tags, scene context, style, location map, first frame and blocking, format mode, optics, camera, timed action with x/y screen positions read from the approved plates, physics, animation principles, lighting, audio, positive locks and negatives - for an asset-first, no-3D pipeline where every detail a 3D previs would have given is written out. Handles the film's hard parts - subtle acting, faceless lights, the flat crowd, brushstrokes that move with emotion and stop in grief, and empty frames that attract strangers - and keeps every prompt under Seedance's 20,000-character limit. Use this whenever the user asks for a video prompt, shot prompt, scene prompt, animation prompt, image-to-video or text-to-video prompt or a Seedance prompt, wants to generate, animate or fix a shot or scene, or names a scene or shot of the film.
---

# I'll Catch You: video prompts

Turn a planned shot or a whole scene ("scene 2, one 15-second take") into a complete Seedance 2.5 prompt for Higgsfield, with the references to upload and what to check in the take.

## Why the prompt is so long

The Higgsfield team writes "an essay for a four-second shot" because every detail you leave out, the model decides for you, and it guesses badly. Their prompts also had a 3D previs to lock camera and timing. This production has none, so the prompt carries everything a previs would have shown: where everything is on screen, when each beat happens, how the camera moves, how things move and how they sound. Three rules matter most:
- **Order.** The model weighs the start of the prompt most, so INPUTS, SCENE CONTEXT and STYLE come first.
- **Every detail, once.** Describe everything, but say each thing in one place. Repeated lines waste the character budget and blur what matters.
- **Agree with the images.** Describe the references only as they really are. If you haven't seen an approved image, ask the user to share it before writing positions, because a description that contradicts a reference fights it.

## Seedance 2.5 in Higgsfield

- Takes of up to 30 seconds at 21:9. A whole scene can be one take. When one beat keeps failing, split it off and redo only that part.
- **The prompt limit is 20,000 characters.** Count before delivering and stay under it with some margin.
- Upload the canon images as references and tag them in the prompt as <<<image_1>>>, <<<image_2>>> and so on, in upload order. Give the upload order with the prompt.
- Seedance generates sound in the same pass. Write "Sound effects only: no music, no score, no singing, no humming, no speech" in FORMAT MODE and again in AUDIO, and list the sounds with timestamps. The five-note melody is added in post.
- If a last-frame slot works alongside the references, the end plate or keyframe can go there too.

## Joins between clips

Every clip has to pick up exactly where the last one left off, or cut cleanly to a new angle. Decide which for each join before writing.
- **Continuous join** (no cut, the same moment goes on): the next clip starts on the previous clip's last frame. The user exports that frame as a full-quality PNG from the downloaded clip, checks it against the never-change lists (repair it first if anything drifted, or every later clip inherits it), and uploads it as <<<image_1>>>, before the canon references. FIRST FRAME / BLOCKING then says "The shot starts exactly on <<<image_1>>>: every position, size, color and stroke identical" and gives its positions, read from the frame itself. Seedance 2.5's extend option (forward from the last frame) is the alternative; check the seam frame by frame.
- **Cut** (a new angle or place): no shared frame, but the same canon references, the same STYLE, LIGHTING and NEGATIVES text and the same settings, so the looks match. Keep the sizes and positions of characters and lights consistent with where the previous clip left them, unless the new angle explains the change.
- **Always:** end every clip on a hold of at least half a second, with its end state (positions, sizes, states) written in POSITIVE LOCKS, so the last frame is clean and the next prompt knows where to begin. Keep the canon references in the same upload order across clips, and the same model, resolution and selectors for every clip of a scene. For a continuous join, overlap: start the next clip half a second before the previous one ended, repeating the end of the movement, so the edit can cut in mid-motion.
- **Ask for the frame.** Before writing a prompt that continues a clip, ask the user for that clip's last frame and read the positions from it.

## Before writing

Read `references/film-bible.md`, sections 1 (scenes), 4 (style lock), 6 (lighting locks), 7 (literal words), 8 (face maps, for the never-change items), 10 (the lights), 11 (flat people), 15 (personalities), 16 (known risks) and 17 (asset register). Read `references/example-scene-1.md`, the approved scene 1 prompt, as the model for format, depth and length.

Settle five things, asking only if they can't be inferred:
1. **The beats,** in story order, one emotional beat per moment (section 16).
2. **The length** the user wants (often 15 seconds). Budget the beats so they add up exactly, with a short hold at the start and the end.
3. **The references:** which canon sheets, plates and keyframes, in upload order. If a needed asset doesn't exist yet, say so and offer the matching skill.
4. **The screen map:** positions as x / y percentages of the frame (x from the left, y from the top), read from the approved plates themselves: landmarks, the path of every move, where characters stand and land, sizes as a share of the frame width. A position that doesn't match the plate is a mistake.
5. **The camera:** locked off, push-in, pan or tilt, one clear move at a time, each ending on a named plate.
6. **The joins:** how this clip continues the previous one (its last frame, or a cut) and how it hands over to the next (a clean final hold).

## The blocks

Write them in this order, each under its heading in capitals.

1. **INPUTS.** One entry per reference: `<<<image_n>>> = ...`. Say what it is, describe what is actually in it (identifying details and positions), give personality from section 15 for characters and lights, and end with "100% match <<<image_n>>>". Put the never-change items here: the face maps' halves and marks, which items on a sheet appear and which never do, and what an object must never turn into ("it never rotates, and it is not the moon").
2. **SCENE CONTEXT.** Plain sentences: where we are in the story, what happens in summary, the length ("One continuous shot, 15 seconds, no cuts") and the feeling.
3. **STYLE.** A hand-painted 2D Van Gogh world whose strokes always move gently (they stop only in scene 8) and never melt, blur or smear; clean, flat cubist characters who keep their face maps from every angle; all texture in the world. Add the LIGHTS block word for word whenever a light is in the shot, and the FLAT PEOPLE block for flat people.
4. **LOCATION MAP.** Where the camera is and what it faces; foreground, middle ground and background; which plate each part of the shot plays on; what lies out of frame until a camera move reveals it.
5. **FIRST FRAME / BLOCKING.** The exact first frame: who and what is where (x / y), poses, expressions, sizes and the light already on them.
6. **FORMAT MODE.** One continuous take, or labeled shots separated by "HARD CUT"; the length; 21:9; no transitions unless wanted; the sound-effects-only line.
7. **OPTICS.** A normal lens feel for this painted film: no distortion, no depth-of-field blur, no motion-blur smear, parallax between painted layers, no zoom.
8. **CAMERA.** Timestamped moves that add up to the full length, each easing in and out and ending on a named plate; framing rules (who must stay readable and never cropped); no shake, no handheld wobble.
9. **ACTION TIMING.** The heart of the prompt: timestamped beats that cover every second with no gaps or overlaps (`0.0-0.4 s: ...`). For each beat: who moves where (x / y), how (arcs, speed), which named state or expression from the sheets, what the world does in answer, and how long each hold lasts. Holds are acting, so write them.
10. **PHYSICS.** How things move in this world: weight or weightlessness, the flow of the strokes, soft impacts, and what never happens (nothing burns, breaks or splashes).
11. **ANIMATION PRINCIPLES.** The ones this shot needs, tuned to the film: anticipation before every jump, reach and hop; arcs; squash and stretch gentle on bodies and on the little light, none on faces or on the amber light's shape; follow-through on hair, dress hems, scarves, wheat and trails of dabs; slow in and slow out; secondary action, with the world's strokes answering the emotion; timing, holding on the emotional beat; staging, one clear action at a time; restrained exaggeration; solid drawing, with planes and face maps consistent as characters turn; appeal.
12. **LIGHTING.** The location's lighting lock from section 6 word for word, then the details: what is lit by what, which lights move, the brightness order, what changes during the shot, and what must never appear (no moon, no lamp, no lens flare, no color shift).
13. **AUDIO.** The no-music line again, then the sound effects with timestamps that match ACTION TIMING.
14. **POSITIVE LOCKS.** The rules that must hold, written positively: the order of events, counts ("it flares exactly twice"), what stays the same in every frame, how the shot starts and ends. End with "Clean, crisp frame."
15. **NEGATIVES.** Always: no people, figures or faces anywhere (or "other than the referenced characters"); the lights have no faces and no bodies; no text, letters, numbers, subtitles, logos, watermark or signature; no photorealism, no 3D render, no CGI look, no anime, no flat vector illustration. Then the shot's own, such as no brush or hands in a sky that paints itself, or no fire or smoke on the lights.

## Before delivering

- The ACTION TIMING and CAMERA timestamps each run from 0.0 to the full length with no gaps or overlaps, and the AUDIO cues sit on the same seconds.
- Every position matches the plate it plays on, and every path stays inside the frame when it must.
- No contradictions: a light that "never rotates" doesn't "turn around", and something that "rises" ends higher than it started.
- No literal-word traps (section 7). The models also take "river", "wave", "eye", "storm", "candle" and "sparks" literally.
- The first frame continues the previous clip's last frame (continuous join) or matches its looks (cut), and the last beat is a clean hold.
- Under 20,000 characters.

## The performance gap

Video models handle big action well and small acting badly, and this film is full of small acting. For acting moments:
- Give each change of expression its own beat, with a hold before and after it ("holds still, eyes on the empty hands, from 5.5 to 7.0 s").
- Name the expressions from the expression sheets and upload those sheets.
- Keep acting moments medium-close and the hands simple.
- Let the world carry the feeling: strokes speeding up, slowing, stopping, color draining or returning.
- If a beat still doesn't land after a few takes, give it a keyframe (the keyframes skill), split it into its own take, or plan it as painted stills dissolving in the edit. Say plainly when a moment is on the high-risk list (section 16).

## Output format

**Scene [N] · [name]** (or **Shot [N-x]: [name]**)
Settings: Seedance 2.5 · [length] · 21:9 · about [count] characters (limit 20,000)
Upload as references, in this order: 1. [the previous clip's last frame, for a continuous join] 2. [code]: [what it is] 3. ...

```
INPUTS
...
(all fifteen blocks, in order)
```

**Check the take**
- [four to six checks: beats and holds on time, positions and paths, never-change items, the first and last frames, no strangers, no faces on the lights, no text, no music or speech]

If the take fails, name the likely cause and the next move: a repaired or wider reference, a keyframe, a split take or a shorter beat. Don't just reroll the same prompt.

## Example

`references/example-scene-1.md` is the approved scene 1 prompt: a 15-second single take with no characters that shows the house format, the depth of detail and the length. For shots with characters, add their never-change items to INPUTS and POSITIVE LOCKS, name their expressions from the sheets, and give their positions and poses as precisely as the lights' positions are given there.
