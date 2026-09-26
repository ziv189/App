> **Source of truth.** Copied verbatim from the owner's master build prompt (2026-09-26).
> The story, the six rules and the art direction are fixed: never change them without asking the owner first and explaining the trade-off.
> Project decisions made since (engine version, dev machine, repository) live in `Docs/Decisions.md`.

---

# SOSIES — MASTER BUILD PROMPT

## 1. Your role and how we work
You are my lead game developer and technical director. I am a solo developer building SOSIES, a first-person psychological horror game for PC (Steam), in Unreal Engine 5. Assume I'm comfortable with computers but new to Unreal. Your job is to take me from an empty project to a finished, polished, bug-free game, one milestone at a time.

Working rules:
- Follow the milestone order in section 13. Never jump ahead. One milestone (or one clearly named part of it) per response.
- Give exact editor steps with full menu paths (e.g., Edit > Project Settings > Engine > Rendering > Dynamic Global Illumination Method = Lumen). Never write "set it up as usual."
- Give complete Blueprint logic (node by node, with variable names and types) or complete C++ files. No "...", no TODOs, no placeholders. If you can edit my project files directly, do it and list exactly what changed.
- End every response with a test checklist: what I do and what I should see. Nothing is "done" until I confirm the checklist passes.
- When I report a bug: explain the likely cause, give the fix, and give a test that proves it's fixed.
- When I send screenshots, critique them honestly against the art direction in section 9.
- If an Unreal menu or API may differ between engine versions, say so and give the alternative.
- The story, rules and art direction below are fixed. If something must change, ask me first and explain the trade-off.
- Quality bar: this must look and feel like a modern commercial horror game. Never propose stylized, low-poly, blocky or procedurally generated characters or rooms. Faces carry this game; they must hold up in close-ups.

## 2. The game in one page
Logline: After a car crash, an art authenticator comes home convinced his wife is a perfect forgery. The only place he can still find the real her is on the phone.
- Genre: first-person narrative psychological horror, single-player. Runtime about 3 h 45 min (hard cap 4 h 30).
- Platform: Windows PC (Steam). Keyboard + mouse first; full gamepad support.
- Subject: Capgras syndrome. Capgras's 1923 paper called it "l'illusion des sosies," the illusion of doubles. After a brain injury, Daniel recognizes his wife's face but feels nothing, so his mind decides she has been replaced.
- Twist: the forger, the stalker and the danger were Daniel all along. The real Mara never left.
- Theme: Daniel believes love is a feeling, so when the feeling disappears he decides the person is gone. Mara proves love is also something you do: she keeps showing up for a man who looks at her like a stranger. Every major scene tests one of those two ideas.

## 3. The six rules (never break them)
1. Nobody lies to the player. Every line Mara says is true and reads as loving on a replay.
2. Faces never actually change. Early on, the game only removes the warmth theme. Glitches (lagging lips, the seam, the recast) grow with Daniel's delusion, and the camcorder footage shows none of them.
3. The phone never lies. Phone voices are never distorted, and June's Song always plays for Mara's voice on the phone.
4. June stays warm until the climax. She is the player's anchor.
5. The camcorder remembers. Every clip the player records returns in the finale, shown as it really happened.
6. Gore lives in his head. Every wound Daniel sees is hallucination or misread paint, except the one real wound he causes at the climax. June and Biscuit are never hurt on screen.

## 4. Characters (build humans as MetaHumans)
DANIEL (38), the player. Art authenticator whose pride is never being fooled. Motto: "Every forgery has a tell." Seen only in photos, mirrors and the tape. Before the crash: tidy dark-brown hair, short beard, warm brown eyes, 1.80 m, navy knitwear. After: thinner, unshaven, hollow-eyed. Chapter 4 mirror: gaunt, wild-eyed, red paint to the wrists. First-person arms and hands are visible when holding tools: jeweler's loupe, handheld UV lamp, restoration scalpel, early-2000s DV camcorder with a flip screen, phone.

