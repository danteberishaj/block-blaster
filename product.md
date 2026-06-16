# Block Blast Product Notes

## Product Promise

Block Blast is a fast offline block-puzzle game built around one readable loop:
drag a shape, fill rows or columns, clear space, and chase a bigger combo than the
last run. The game should feel tactical, glossy, and immediate without drifting into
menus, currencies, ads, or feature clutter.

## Target Feel

- Sessions should work in 2 to 6 minutes, with one-hand play and no login.
- The best moment is a planned clear that starts or extends a combo chain.
- Luck should create tension, not cheap losses. Fresh trays should usually include
  at least one playable shape on the current board.
- Feedback should escalate with meaning: place, clear, multi-clear, combo, new best,
  and game over should not all feel the same.

## Current Strongest Point

The strongest point is the existing combo puzzle core. Scoring already rewards
line clears quadratically and multiplies that reward by consecutive clearing moves.
That gives the game a real reason to plan ahead instead of only placing whatever fits.

The supporting feel is also strong: snap-to-grid drag, ghost preview, haptics, clear
audio, clear bursts, combo popups, helpers, tutorial demos, and local best score are
already present. This branch improves those assets instead of adding unrelated modes.

## Implemented In This Branch

- Board-aware tray repair: passive tray refills remain raw random unless the first
  deal is immediately dead, then a deterministic repair piece is inserted.
- Stronger helper shuffle: Shuffle/Revive now try to return at least two currently
  playable pieces, falling back to the best playable repair on cramped boards.
- Clear previews: valid drag previews simulate the move and mark cells that will clear.
- Fit pressure: tray pieces that cannot fit the current board dim and stop dragging.
- Combo visibility: the header now shows an active chain badge once the streak reaches
  x2, so a single clear does not get framed as a reward loop by itself.
- Retention stats: runs now track run chain, all-time best chain, and biggest blast so
  the score chase is not the only goal.
- Signature feedback: simultaneous row and column clears are branded as Cross Blast
  with distinct popup priority, green burst treatment, board shock, haptics, and a
  synthesized sound.
- Clear reward feedback: every line clear gets a score popup, not only multi-clears.
- Helper correction: Break now removes one tapped block, matching the product copy.
- Responsive sizing: board and home background placement now respond to window size.
- Premium surface pass: board, tray, helper controls, and gradients were tightened
  without adding visual noise.
- Icon polish: visible emoji/custom glyph controls were replaced with maintained
  vector icons, keeping blocks as the primary branded shape language.
- Web runtime baseline: the documented Expo web runtime dependency is now explicit in
  `package.json` alongside `react-dom` and `react-native-web`.

## Rules

- Board: 8 by 8.
- Tray: 3 shapes. A new tray appears after all three are placed.
- Placement: a shape can only occupy empty board cells.
- Clear: any full row or column clears immediately after placement.
- Game over: no remaining tray shape fits anywhere.
- Revive: if a shuffle helper remains, game over can be dismissed with a fresh tray.

## Scoring

- Placement gives 1 point per placed cell.
- Clearing lines gives `lineCount * 10 * lineCount`.
- Consecutive clearing moves multiply the clear bonus by the active combo streak.
- Non-clearing moves reset the combo streak.

## Helper Economy

Helpers are limited pressure valves, not the core game.

- Shuffle: replaces the tray with a board-aware fresh tray. Because it is a limited
  helper, it is allowed to be more generous than passive refills.
- Break: removes exactly one tapped filled block.
- Hint: highlights a placeable shape and location.

Future helper changes should be tested against tension. The game should not become a
sandbox where every bad board can be erased for free.

## Visual And Audio Direction

The visual language is dark arcade glass with glossy candy blocks. The blocks are the
hero asset, so the shell should stay restrained: clear hierarchy, compact controls,
and reward effects that appear only when the player earns them.

Audio should remain royalty-free and synthesized. Cross Blast now has its own hit.
The next useful audio additions are small, distinct sounds for place, invalid drop,
helper use, combo tier, new best, and game over. Avoid constant noise.

## Fairness Policy

Randomness can create tension, but it should not routinely end runs without a decision.
Tray generation may be random, weighted, or bag-based, but it should preserve these
constraints:

- A passive fresh tray should usually include at least one immediately placeable piece.
- Passive tray repair should only intervene when the raw deal is dead.
- A paid Shuffle should never return a fully dead tray, and should usually give at
  least two currently playable pieces.
- High-value line clears should still require planning.
- Bad boards should feel caused by earlier choices, not hidden generation rules.

## Roadmap Boundaries

Good next additions:

- Pure logic tests for scoring, game over, best-chain persistence, and tray generation.
- Pure logic tests for scoring, game over, and best-chain persistence.
- A daily deterministic seed after the core loop is tested.
- More precise sound language.

Avoid for now:

- Ads, IAP, currencies, login, backend leaderboards, skins, battle passes, or quests.
- Heavy new native dependencies inside a polish branch.
- Expo SDK upgrade bundled with gameplay polish. The repo is on SDK 54; SDK 56 should
  be handled as a separate dependency migration.

## Audit Findings And Resolutions

The branch was reviewed from product/design, architecture, and Expo compatibility
angles. The findings that changed the implementation:

- Tray fairness belongs in pure game logic, not in shape construction.
- Tray policy should repair dead deals, not optimize every tray.
- Active play should avoid always-on pressure tinting; preview, hint, and clear rings
  are the primary planning signals.
- End-screen stats should separate the current run from all-time records.
- `CHAIN x1` should not be surfaced as a reward badge.
- Cross Blast needs distinct feedback if it is going to be named.
- README and product notes should match the no-emoji, maintained-icon visual direction.
- Tiny custom glyphs were removed from active UI because they competed with the blocks.
- The Expo SDK upgrade remains intentionally out of this branch; the current app is
  still pinned to SDK 54 for Expo Go compatibility.
