# SOSIES

A first-person narrative psychological horror game about Capgras syndrome, built in **Unreal Engine 5.8** for **Windows PC (Steam)**.

This folder is the Unreal project. After M0 it contains `Sosies.uproject`; open that with Unreal Engine 5.8.

## Documents
| What | Where |
|---|---|
| Master build prompt: story, six rules, systems, art direction, milestones (fixed) | [`Docs/SOSIES_Master_Build_Prompt.md`](Docs/SOSIES_Master_Build_Prompt.md) |
| Technical decisions and open questions | [`Docs/Decisions.md`](Docs/Decisions.md) |
| Current milestone guide | [`Docs/Milestones/M0_Foundations.md`](Docs/Milestones/M0_Foundations.md) |
| Bug list | [`Docs/QA/BugList.md`](Docs/QA/BugList.md) |
| Performance log | [`Docs/QA/PerfLog.md`](Docs/QA/PerfLog.md) |

## Milestones
| # | Milestone | Status |
|---|---|---|
| M0 | Foundations | **In progress.** Repo scaffolding done; project creation and checklist pending |
| M1 | Core feel | Not started |
| M2 | Warmth | Not started |
| M3 | Faces | Not started |
| M4 | Narrative tools | Not started |
| M5 | Locations | Not started |
| M6 | Vertical slice | Not started |
| M7 | Tape prototype | Not started |
| M8 | Chapter 2 | Not started |
| M9 | Chapter 3 (Handler AI) | Not started |
| M10 | Chapter 4 | Not started |
| M11 | The Tape and Epilogue | Not started |
| M12 | Playtests | Not started |
| M13 | Polish, accessibility, Steam build | Not started |

## Layout
```
Sosies/
├── Sosies.uproject        project file (created in M0)
├── Config/                engine and project settings (created in M0)
├── Content/
│   ├── Sosies/            ALL SOSIES assets: Audio, Characters, Cinematics, Data,
│   │                      Environments, Maps, Props, Systems, UI
│   └── (template folders) First Person template content, cleaned up later
├── Docs/                  bible, decisions, milestone guides, QA
├── .gitattributes         Git LFS rules (binary files)
└── .gitignore             generated folders + licensed-content guard
```

Naming prefixes: `BP_` Blueprint · `WBP_` Widget Blueprint · `M_` Material · `MI_` Material Instance · `T_` Texture · `SM_` Static Mesh · `SK_` Skeletal Mesh · `ABP_` Animation Blueprint · `MS_` MetaSound · `DT_` DataTable · `LS_` Level Sequence.

> **Public repository:** licensed third-party source assets (Fab, Megascans, MetaHuman output, paid packs, voice recordings) are never committed here. See `Docs/Decisions.md` D-004.
