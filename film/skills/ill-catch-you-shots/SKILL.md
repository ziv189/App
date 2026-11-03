---
name: ill-catch-you-shots
description: Writes Higgsfield video generation prompts for the shots of the animated short I'll Catch You in a fixed five-block structure - scene context and style, an active-reference call sheet, shot structure with beat-by-beat timing, locks and constraints, and animation principles - for an asset-first, no-3D pipeline where approved sheets and plates are attached as image inputs and keyframes serve as start and end frames. Handles the film's hard parts - subtle acting, faceless lights, the flat crowd, brushstrokes that move with emotion and stop in grief, and empty frames that attract strangers. Use this whenever the user asks for a video prompt, shot prompt, scene prompt, animation prompt, image-to-video or text-to-video prompt, wants to generate, animate or fix a shot or scene, or names a scene or shot of the film.
---

# I'll Catch You: video shot prompts

Turn a planned shot ("4-2, the toddler jumps and is caught") into a complete video prompt for Higgsfield, with the inputs to attach and what to check in the take.

## Why the prompt is long

The Higgsfield team writes "an essay for a four-second shot" because every detail you leave out, the model decides for you, and it guesses badly. Two things about their structure matter most:
- **Order.** The model weighs the start of the prompt most and follows the rest less strictly, so the first block carries what matters most.
- **Looks come from the images.** The prompt names each attached input and its role. It describes personality and behavior, never looks. Visual description in a video prompt competes with the references.

## Before writing

Read `references/film-bible.md`, sections 1 (scenes), 4 (the consistency line), 6 (lighting locks), 7 (literal words), 10 (the lights), 11 (flat people), 15 (personalities), 16 (known risks) and 17 (asset register).

Settle four things, asking only if they can't be inferred:
1. **The one beat this shot must land.** One emotional beat per shot (section 16).
2. **The route:** K (keyframes as start and end frames) or T (assets only). If the shot needs keyframes and they don't exist yet, say so and offer the keyframes skill.
3. **The inputs:** which canon sheets, plate, keyframes and camera screenshots will be attached, in order.
4. **The duration:** 3 to 8 seconds. Split anything longer into separate generations.

## The five blocks

Write them in this order, each under its heading.

**1. SCENE CONTEXT AND STYLE.** Three to five plain sentences: where we are in the story, what happens in this shot, and the feeling. Then the rules of this world:
- a hand-painted Van Gogh world whose brushstrokes are always gently moving (they stop only in scene 8);
- clean, flat cubist characters who keep their face maps from every angle;
- all texture stays in the world;
- the lights glow and drift on curves; they don't fly like comets, and they have no faces.

Then the location's lighting lock, word for word.

**2. ACTIVE REFERENCES.** A call sheet: one line per attached input, in attachment order. Give its role, and for characters a few words of personality from section 15 ("Image 2: the mother in her thirties (CM2): calm, tender, endlessly patient."). Name keyframes as "Start frame" and "End frame", and a camera screenshot as "Camera reference". Then the consistency line: "Characters, environments and props 100% match the reference images." No visual description here; that is what the images are for.

**3. SHOT STRUCTURE.** Each shot under its own label, separated by "HARD CUT" (or "One continuous shot."). Give each shot its duration, the camera (static, slow push-in, gentle pan left, rising) and the action beat by beat with timestamps, written like a storyboard panel in words: what happens first, what comes next, and how long each hold lasts ("0.0 to 1.0 s: ... Holds still until 2.5 s."). Holds are part of the acting, so write them explicitly.

**4. LOCKS AND CONSTRAINTS.** The rules the model must follow. Always include:
- No music, no singing, no speech. Sound effects only. (The five-note melody is added in post.)
- No text, subtitles or logos.
- No people, figures or faces other than the referenced characters. In shots without characters: "No people, no figures and no faces anywhere."
- Characters keep their face maps from every angle. Then name this shot's never-change items, for example: "the mother's amber crescent-shaped mark stays under her right eye; the daughter's blue half and amber eye stay on her left".
- The lights have no faces and no bodies (whenever a light is in frame).
- Texture stays in the world. Characters stay clean, flat and cubist. No realism, no 3D look, no camera shake.

Then add the locks specific to this shot: the order of events ("she stays on the wall until 1.0 s"), what must not happen ("the mother does not step forward"), and what must stay still.

**5. ANIMATION PRINCIPLES.** List the ones this shot needs, tuned to the film:
- Anticipation before every jump and every reach.
- Squash and stretch gentle on bodies and none on faces: cubist planes stay rigid.
- Follow-through and overlapping action on hair, scarf, dress hems and the wheat.
- Slow in and slow out on every tender movement.
- Arcs: the lights and the reaching arms move on curves.
- Secondary action: the world's brushstrokes answer the emotion (the wheat swirls with joy; the sky slows in sadness).
- Timing: hold on the emotional beat.
- Staging: one clear action at a time, readable silhouettes.
- Restrained exaggeration: this is a tender film.
- Solid drawing: the planes and face maps stay consistent as characters turn.
- Appeal: warm, gentle, lovable.

