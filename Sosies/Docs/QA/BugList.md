# SOSIES — Bug list

Rule from the brief: **fix crashes and blockers before adding features.** A scene is only done after three start-to-finish plays without errors.

## Severity
| Level | Name | Meaning | When to fix |
|---|---|---|---|
| S1 | Crash | The editor or game crashes or freezes | Immediately, before any new work |
| S2 | Blocker | Progress is impossible (stuck, soft-lock, broken save) | Immediately, before any new work |
| S3 | Major | A feature is wrong but there's a workaround | Within the current milestone |
| S4 | Minor | Small functional issue | Before the milestone is signed off |
| S5 | Cosmetic | Visual or audio polish | By M13 at the latest |

## How to report a bug (template)
Copy this block, fill it in, and send it to Claude. Screenshots or a short video help a lot.

```
ID:           B-0xx
Found:        YYYY-MM-DD, milestone Mx
Severity:     S1 / S2 / S3 / S4 / S5
Area:         e.g. Interaction, Doors, Warmth, Rendering, Audio, Save
Build:        Editor PIE / Standalone / Packaged (Mac or Windows) + machine
Repro steps:  1. ...
              2. ...
              3. ...
Expected:     what should happen
Actual:       what happens instead
Frequency:    always / sometimes (x out of 10)
Log:          Sosies/Saved/Logs/Sosies.log (attach, or paste the red lines)
```

## Open bugs
| ID | Sev | Area | Summary | Found | Status |
|---|---|---|---|---|---|
| — | — | — | No bugs logged yet | — | — |

## Fixed bugs
| ID | Sev | Summary | Cause | Fix (commit) | Verified by |
|---|---|---|---|---|---|
| — | — | — | — | — | — |
