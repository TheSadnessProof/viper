# BRIEFING — 2026-09-20T22:09:40Z

## Mission
Conduct a rigorous specification and mechanics analysis of FIDE Chess rules to define the exact engine requirements, data structures, move validation algorithms, terminal conditions, and pure TypeScript architecture for Viper Chess.

## 🔒 My Identity
- Archetype: Specification Miner
- Roles: FIDE Chess Rules Specialist, Chess Engine Architect, Specification Surveyor
- Working directory: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_spec_miner_survey_2
- Original parent: 81d5157f-47b9-4307-8c23-8f5778a5ac63
- Milestone: Survey Phase (M1)

## 🔒 Key Constraints
- Read-only on source code: DO NOT edit or create any source code or test files outside .agents
- Write only inside working directory: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_spec_miner_survey_2\
- Authoritative FIDE compliance: 100% legal moves, checks, checkmates, stalemates, special moves (castling, en passant, promotion), 50-move rule, threefold repetition, insufficient material
- Pure TypeScript recommendations with zero external heavy engine dependencies
- Communicate to parent via send_message using caller ID 81d5157f-47b9-4307-8c23-8f5778a5ac63

## Current Parent
- Conversation ID: 81d5157f-47b9-4307-8c23-8f5778a5ac63
- Updated: not yet

## Task Summary
- **What to build**: Comprehensive FIDE Chess Engine specification (`survey_report.md`) covering data representation, move generation/validation, special moves, terminal conditions, state transitions, FEN, history stack, and formal `handoff.md`.
- **Success criteria**: Full enumeration of all 6 piece types, castling invariants, en passant 1-ply expiration, promotion mechanics, pin detection, terminal states, edge cases table, and pure TS architecture recommendations.
- **Interface contracts**: c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md
- **Code layout**: Viper platform architecture (`src/` with games catalog, BoardView, arena pattern)

## Key Decisions Made
- Specified zero-dependency pure TypeScript architecture using 0..63 mailbox board indexing (`index = rank * 8 + file`).
- Specified immutable state transitions (`makeMove`, `undoMove`) enabling O(1) history traversal and undo/redo.
- Authored 27-item Features Discovered table and 23-item Edge Cases table covering intricate FIDE rules (such as dual pawn removal en passant horizontal pin, castling path attacks, attacked rooks, and insufficient material distinctions).
- Completed `survey_report.md`.

## Artifact Index
- `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_spec_miner_survey_2\survey_report.md` — Complete FIDE Chess Engine specification report
- `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_spec_miner_survey_2\handoff.md` — Formal 5-component handoff report

## Loaded Skills
- **Source**: Teamwork Specification Miner core methodology
- **Local copy**: N/A
- **Core methodology**: Discover, probe, and document full interface, constraints, edge cases, error conditions; prioritize authoritative sources; read-only.
