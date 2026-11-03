# TIME OUT: rough cut, clips 1-16

`time-out-rough-cut.mp4`: 1280x720, 24 fps, H.264 + AAC, about 5:24.80. Built by `build_rough_cut.py`, frame-exact.

## How it's cut

- **Order:** script order, with hard cuts only. The film fades in from black at the start and fades out at the end.
- **Title:** "TIME OUT" in red crayon lands on the sippy-cup knock at the end of clip 3. The final frame is held for 1.8s so the title can be read.
- **Clip 4's start:** its first 2 frames were leftover frames of the title shot, so they're dropped.
- **Montage (clips 6-7):** the shots are interleaved: basement, footlocker opens, contents, manual / face paint / helmet, caltrops, safe closing, then "Nap time, [BLEEP]." as the button. The safe shot's slow first 2s are trimmed.
- **Clip 11 + 11b:** Brayden's line in the dark is cut in after Vince's outburst. We come back on Vince's eyes going wide as he looks over his shoulder.
- **Blackout (clips 12-13):** the hallway runs up to just before its clack, then the basement breaker CLACK, then back to the eyes in the dark ("Nobody [BLEEP] move!"), then the goggles and night vision. The hallway's own duplicate clack is cut.
- **Audio:**
  - Each source is gain-matched (the gains are in the table).
  - Every cut has a 15 ms fade so there are no clicks.
  - The whole film is normalized to -16 LUFS, -1.5 dBTP, with dynamics kept.
  - There's no music yet.
- **Picture:** the 480p sources are upscaled to 720p with Lanczos. Clips 15-16 were already 720p.

## Timeline

| # | At | Source | In | Out | Length | Gain | What |
|---|---|---|---|---|---|---|---|
| 1 | 0:00.00 | Video 1 (clips 1-2) | 0:00.00 | 0:40.08 | 40.08s | +1.4 dB | Clips 1-2: van, "setting the tone", pen gadget, phone, nap schedule |
| 2 | 0:40.08 | Video 2 (clip 3) | 0:00.00 | 0:20.04 | 21.84s | +0.7 dB | Clip 3: plan photo, Duane, aviators, window, TIME OUT title on the cup knock |
| 3 | 1:01.93 | Video 3 (clips 4-5) | 0:00.08 | 0:40.04 | 39.96s | -0.8 dB | Clips 4-5: nap time (first 2 frames dropped: leftover title frames) |
| 4 | 1:41.88 | Video 4 (clips 6-7) | 0:00.00 | 0:02.92 | 2.92s | +4.0 dB | Montage 6.1: basement |
| 5 | 1:44.80 | Video 4 (clips 6-7) | 0:02.92 | 0:05.96 | 3.04s | +4.0 dB | Montage 6.2: footlocker opens |
| 6 | 1:47.84 | Video 4 (clips 6-7) | 0:20.25 | 0:24.96 | 4.71s | +4.0 dB | Montage 7: footlocker contents |
| 7 | 1:52.55 | Video 4 (clips 6-7) | 0:05.96 | 0:14.71 | 8.75s | +4.0 dB | Montage 6.3-6.5: manual, face paint, helmet |
| 8 | 2:01.30 | Video 4 (clips 6-7) | 0:24.96 | 0:30.17 | 5.21s | +4.0 dB | Montage 7: caltrops |
| 9 | 2:06.51 | Video 4 (clips 6-7) | 0:32.21 | 0:39.92 | 7.71s | +4.0 dB | Montage 7: safe closes (trimmed head) |
| 10 | 2:14.22 | Video 4 (clips 6-7) | 0:14.71 | 0:20.25 | 5.54s | +4.0 dB | Montage 6.6: "Nap time, [BLEEP]." |
| 11 | 2:19.76 | Video 5 (clips 8-9) | 0:00.00 | 0:40.12 | 40.12s | +3.0 dB | Clips 8-9: backyard, socks, audio monitor, kitchen |
| 12 | 2:59.88 | Video 6 (clip 10) | 0:00.00 | 0:20.04 | 20.04s | +1.3 dB | Clip 10: caltrops, five swears, five dollars |
| 13 | 3:19.92 | Video 7 (clip 11) | 0:00.00 | 0:16.04 | 16.04s | -0.9 dB | Clip 11: safe, salt, "ROCK SALT?!" |
| 14 | 3:35.97 | Video 8 (clip 11b) | 0:00.54 | 0:05.75 | 5.21s | +5.0 dB | Clip 11b: "Daddy says the real ones make a mess." |
| 15 | 3:41.17 | Video 7 (clip 11) | 0:16.42 | 0:20.04 | 3.62s | -0.9 dB | Clip 11: Vince looks over his shoulder |
| 16 | 3:44.80 | Video 9 (clips 12-13) | 0:00.00 | 0:11.79 | 11.79s | +3.0 dB | Clip 12: regroup, pistol, "rob a nap?" (cut before the clack) |
| 17 | 3:56.59 | Video 9 (clips 12-13) | 0:20.17 | 0:23.25 | 3.08s | +3.0 dB | Clip 13 shot 1: breaker CLACK |
| 18 | 3:59.67 | Video 9 (clips 12-13) | 0:12.04 | 0:20.17 | 8.12s | +3.0 dB | Clip 12: eyes in the dark, "Nobody [BLEEP] move!" |
| 19 | 4:07.80 | Video 9 (clips 12-13) | 0:23.25 | 0:40.08 | 16.83s | +3.0 dB | Clip 13 shots 2-4: goggles, night vision, the squeak |
| 20 | 4:24.63 | Video 10 (clip 14) | 0:00.00 | 0:20.04 | 20.04s | +1.8 dB | Clip 14: BANG, "You SHOT me!", Glenn snores, lights on, the laugh |
| 21 | 4:44.68 | Video 11 (clips 15-16) | 0:00.00 | 0:40.12 | 40.12s | +0.7 dB | Clips 15-16: knives, "almost my [BLEEP]", wallets |

## Still to add in your editor

- **Music:** "Cul-de-Sac Caper", "Music Box", "Suit Up" under the montage, and the Wiggly Worm Song for the tea party.
- **On-screen text:** the van side, Vince's phone, the whiteboard, the footlocker stencil, the manual cover, SWEAR JAR, and DADDY'S MONEY on the safe.
- **Missing clips:** 15b (knife hand) and 16b (Brayden's "Wallets." line) weren't in this batch. Neither were 17 / 17b and anything later.