The Higgsfield team found the model doesn't follow all of these, but including them got them closer to the movement they wanted.

## The performance gap

Video models handle big action well and small acting badly, and this film is full of small acting. For acting shots:
- Put the change of expression into the keyframes: the start frame holds the first expression, the end frame the second.
- Write the pause. A realization only reads if the shot holds still for a beat ("holds still, eyes on the empty hands, from 1.5 to 3.0 s").
- Keep acting shots medium-close and the hands simple.
- Let the world carry the feeling: strokes speeding up, slowing, stopping, color draining or returning.
- If the beat still doesn't land after a few takes, split it into two shots, or plan it as painted stills dissolving in the edit. Tell the user plainly when a shot is in the high-risk list (section 16).

## Output format

**Scene [N] · Shot [N-x]: [name]**
Route: K / T · Duration: [seconds] · In Higgsfield: attach the inputs below as image inputs; use the keyframes as start and end frames if the video model supports them.
Attach, in this order: [the list matching the call sheet]

```
SCENE CONTEXT AND STYLE
...

ACTIVE REFERENCES
...

SHOT STRUCTURE
...

LOCKS AND CONSTRAINTS
...

ANIMATION PRINCIPLES
...
```

**Check the take**
- Timing matches the beats and the holds.
- The camera matches the keyframes or camera reference.
- Face maps hold when characters turn; marks are in place.
- No extra people, no faces on the lights, no text, no music or speech.
- Texture isn't crawling on characters or props.

If the take fails, name the likely cause and the next move: a wider keyframe ("zoom out"), a repaired reference, a shorter shot, a split beat, or a new end frame. Don't just reroll the same prompt.

## Example

Request: "video prompt for 4-2, the jump"

**Scene 4 · Shot 4-2: The jump**
Route: K · Duration: 3 s · In Higgsfield: attach the inputs below as image inputs; use the keyframes as start and end frames if the video model supports them.
Attach, in this order: start frame 4-2, end frame 4-2, CD4, CM2, BG8, SF2

```
SCENE CONTEXT AND STYLE
A little girl's first fearless jump from the garden wall into her mother's arms, the moment the film's promise is born: she jumps, and her mother catches her. Pure joy. A hand-painted Van Gogh world whose brushstrokes are always gently moving; clean, flat cubist characters who keep their face maps from every angle; all texture stays in the world. When she is caught, the wheat answers the joy and swirls around them. Golden late afternoon. Low warm sun from the left, long soft shadows, warm gold light on every edge.

ACTIVE REFERENCES
Start frame: the toddler leaving the wall, her mother waiting below.
End frame: caught, mid-spin.
Image 1: the daughter at two (CD4): fearless, wobbly, delighted.
Image 2: the mother in her thirties (CM2): calm, tender, endlessly patient.
Image 3: the garden (BG8).
Image 4: the style frame (SF2), for the look only.
Characters, environments and props 100% match the reference images.

SHOT STRUCTURE
One continuous shot, 3 seconds. Static camera at a child's eye level.
0.0 to 0.6 s: the toddler is already in the air, arms wide, dress lifting, drifting toward her mother on a soft arc.
0.6 to 1.2 s: the mother takes her weight against her chest, bending her knees to absorb it.
1.2 to 2.4 s: the mother turns one slow full spin with her; the yellow dress swings out; the wheat behind them bends into a swirl.
2.4 to 3.0 s: they settle, both laughing; hold.

LOCKS AND CONSTRAINTS
No music, no singing, no speech. Sound effects only.
No text, subtitles or logos.
No people, figures or faces other than the mother and the daughter.
Characters keep their face maps from every angle: the mother's amber crescent-shaped mark stays under her right eye; the daughter's blue half and amber eye stay on her left.
The mother stays on the grass and does not step toward the wall; the catch happens at the center of the frame.
Texture stays in the world. Characters stay clean, flat and cubist. No realism, no 3D look, no camera shake.

ANIMATION PRINCIPLES
Squash and stretch gentle on the bodies as she lands, none on the faces. Follow-through on the dress, the hair and the wheat. Slow in and slow out on the spin. Arcs for the flight and the spin. Secondary action: the wheat swirls in answer. Hold on the laugh. Solid drawing: the planes stay consistent as they turn. Appeal: warm and lovable.
```

**Check the take**
- She is caught by 1.2 s and the spin ends by 2.4 s.
- The mother's mark stays visible through the spin.
- No figures appear in the wheat.
- The dress stays the heirloom yellow (PR4).