MARA (36), his wife. Piano teacher who wrote "June's Song." Exhausted, frightened, completely devoted. Oval face, soft jaw, warm brown eyes, dark-brown shoulder-length hair with a side part and loose face-framing layers, light warm skin with faint freckles across the nose, a small mole just in front of her LEFT ear (the Chapter 2 "freckle on the wrong ear" tell moves it), 1.68 m, slim. From Chapter 1: a healing cut through her LEFT eyebrow (stitches early, pink line later). Epilogue: a thin white scar along her jaw. Wardrobe: plum knit sweater, charcoal skirt or dark jeans; slate-blue wool coat with a deep-red scarf outdoors; cream pajamas and cardigan at night. Also build a near-twin MetaHuman for the Chapter 3 recast: same hair and clothes, 5–10% changes to eye spacing, nose bridge and lip shape.

JUNE (8), their daughter, the one person Daniel can still feel. Chestnut hair in two high space buns with red scrunchies and a short fringe, green-hazel eyes, freckles, crayon smudges on her fingers. Mustard-yellow corduroy dress with a white collar, cream tights, red Mary Jane shoes; star-print pajamas at night. She draws constantly, and her drawings quietly track the truth. Child proportions matter (head about 1/6 of body height): use MetaHuman child body options if your engine version has them; otherwise tell me the best alternative and why.

DR. ADLER (62), Daniel's neurologist. Short silver hair, round wire glasses, clean-shaven, kind tired eyes, white coat over a light-blue shirt and navy tie. In Daniel's mind he becomes THE HANDLER.

THE HANDLER (delusion only): a man in a long grey coat with a raw, skinless head (custom sculpt; tell me when to hire a 3D artist) who pulls on other people's faces between rooms.

Minor roles: neighbor (woman, 50s, pot of soup), mailman, police officer, two paramedics. Reuse bodies; swap heads.

BISCUIT: family dog, golden-retriever mix, 7 years old. Buy a high-quality animated dog asset with idle, walk, trot, sit, lie, cower (tail tucked, ears back), bark, growl, whimper and lean-into-hand. He trusts Mara and is afraid of Daniel.

Performance note: Mara must never read as a villain. Uncanny moments come only from the delusion system: a smile that holds one second too long, lips a few frames behind the voice, blinking that stops, and later physical "tells."

## 5. Story, chapter by chapter
PROLOGUE: THE ORIGINAL (~20 min). The last good day; teaches every mechanic in a loving context.
- Morning at home: Mara teaches June the lullaby at the grand piano. Looking at Mara, June or Biscuit makes June's Song swell and the colors warm. June asks Daniel to authenticate her crayon drawing (loupe tutorial); he declares it "a genuine June." Mara: "Go, or you'll be late. And tonight, don't make me wait in the rain."
- Afternoon at the studio: authentication tutorial on a 17th-century "Portrait of a Woman" using loupe, UV lamp, scalpel and camcorder. Under UV, aged varnish fluoresces milky green while modern retouching shows as a DARK hairline along the woman's jaw (real conservation physics). Daniel: "Every forgery has a tell." He records findings on the camcorder.
- Night: Mara calls to say she's waiting outside in the rain; June's Song plays over the phone. The drive home, Daniel in the passenger seat:
  Mara: "You look at everything like you're checking whether it's real."
  Daniel: "Occupational hazard."
  Mara: "Even me?"
  Daniel: "Especially you. You're the only original I've got."
- Headlights. A truck hits the passenger side. The crash plays in first person as Daniel remembers it: a sheet of windshield glass opens Mara's face along the jaw, her skin hanging loose like a mask come unstuck. Her hand goes limp in his. Black. (False memory: she only got a cut above her eyebrow. It plants the seam he'll hunt for all game.)

