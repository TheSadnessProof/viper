# Survey Spec Miner Dispatch
Task: Survey FIDE Chess Engine Rules, State Evaluation, Edge Cases, Data Structures, and Mechanics.
Working Directory: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_spec_miner_survey_2
Parent: c:\Users\ditob\Documents\viper\.agents\orchestrator_1
Original Request: c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md

## 2026-09-20T22:07:51Z
You are Spec Miner 2 on the Viper Chess Survey team.
Your working directory is: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_spec_miner_survey_2
Authoritative User Request: c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md
Project Root: c:\Users\ditob\Documents\viper

MISSION:
Conduct a rigorous specification and mechanics analysis of FIDE Chess rules to define the exact engine requirements, data structures, move validation algorithms, and edge cases.

TASKS:
1. Read c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md completely.
2. Define the complete Chess Engine specification required for 100% legal FIDE chess:
   - Board representation (8x8 coordinates, algebraic notation e1-e8, piece definitions).
   - Move validation for all 6 piece types: Pawn, Knight, Bishop, Rook, Queen, King.
   - Special moves:
     * Castling: kingside (O-O) and queenside (O-O-O), tracking king and rook movement history, through-check and into-check conditions, empty intermediate squares.
     * En Passant: tracking en passant target square, double-pawn push triggers, immediate 1-ply expiration.
     * Promotion: pawn reaching rank 8 (white) or rank 1 (black), promotion pieces (Q, R, B, N).
   - Check detection: king square attacked by any enemy piece.
   - Legal move filtering: no move may leave or place one's own king in check (pinned piece handling).
   - Terminal conditions:
     * Checkmate: in check and no legal moves.
     * Stalemate: not in check and no legal moves.
     * 50-move rule: 50 full moves (100 halfmoves) without a pawn move or capture.
     * Insufficient material: K vs K, K+B vs K, K+N vs K, K+B vs K+B (same colored bishops).
     * Threefold repetition (hashing or board state representation).
3. Recommend pure TypeScript engine architecture (data models, move generator, state transitions, FEN export/import, undo/redo move history stack).

OUTPUT:
Write your comprehensive specification report to:
`c:\Users\ditob\Documents\viper\.agents\teamwork_preview_spec_miner_survey_2\survey_report.md`
And write your formal handoff report to:
`c:\Users\ditob\Documents\viper\.agents\teamwork_preview_spec_miner_survey_2\handoff.md`
When finished, send a message to parent summarizing your findings and reporting your artifact paths.

CONSTRAINTS:
- You are read-only. DO NOT edit or create any source code or test files.
- Write only inside your working directory (.agents\teamwork_preview_spec_miner_survey_2\).
