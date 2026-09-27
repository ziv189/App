# Clue registry

Every clue the story bible lists ("Clues, all visible on the first playthrough"), plus the clues the Director's Script and `docs/STORY_CHANGES.md` add. Each one must be findable by a careful first-time player without the game pointing at it (brief §7.12).

In Phase 1 this table gets a machine-readable twin in `game/data/clues/` that the clue lint checks against the built scenes (brief §13.2). Until then, "Status" is `not built`.

| ID | Clue | Scenes | How the player meets it | Exact line | Pays off in | Status |
|---|---|---|---|---|---|---|
| C01 | The envelope's postmark, JAN 12 | 3 onward | Legible in close-up on the desk | — | 39: "It came the day before Hale died." | not built |
| C02 | The envelope always says *Not tonight* | 3, 9, 12, 16, 18, 25, 31, 35, 37 | Interaction prompt, even in the morning | *Not tonight.* | 40: "Not tonight, kid." | not built |
| C03 | Frost-killed plants in a room with the heat on full | 5 | Windowsill; Ruth notices | RUTH: "They didn't die of neglect, sir. That's frost damage." | 10: the plants are alive. 41: the window opens in the Hale replay (SC-12). | not built |
| C04 | Each nightmare's clock shows the real time of death, never the coroner's | 2, 10, 17, 23, 32, 38 vs 5, 13, 19 | Wall clocks at 3:40, 3:12, 3:26, 3:05, 3:03; Ames says 11 p.m., 2–5, 2–4 | — | 41: the replay clocks | not built |
| C05 | No forced entry anywhere | 5, 13, 19 | The door, chain and bolt at every scene | WARD (V.O.): "He let his killer in." RUTH: "Or someone with a badge." | 39 and 41 | not built |
| C06 | Lily stands at the door; the monster never touches her and reaches for the door | 2, 10, 17, 23 | Fight behavior and the PROTECT HER drain | — | 41: someone running for their own front door | not built |
| C07 | The roar is someone begging "please," pitched down | 2, 10, 17, 23 | Audio; reversible asset; half-pitched in Night 3 | "...please..." | 24: "It said please." 41. | not built |
| C08 | Nightmares show what investigations never found | 10, 17 | The live plants; the Lily photo on the nail that was empty in 13 | Examine: "Lily. The Carlyle stairs." | 39: the photo from Ward's closet | not built |
| C09 | Something is wrong every morning, and Walt asks "Out late again?" | 3, 12, 18, 25 | Damp coat, loose chain, muddy shoes, cut knuckles, evidence bag, rust smear | WALT: "Out late again, detective?" | 39; the case against Ward's ID (SC-03) | not built |
| C10 | Ward only blacks out alone and free to leave; he sleeps fine in a cell | 27 | No nightmare in the holding cell | — | 34, 39 | not built |
| C11 | The man in the Meridian basement flashed a badge; "tall, long coat" | 19, 30 | Fenn's and Mrs. Ocampo's statements; Ruth glances at Ward's coat | FENN: "Flashed a badge." MRS. OCAMPO: "Tall. Long coat." | 32, 39 | not built |
| C12 | The only nightmare with no fight follows the only death Ward didn't commit | 32 | No monster, no UI | — | 34: "For once, I didn't do anything." | not built |
| C13 | Ruth's nightmare is the first one set somewhere never investigated | 38 | Location | — | 38A, 39 | not built |
| C14 | No mirrors anywhere; four screw holes over the bathroom sink | 3 and all | Set dressing; reflection rules | — | 39: the glass is the only mirror | not built |
| C15 | The silhouette moves only when Ward does | 1, 11, 24, 34, 39 | Soft-focus background mirroring | — | 39 | not built |
| C16 | One line on Walt in the old case file | 6 | Case file insert | "DOYLE, WALTER — building super. Interviewed. No further action." WARD (V.O.): "Walt couldn't hurt a fly." | 39: the DNA match | not built |
| C17 | Shoes with no laces; a steel door with no handle | 1 | One-second insert under the table | — | 39 | not built |
| C18 | A chain clinks below the frame when Ward moves in the Room | 1, 11, 39 | Sound only (SC-10) | — | 39: the tilt-down to the cuffs | not built |
| C19 | Ward wakes in the victims' pose | Every morning; 5, 13, 19; each monster's collapse | Shared pose asset | — | 38: the floor-level shot. 39. | not built |
| C20 | The flashlight gains a dent after each murder night, and none after Pryce's guarded night | 3, 12, 18, 25, 35 | Inventory examine; Ames's "long, heavy, metal" with the flashlight in frame (5) | WARD (V.O.): "Dropped it on the stairs, probably." | 42: Ward sets the dented flashlight on the desk | not built |
| C21 | A single frame of a real, terrified face on every hit | 2, 10, 17, 23 | Subliminal frame (photosensitivity mode swaps it) | — | 41 | not built |
| C22 | Lily's whisper is her scene 40 line played in reverse | 2, 10, 17, 23 | Audio; fragments surface over the nights | "...Mr. Ward..." "...it's... please..." | 40 | not built |
| C23 | Walt's bruised knuckles | 3 onward | Texture state fading by chapter | WALT: "Bar fight. Don't tell the landlord." | 39: DNA entered after his assault arrest | not built |
| C24 | Walt touches 4C's doorframe; the glue rectangle from old police tape | 3, 9, 18 | Animation; set dressing | WALT: "You think about her?" … "Me too." | 39, 40 | not built |
| C25 | Walt's reaction to Hale's death | 3 | Performance beat | WALT: "Huh. Guess some things finish themselves." | 39 | not built |
| C26 | Ruth keeps asking about the lab letter | 6, 22, 29 | Dialogue | RUTH: "Open the letter, Elias." | 39: she asked for the retest | not built |
| C27 | Ward's door opened before three on every murder night | 26 | Ruth's tapes | RUTH: "Every night someone died, your door opened before three." | 39 | not built |
| C28 | Walt heard Ward's door at three | 12 | Dialogue | WALT: "Heard your door around three." | 26; the case against Ward's ID | not built |
| C29 | Gus Pell's alibi covers 11 p.m., the time the open window faked | 8 | Patrolman's note on Pell's card (SC-01) | WARD (V.O.): "Eight men at a card table say otherwise." | C03/C04: the real time of death | not built |
| C30 | Hale's missing watch | 5 | Pale band on his wrist (SC-08) | AMES: "He wore one every day. It's gone." | 19: "Hale's watch. Marsh's photo. Now her badge." 39: the evidence bag. | not built |
| C31 | Ward speaks of the killer's souvenirs in the present tense | 13 | Dialogue | WARD: "He keeps souvenirs." | 39: the box in his closet | not built |
| C32 | An empty evidence bag in Ward's kitchen trash | 18 | Examine | WARD (V.O.): "Evidence bag. I bring the job home." | 39: bags labeled in his handwriting | not built |
| C33 | Ward knocks three times, soft, at Pryce's door without noticing | 21 | Action | — | 41: every replay opens on three soft knocks | not built |
| C34 | A rust smear on Ward's cuff, and the first morning with no new dent | 25 | Examine | WARD (V.O.): "The fire escape at the Meridian. Everything in that building is rusted." | 30, 32 | not built |
| C35 | Bell knocked on Pryce's door at two | 30 | Dialogue (SC-06) | BELL: "Three times, soft. Didn't want to wake the floor." | Why Pryce ran (bible, timeline 6) | not built |
| C36 | Ward writes his own evidence: a question mark under Ruth's motive | 35 | Board action (SC-01) | WARD: "I'll find the motive." | The theme: certainty without a case | not built |
| C37 | Refusing to pin: the suspect dies anyway, and the card is finished in Ward's handwriting | Refusal beat | Board state next morning (SC-02) | WARD (V.O.): "He wasn't reading the board. He was reading me." | The killer is Ward | not built |
| C38 | Ward says he never left, but he was on camera until 00:10 | 1, 3, 6, 12 | Dialogue against the booking footage | WARD: "I never left." | 26, 39 | not built |
