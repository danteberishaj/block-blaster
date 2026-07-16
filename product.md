# Rowflare Product Notes

## Product promise

Rowflare is a focused offline block puzzle: place a shape, clear rows or
columns, and plan consecutive clears. It should feel tactile, readable, and
generous without currencies, forced ads, login, or menu clutter.

## Core rules

- Board: 8×8.
- Tray: three shapes; a fresh tray appears after all three are placed.
- Placement: shapes occupy empty cells only.
- Clear: every completed row or column clears immediately.
- Game over: none of the remaining tray shapes fit.
- Score: placed cells plus a quadratic line-clear bonus, multiplied by the
  current consecutive-clear chain.

## Fairness policy

- Passive trays remain random unless the deal is immediately dead; only then is
  a deterministic playable repair inserted.
- Shuffle and revive aim for at least two currently playable pieces.
- Helpers relieve pressure but do not erase the need to plan.
- A bad board should feel like the result of earlier choices, not a hidden
  generation rule.

## Helper and ad economy

- Shuffle replaces the tray with a board-aware deal.
- Break removes one selected filled block.
- Hint highlights a legal shape and placement.
- Every run starts with three uses of each helper.
- At zero, Android players may explicitly choose **Watch Ad +1**.
- Only the ad provider's reward callback grants the use. Skip, no-fill, error,
  timeout, backgrounding, or unsupported platforms fail closed.
- Each helper can earn at most one ad-funded use per run, including across app
  restarts because the active run is persisted.
- Ads are configured as contextual/non-personalized and never interrupt play.

## Feel and accessibility

- Dragging uses snap-to-grid placement with a ghost and clear preview.
- Tapping a tray shape selects it; highlighted board buttons provide an
  alternative placement path for one-handed and assistive-technology use.
- Break mode always displays an explicit instruction.
- Safe areas, compact phone heights, reduced motion, semantic control labels,
  state announcements, and scrollable modals are part of the release baseline.
- Place, clear, cross clear, combo, new best, and game over use distinct levels
  of visual, haptic, and synthesized-audio feedback.

## Persistence and player trust

- Active runs are restored after process death.
- High score, best chain, sound preference, tutorial status, helpers, and ad-use
  caps persist locally.
- Saved data is versioned and validated before use.
- Returning players skip the long branded intro.
- Restart confirms before clearing a live scored run.

## Release boundaries

The first release intentionally excludes accounts, cloud saves, IAP, forced
ads, leaderboards, daily quests, skins, and battle passes. Good post-launch
work is crash/performance observation, balance tuning from real sessions,
platform parity for rewarded ads, and evaluating Unity LevelPlay if direct
Unity Ads fill or revenue is insufficient.

The Rowflare name and `com.rowflare.game` identifiers are provisional until the
publisher completes trademark, company-name, domain, and store-listing checks.
