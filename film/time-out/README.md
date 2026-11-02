# TIME OUT

An **18+** animated comedy short, about **4:00**. Strong language throughout, nothing bleeped. It looks like a cozy family movie, and what happens in it is an adult cartoon.

> Three bumbling burglars hit a single dad's house during nap time, figuring his army days are long behind him. They didn't count on his four-year-old son finding Daddy's old footlocker.

**Cast:** Glenn (the ex-army dad) · Brayden (4, the brat) · Vince, Marco & Duane (the thieves) · Officer Dale (optional cameo)

**Traps:** a hallway full of spikes (caltrops) · a rock-salt shotgun inside a safe · a blackout where Vince shoots Duane in the leg by accident · a tripwire knife rack (Marco gets outlined, Vince gets one in the hand) · a grenade (it's a dummy) · a swear jar on an RC truck that steals wallets

## Files

| File | What's in it |
|---|---|
| [`screenplay.md`](screenplay.md) | The full script: 11 scenes with every line of dialogue |
| [`characters.md`](characters.md) | Character look tags, voice notes, character-sheet and set prompts, the style block, on-screen text list, continuity tracker, music cues, and "The Wiggly Worm Song" |
| [`character-prompts.md`](character-prompts.md) | One long, full-body reference prompt per character (plus Brayden's war mode and a cast lineup), all sharing the same style, framing and lighting. **Start here** |
| [`scenes.md`](scenes.md) | Shot-by-shot breakdown: 63 shots with timecodes, durations, start-frame **Image** prompts, **Motion** prompts, dialogue, audio and post notes |
| [`refs/`](refs/) | The original character sketches: `brayden-sketch.jpg`, `glenn-sketch.jpg`, `vince-sketch.jpg`, and `marco-and-duane-sketch.jpg` (Marco on the left, Duane on the right) |

## Making it in Higgsfield

1. **Lock the look first.** For each character, upload their sketch from `refs/` as the reference and use their prompt in `character-prompts.md` (start with Glenn, then use his image as the style reference for everyone else). Optionally, also make turnaround sheets with the template in `characters.md`. Brayden needs two sheets: regular, and war mode with camo paint and helmet. Then generate an empty image of each set. Pick one favorite of each. If you use Higgsfield's character-consistency or reference tools, build each character from those sheets.
2. **Start frames.** For each shot in `scenes.md`, generate the **Image** prompt with that shot's character and set references attached, plus the style block.
3. **Animate.** Run image-to-video with the **Motion** prompt, one action per clip. Generate at the model's minimum length and trim to the listed duration.
4. **Voices.** There are two routes:
   - A video model with native audio: add `CHARACTER says: "line"` to the Motion prompt.
   - *Recommended:* record or generate each character's lines separately, then lip-sync. This keeps each voice the same across all 63 clips.
5. **Edit.** Assemble the shots in order in CapCut, Premiere or DaVinci. Then add the on-screen text (signs, stencils, phone and laptop screens), the music cues and the SFX.

## Tips

- **Kid + weapon in one frame usually gets blocked** by AI video tools. The breakdown already keeps knives, guns and spikes in their own shots, away from Brayden. Cut them back to back and it plays the same.
- **It's 18+ and nothing is bleeped.** If a video tool refuses a prompt because of the swearing, leave that line out of the video prompt, generate the voice separately, and lip-sync it.
- AI video garbles text. Every sign, stencil and screen is listed in `characters.md` so you can add them as overlays.
- If a prompt still gets flagged, call the weapons "cartoon props" and describe Brayden as "a small cartoon toddler character."
- If you need it shorter, the end of `scenes.md` shows what to cut to get to about 3:30.