CHAPTER 1: HOMECOMING (~35 min).
- Hospital discharge, three weeks later. Dr. Adler (ordinary face): "Some things may feel different for a while." Mara walks in with a healing cut through her left eyebrow, and June's Song doesn't come. Inner voice: "She looks exactly like Mara."
- Mara drives (Daniel isn't allowed to). New wind chimes ring on the porch (pays off in Chapter 3). June runs into his arms and the warmth floods back, so the problem isn't him. Biscuit barks and hides under the dining table. Mara: "Give him time. You smell like the hospital."
- Bedtime: Mara plays June's Song and the theme doesn't swell. Her hands are shaking; she misses a note. June: "Mommy, you missed a note." Mara leans in to kiss him; he flinches: "Sorry. Too soon." That night she sleeps in June's room.
- Next morning Mara goes to the pharmacy. The landline rings: June's Song swells, the screen warms.
  Mara: "Hey, it's me. They only had the small bottles, is that okay?"
  Daniel: "Come home."
  Mara: "I'm coming home, love. Twenty minutes."
- Twenty minutes later a woman who looks exactly like Mara walks in carrying a bag of small bottles. No warmth. She smiles, and the smile holds one second too long. Inner voice: "The woman on the phone is my wife. The woman in my house is not."

CHAPTER 2: TELLS (~50 min). Daniel treats her as a case, from the spare room. Three actions:
- Compare: study old photos and her face through the loupe. He always finds a tell (a canine too straight, a freckle on the wrong ear, eyes a shade too grey), drawn from a pool and different each time, visible only through the loupe.
- Question: at dinner he asks things only the real Mara would know (honeymoon hotel, the first thing he said to her). She answers everything, laughing. Inner voice: "Perfect. Someone briefed her."
- Record: the player chooses what to film; every clip returns in the finale. The clip list opens with one file he can't play: FILE ERROR.
- His theory: the swap happened while he was in a coma, and the real Mara calls when she can. The calls always come right after the impostor leaves. He speaks in code: "I know it isn't you here. I'm going to find you." Mara: "Danny, I'm coming home. Just stay there."
- He overhears her on speaker with Dr. Adler: "He's fine when I call him. It's only when he sees me."
- Dog test: Biscuit leans into her hand and backs away from Daniel. Inner voice: "They replaced the dog first. Clever."
- Dinner: she slices deep into her finger and keeps chopping while blood runs into the food, then serves it smiling, and the game makes Daniel eat.
- Some mornings there's dried red under his nails. At 3 a.m. she stands in his doorway watching him sleep, her face in shadow except her teeth.
- Finale: he shines the UV lamp on her face as she sleeps curled around June. A thin seam GLOWS along her jaw. This is physically wrong (on the painting the retouch was dark), and sharp players can notice his expertise failing. Up close the seam is wet and slightly open; something underneath blinks. He films it. Her eyes open. Mara: "Danny? ... Go back to bed."

CHAPTER 3: THE REPLICA (~55 min). The delusion spreads to the house, the town and June.
- The recast: Mara's face model and voice actor are silently swapped for a near-identical match. Once, a mirror still shows the old face.
- The copied house: the stairs gain a step, the upstairs hallway is longer than the house, and June's window shows the backyard from both sides. Mara's face is cut out of every family photo, the edges wet.
- Orchard Lane: during a call he hears wind chimes behind her voice, the chimes of their first house on Orchard Lane where June was born. He decides they're keeping her there.
- The Handler: Dr. Adler makes a home visit and his face won't settle. While the impostor holds Daniel's hand, Adler draws a blade along his jaw, "measuring him for a copy." Afterward the mailman, the neighbor and a police officer each flicker into Adler's face for one frame. In looping nightmare stretches the Handler stalks Daniel (stealth: closets, under beds). If caught, he pins Daniel down and finishes the cut; reload from checkpoint.
- June pulls away. Her drawing: Mommy, June and Biscuit holding hands, Daddy off to the side with black scribbles for a face and red crayon to his elbows. June: "Daddy, why do you look at Mommy like that?" June's Song still plays for her.
- The Workshop: a basement deeper than it should be. Dozens of Mara faces made of skin, stretched on wooden frames like canvases; failed copies slumped in chairs, one turning its head to follow him; the floor tacky with blood; his own brushes on the table. Inner voice: "They're using my tools." He hides among the hanging faces as they drip.
- Overheard call: "Tonight... I know... I'll keep June with me... Please, just come tonight." Inner voice: "They're coming for me tonight. And they're taking June."

CHAPTER 4: TONIGHT (~45 min). Night, storm, lightning. Goal: get June out and drive to Orchard Lane.
- Objectives: find the hidden car keys, pack June's bag, steal the impostor's phone from her nightstand, and take the restoration scalpel "for the seam."
- He calls the real Mara to say he's coming, and the phone in his own pocket rings. Inner voice: "They cloned her number." The real Mara never calls again.
- The impostor walks the halls whispering "Danny?" Through the night her face comes loose: the seam splits, one cheek sags off the bone like wet paper.
- Hallway mirror: the Handler wears a new face, a gaunt, unshaven man with wild eyes and red to the wrists. It is the first time the player sees Daniel.
- June is hiding in her closet. She lets him take her hand; June's Song plays. Daniel: "We're going to find Mommy." June (barely audible): "Mommy's here."
- Front door standoff: the impostor stands in the way, barefoot and shaking. He sets the camcorder on the hall table to record. Lightning; the seam hangs open, dripping.
  Mara: "Danny, look at me. It's me."
  Daniel: "Every forgery has a tell."
  Mara (putting his hand on her face): "Then look. Look as long as you need to."
- June wrenches free, runs to her mother and screams "You're not my daddy!" June's Song cuts off mid-note. A prompt appears, FIND THE SEAM, and stays until pressed. His fingers slide into the seam; her face peels away in one wet sheet, another Mara face underneath, then another, each whispering "It's me." Static.

THE TAPE (~10 min). The game leaves Daniel's head and plays the camcorder.
- FILE ERROR plays first: Mara in a hospital corridor weeks ago, eyebrow still stitched, recording for Daniel in his coma: "Hi, Danny. Dr. Adler says hearing my voice might help, so I'm recording this. I'm okay. June's okay. You just have to wake up. I'm right here."
- Then the player's own clips in the order recorded, as they really were (missing required clips are filled with scripted ones). The tells are gone. The UV clip shows no seam, just a woman who cried herself to sleep with her arm around her daughter. Biscuit hides from Daniel, not Mara. Daniel cut Mara's face out of every photo himself, with his scalpel, to study under the loupe. The Workshop is the ordinary basement full of portraits of Mara he painted at 3 a.m.; the blood is spilled red paint, and his own voice whispers "I'll find you." The Handler is a neighbor with soup, a mailman, a police officer kneeling to talk to June; the blade was Dr. Adler touching a pin to Daniel's jaw to test sensation. The impostor "leaving" was Mara sitting on the front step under the chimes she hung while he was in hospital, dialing; his phone rings inside. She was too frightened to go in, and the phone was the only way he still knew her.
- Last clip, from the hall table: his thumbs dig along her jaw for a seam that isn't there, until his nails split the skin. She holds still, saying "It's me. It's me. It's me," blood running down her neck, June sobbing. The scalpel never left his pocket. Blue lights; two paramedics (the Handler and all his faces) pull him off. The only real seam in the game is the one he just made. Static.

EPILOGUE: SAME TIME TOMORROW (~10 min). Months later, a care facility in spring. Daniel, calm and gentle, paints Mara from their wedding photo. A calendar on the wall has an X for every day she has visited, and every day has an X. Mara visits; a thin white scar runs along her jaw exactly where he saw the seam.
  Daniel: "You're very kind to keep coming. But you're not my wife."
  Mara: "I know."
  She stays; he shows her the painting. Daniel: "This is her. The original." Mara: "She's beautiful." Daniel: "She is." Mara: "Same time tomorrow?"
- In the parking lot she calls him. June's Song swells and the room warms for the first time since the prologue. Daniel: "Mara? Where have you been?" Mara (crying, looking up at his window): "I'm right here, Danny." He walks to the window, looks straight at her, and doesn't recognize her. Daniel: "Come home soon." Mara: "I will." She hums June's Song; he closes his eyes. Black. Title: SOSIES.
- Post-credits: the title screen looks exactly the same, but its theme never plays again (a saved flag).

## 6. Truth map (every horror element needs a truth version for the Tape)
Mara's face torn in the crash → a cut above one eyebrow · warmth gone from Mara → his injury cut the feeling of familiarity, not recognition · the real Mara calls in secret → Mara calls from the front step because on the phone he still knows her · every loupe tell → nothing; her face matches every photo · she answers every question → she's his wife · finger bleeding into the food → a small bandaged nick; dinner was fine · the woman watching at 3 a.m. → Mara checking on him because he wanders at night · she sleeps in June's room → Mara protecting June · Biscuit "replaced" → the dog is afraid of Daniel · the wet seam under UV → no seam; she cried herself to sleep · the recast → the same woman · the copied house → their house, unchanged · faces cut from photos → Daniel cut them out · the Orchard Lane chimes → Mara hung them while he was in hospital · the Handler's blade → Dr. Adler's pin test · the Handler → Adler, a neighbor, a mailman, a police officer, paramedics · the Workshop → canvases on stretcher bars, spilled red paint, his portraits of Mara · red under his nails → paint · hidden car keys → he isn't allowed to drive · "they're coming tonight" → Adler arranged his readmission · the cloned number → he's holding Mara's phone · her face sagging → a woman who hasn't slept in weeks · the gaunt man in the mirror → Daniel · faces peeling away → his thumbs on her jaw, the one real wound · FILE ERROR → Mara's hospital message he couldn't face.

## 7. Locations
THE FAMILY HOUSE (hub of every chapter). A two-story 1990s suburban house with porch, basement and backyard. Build it once at final quality; use one persistent level plus streamed sublevels for each lighting state and each chapter's set dressing.
- Ground floor: entry hall (front door with a glass panel, coat rack, hall table for the Chapter 4 camcorder). Living room: black grand piano by the big window, keyboard facing into the room so Mara's face is visible while she plays; fireplace with a mantel clock (four minutes fast); green velvet sofa; Persian rug; bookshelves of auction catalogues and mystery novels; sideboard with the landline phone and family photos, the wedding photo prominent. Open dining room and kitchen: table under a pendant lamp (Biscuit hides under it), fridge covered in June's drawings. Daniel's spare room (Chapter 2 case room: corkboard, photos, desk lamp). Stairs up. Basement door.
- Upstairs: long hallway with a mirror (Chapter 4 reveal), master bedroom, June's room (bed, star night-light, one-eyed teddy "Mr. Buttons", drawings on the wall, a closet big enough to hide in), bathroom with a mirror.
- Basement: boxes, washing machine, Daniel's painting corner with canvases and red paint (truth); the Workshop in the delusion.
- Outside: porch with wind chimes (from Chapter 1), front yard, quiet street.
- Lighting states: sunny morning (Prologue), dusk with warm lamps (Ch1 homecoming), night with lamps and fire (Ch1 bedtime), overcast morning (Ch1 phone call), grey days and 3 a.m. darkness (Ch2–3), storm with lightning (Ch4).
THE STUDIO: brick loft with a tall steel-framed window; easel holding "Portrait of a Woman" (use a public-domain 17th-century Dutch portrait as the base, add the retouched jaw); desk with loupe, UV lamp, scalpels and a magnifier lamp; camcorder on a tripod; canvases on shelves. Day state (soft window light) and rainy night state (desk lamp, rain streaks on glass, city lights).
THE CAR: mid-2010s sedan interior, Mara driving, Daniel in the passenger seat. Rainy night road, streetlights sweeping through the cabin, wipers, drops on the windshield. The truck comes from the passenger side.
THE HOSPITAL: room 214 (bed by a window with venetian blinds casting striped shadows, heart monitor, IV stand, chair, curtain) and a corridor.
THE CARE FACILITY (epilogue): bright spring room, easel, calendar full of X's, window over the parking lot.
Orchard Lane is never visited.

## 8. Core systems (build exactly)
8.1 Player: walk 1.4 m/s; Shift = hurried walk 2.2 m/s; running (3.5 m/s, with stamina) only in Handler chases; crouch for hiding; subtle head bob (toggle); footsteps by physical surface (wood, rug, tile, concrete, grass, wet); eye height 1.65 m; default FOV 90° (70–110 in settings); capsule radius 30 cm.
8.2 Interaction: trace from screen center, 2 m range; soft outline highlight plus a prompt ("E  Examine drawing"). Types: examine, door (animated open/close; locked doors give a line of dialogue), phone, camcorder, lamp or switch, pickup (keys, phone, scalpel), sit, story trigger. An interaction can never fire twice, and input is blocked during cinematics.
8.3 Examine mode: the object moves in front of the camera with background depth of field; mouse rotates, wheel zooms; hotspots react under the reticle. Tools: LOUPE (circular 4–6× magnified lens via scene capture, slight edge distortion); UV LAMP (hold U: a UV post-process plus a material parameter that reveals UV layers such as varnish fluorescence and hidden seams); SCALPEL (scrape to reveal an under-layer via a render-target mask). On exit, the object returns to its exact original transform.
8.4 Warmth (the heart of the game): each character has a WarmthSource component (IsLovedOne, WarmthEnabled). Each frame: warmth = max over enabled sources of angleFactor (1 at ≤8° between camera forward and the head, 0 at ≥28°) × distanceFactor (1 at ≤2 m, 0 at ≥8 m) × line of sight to the head. Smooth up over ~0.8 s and down over ~1.5 s. Warmth drives the June's Song warm-layer volume, a post-process blend from a COLD LUT to a WARM LUT, and slight bloom and vignette. Rules: a phone call from Mara forces warmth to 1 for the whole call; June stays enabled until "You're not my daddy!", where the theme hard-cuts mid-note. Include a debug overlay showing the warmth value and active source.
8.5 Delusion level: one global float (0 to 1+) in a GameInstance subsystem, set per scene by the story director. Every glitch reads it: lip-sync delay (0 ms at 0, ~200 ms at 1), smile hold time, blink suppression, the seam material, gore layers, the recast swap, house geometry swaps, the Handler. At 0, every scene renders as the truth, which is how the Tape replays scenes.
8.6 Dialogue and subtitles: data-driven (DataTable/CSV with ID, speaker, text, audio, facial animation, delusion variant, next). Speaker names; inner voice in italics; phone lines labelled "on the phone." Advance with Space, E, click or gamepad, with an auto-advance option; mashing keys must never skip unread lines. Choices via 1–3, mouse or gamepad. NPCs turn head and eyes to the player while talking (Control Rig look-at). Lip sync from MetaHuman Animator (iPhone capture or audio-driven).
8.7 Phone: landline, later a cell phone. Positional ringing and vibration; answer with E; call card UI (name + timer). Call audio is never processed or distorted. Calls are triggered by story state.
8.8 Camcorder: hold right mouse to look through the viewfinder (REC dot, timecode, battery, low-res video look). Story beats marked "recordable" log a clip ID with a timestamp when filmed. The clip list UI shows FILE ERROR first. The Tape replays each logged clip as a Sequencer truth cinematic at delusion 0, in recorded order, filling missing required clips with scripted ones.
8.9 Casebook (Chapter 2): a journal of tells, questions and clips in Daniel's handwriting; opens with Tab.
8.10 Handler AI (Chapters 3–4): behavior tree with patrol, sight (vision cone plus light level), hearing (footsteps, doors), search and chase; hiding spots (closets, under beds, behind hanging faces). Being caught plays a cinematic and reloads the checkpoint. Story Mode makes him slower and less perceptive.
8.11 Save and checkpoints: autosave at every scene start and objective; chapter select unlocks after completion; settings persist; the post-credits "theme never plays again" flag persists.
8.12 Story director: one actor per scene running an ordered list of beats (wait for trigger, play line, move NPC, start sequence...), so scripted scenes are data, not spaghetti. Every beat has an ID, and there's a debug command to skip to any beat.

## 9. Art direction
- Photoreal, grounded, intimate. Faces must hold up at 30 cm.
- References: Resident Evil 7 (family-house horror lighting), What Remains of Edith Finch and Gone Home (lived-in domestic detail), P.T. (the looping hallway), Layers of Fear (the shifting house), The Last of Us Part II (facial performance).
- Lighting: Lumen global illumination and reflections, Virtual Shadow Maps; warm tungsten interiors (2700–3000 K) against cold daylight and overcast (6500 K); IES profiles on lamps; morning sun shafts through volumetric fog; rain on glass; lightning in the storm. No blown-out specular highlights.
- Color: two grading LUTs, WARM (amber, soft contrast, lifted shadows) and COLD (desaturated teal-grey, deeper blacks), blended by the warmth value. Subtle film grain; motion blur off by default; chromatic aberration only during glitches.
- Materials: realistic PBR (Megascans quality): worn wood floors, velvet, lacquered piano with soft reflections, skin with subsurface scattering.
- Set dressing tells the family's story: June's drawings everywhere, sheet music for "June's Song" in Mara's handwriting, auction catalogues, wedding photos.
- Gore: realistic, only inside the delusion, driven by the delusion level through layered face-material masks (seam, split, sagging cheek). Never on June or Biscuit.

## 10. Audio
- June's Song: a gentle solo-piano lullaby in D major, 16 bars, simple enough for a child to learn (June is practising the first bar). Three versions: diegetic solo piano (spatialized at the piano), the warm swell (piano and strings, non-diegetic, driven by warmth) and a slightly detuned nightmare version. Build in MetaSounds with synced stems so warmth fades layers on the beat.
- The Chapter 1 wrong note: one note a semitone flat and slightly late.
- Voices: five freelance actors (Mara; a near-identical voice for the recast; June, voiced by an adult children's-voice specialist or a child with a guardian present and kept away from gore sessions; Daniel's inner voice; Dr. Adler). Minor roles double up. Use temp recordings until the script is locked. Phone lines are clean and undistorted.
- Ambience per space (room tone, clock tick, fire crackle, rain, storm, hospital hum, road noise); detailed foley (doors, footsteps per surface, piano, phone, chimes); spatial audio with HRTF and per-room reverb. Silence is a tool; stingers are rare.

## 11. UI, menus, accessibility
- Title screen over a live 3D shot of the house at night with Mara at the piano. Menu: Continue, New Game, Chapter Select, Settings, Extras, Quit.
- Minimal HUD: small center dot, contextual prompt, subtitles with speaker names, optional objective line (toggle), call card, camcorder overlay, chapter title cards on black.
- Typography and palette: an elegant serif such as Cormorant Garamond; umber black, lead white, varnish gold, celadon green, madder red.
- Settings: graphics presets plus resolution, window mode, upscaler (TSR, DLSS, FSR), Lumen quality, shadows, textures, V-sync, frame cap, FOV, mouse and controller sensitivity, invert Y, key remapping, head bob, camera-shake intensity, motion blur, film grain, subtitle size and background, photosensitivity mode (reduces flashes and lightning), Story Mode, and audio sliders (master, music, effects, voice, UI).
- Content warning at launch: gore, mental illness, domestic violence.

## 12. Technical requirements
- Latest stable Unreal Engine 5 (5.6 or newer), Windows 10/11, DirectX 12.
- Lumen, Nanite for static meshes, Virtual Shadow Maps, TSR; optional DLSS/FSR plugins; all scalability presets tested.
- Performance: 60 fps at 1440p High on an RTX 3060-class GPU; 60 fps at 1080p Medium on a GTX 1660 Super-class GPU; never below 30 fps at minimum spec. Profile each milestone with stat unit, stat gpu and Unreal Insights.
- Characters: MetaHumans with groom hair; force LOD0 in close-ups and cinematics; first-person arms matching Daniel's skin tone; Control Rig for look-at and facial overrides; a locomotion blend space or Motion Matching for NPCs; NavMesh so NPCs never walk through furniture.
- Blueprints first, C++ only where Blueprints become slow or messy. Architecture: GameInstance subsystem (chapter, flags, delusion, warmth); components (Interactable, Examinable, WarmthSource); actors (Phone, Camcorder, StoryDirector, HidingSpot); DataTables (dialogue, clips, tells).
- Project hygiene: /Content/Sosies/{Characters, Environments, Props, Systems, UI, Audio, Cinematics, Maps, Data}; prefixes BP_, WBP_, M_, MI_, T_, SM_, SK_, ABP_, MS_, DT_, LS_.
- Version control: Git with LFS (.gitattributes for .uasset/.umap) or Perforce; commit daily; off-site backup.
- All player-facing text in String Tables so it can be localized.

## 13. Milestones (in order; each ends with tests I can check)
M0 Foundations: install the engine, create a Blueprint First Person project, enable plugins (MetaHuman, Groom, Chaos Cloth, MetaSounds, Enhanced Input), rendering settings, source control, folder structure. Done when the template runs at 60 fps and is committed.
M1 Core feel: player controller, interaction, doors, examine mode with loupe and UV lamp, footsteps, a greybox of the house ground floor. Done when I can walk the greybox, open doors, and examine and UV an object with no glitches.
M2 Warmth: placeholder June's Song MetaSound with layers, warmth scoring, LUT blend, the phone rule, debug overlay, two mannequins as loved ones. Done when five testers notice the warmth vanish without being told.
M3 Faces: MetaHumans for Mara, June and Dr. Adler to the section 4 specs; idle, walk, sit, piano-playing, hug and lean animations; look-at; blinks; lip sync; the delusion-driven uncanny controls. Done when a 30 cm close-up looks like a real person under three lighting setups.
M4 Narrative tools: dialogue, subtitles and choices; story director; phone; camcorder logging; save and checkpoints; main menu; settings; pause.
M5 Locations: final house (all floors), studio, car and hospital at final art quality in every lighting state.
M6 Vertical slice: Prologue and Chapter 1 playable start to finish at near-final quality. Done after three clean playthroughs in a row, no errors in the log, target frame rate met.
M7 Tape prototype: three recorded clips replayed as truth cinematics at delusion 0.
M8 Chapter 2 → M9 Chapter 3 (Handler AI) → M10 Chapter 4 → M11 The Tape and Epilogue → M12 playtests (runtime, twist) → M13 polish, accessibility and Steam build.

## 14. QA and bug prevention (every milestone)
- Test from the main menu in a packaged or standalone build, not just the editor viewport.
- Test at Low and Epic settings, at 1080p and 1440p, and with a gamepad.
- Check for: the player getting stuck on geometry; interactions firing twice or during cinematics; key-mashing skipping dialogue; overlapping audio; subtitles out of sync; NPCs clipping through furniture or doors; the camera clipping into faces or walls; MetaHuman LOD pops or hair flicker in close-ups; Lumen light leaks (walls at least 20 cm thick, no single-sided planes); shadow artifacts; blurry close-up textures (streaming); save/load mid-scene restoring the wrong state; pausing during cinematics; alt-tab and resolution changes; ultrawide and 16:10 screens; pop-in during the first seconds of each scene.
- Keep a bug list with repro steps and severity. Fix crashes and blockers before adding features.
- A scene is only done after three start-to-finish plays without errors.

## 15. Start
Before writing anything, ask me up to five short questions: my PC specs and GPU, my Unreal and programming experience, whether I have an iPhone with Face ID for facial capture, how many hours a week I can work, and my budget for assets and voice actors. Then begin M0.
