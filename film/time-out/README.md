# TIME OUT

An adult animated comedy short, about **3:45**. It looks like a family movie and plays like an adult comedy.

> Three bumbling burglars hit the house of a burnt-out single dad during nap time. They find out the real threat in the house is his four-year-old son, Brayden, a pint-sized tyrant who has been breaking grown men since daycare.

**Cast:** Glenn (the dad) · Brayden (4, the brat) · Vince, Duane & Petra (the thieves) · Officer Dale (optional cameo)

## Files

| File | What's in it |
|---|---|
| [`screenplay.md`](screenplay.md) | The full script: 10 scenes with every line of dialogue |
| [`characters.md`](characters.md) | Character look tags, voice notes, character-sheet and set prompts, the style block, on-screen text list, continuity tracker, music cues, and "The Wiggly Worm Song" |
| [`refs/brayden-sketch.jpg`](refs/brayden-sketch.jpg) | The original Brayden drawing. Use it as the reference for his character sheet |
| [`scenes.md`](scenes.md) | Shot-by-shot breakdown: 50 shots with timecodes, durations, start-frame **Image** prompts, **Motion** prompts, dialogue, audio and post notes |

## Making it in Higgsfield

1. **Lock the look first.** In `characters.md`, generate a character sheet for each character and an empty image of each set. Pick one favorite of each. If you use Higgsfield's character-consistency or reference tools, build each character from those sheets.
2. **Start frames.** For each shot in `scenes.md`, generate the **Image** prompt with that shot's character and set references attached, plus the style block.
3. **Animate.** Run image-to-video with the **Motion** prompt, one action per clip. Generate at the model's minimum length and trim to the listed duration.
4. **Voices.** There are two routes:
   - A video model with native audio: add `CHARACTER says: "line"` to the Motion prompt.
   - *Recommended:* record or generate each character's lines separately, then lip-sync. This keeps each voice the same across all 50 clips.
5. **Edit.** Assemble the shots in order in CapCut, Premiere or DaVinci. Then add the on-screen text (signs, phone and laptop screens), the bleeps, the music cues and the SFX.

## Tips

- Keep swear words **out of generation prompts**. Put them in the voice track and bleep them in the edit.
- AI video garbles text. Every sign and screen is listed in `characters.md` so you can add them as overlays.
- If a prompt gets flagged, describe Brayden as "a small cartoon toddler character" and the crew as "cartoon burglars."
- If you need it shorter, the end of `scenes.md` shows how to cut down to about 3:00.
