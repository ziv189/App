# I'll Catch You: production skills

Eight Claude skills that turn short requests into Higgsfield-ready prompts for the film, following the asset-first workflow from Higgsfield Animation's *Passport Rush* breakdown. The 3D steps are replaced with keyframes, layout sketches and screenshots of good takes.

All eight share one film bible (`_shared/film-bible.md`): the story, style lock, face maps, wardrobe, lighting locks, palette, risks and the register of all 71 image inputs.

## The skills, in production order

| Step | Skill | Ask it for |
|---|---|---|
| Style frames, hero faces, character sheets | `ill-catch-you-characters` | "hero face for the mother", "CD7", "the daughter at 75, poses" |
| Props | `ill-catch-you-props` | "the yellow dress", "PR1" |
| Background plates | `ill-catch-you-environments` | "the garden in autumn", "BG14" |
| Effects | `ill-catch-you-effects` | "the light rising", "FX6" |
| Fixes and variants | `ill-catch-you-image-edits` | "take 2 has the face, take 4 has the hair", "the mark is missing in this screenshot" |
| Shot planning and keyframes | `ill-catch-you-keyframes` | "plan scene 7", "start and end frames for 4-2" |
| Video prompts | `ill-catch-you-shots` | "video prompt for 4-2" |
| Review (asset manager) | `ill-catch-you-asset-review` | share an image or take and ask "good?" |

Style frames (SF1 to SF5) come first: the environments skill writes SF1 and SF5 (the sky), and the characters skill writes SF2, SF3 and SF4 (people in a place).

## Install

- **From the chat:** tap **Save skill** on each `.skill` file card.
- **On claude.ai:** upload each file from `dist/` in the Skills section of Settings (the menu name may differ slightly).

Each skill triggers on its own when your request matches. You can also name it: "use the shots skill for 4-2".

## How the workflow maps from the Higgsfield breakdown

| Higgsfield team | This film |
|---|---|
| Asset-first: image inputs decide the film | Same. Five style frames and two hero faces gate everything. |
| Asset managers keep everything in one world | The asset-review skill does that check on every image. |
| Short request to Claude, then the full prompt | Every skill takes a short request or an asset code. |
| Soul 2.0, batch of 4, then hand edits in Photoshop | Same, plus a hand-finish pass: palette color, missing marks, a brushed contour on characters. |
| Edits in Seedream 5.0 Pro ("Cream 5.0 Pro" in the transcript) | The image-edits skill: one change per pass. |
| Watercolor taxi broke in motion; the car went clean | Texture budget: the world keeps the paint; characters and held props stay clean. |
| Golden hour fixed the dull locations | A lighting lock per location, pasted word for word. |
| "Mushroom-shaped explosion" became a mushroom | A list of words the models take literally (crescent, cradle, soul, halo...). |
| Blender previs for complex shots | Keyframes, layout sketches and screenshots (keyframes skill). |
| Five-block video prompt, references as a call sheet | The shots skill, same five blocks. |
| Random people in empty shots | A no-people line in every empty shot. |
| Missing headphones in a reference screenshot | Repair every reference before attaching it. |
| The performance gap: subtle acting is hardest | One beat per shot, written holds, expression changes in the keyframes. |

## Changing the bible

Edit `_shared/film-bible.md`, then run `./build.sh`. It copies the bible into every skill and rebuilds the files in `dist/`. Install the new files again to update the skills in Claude.
