export type HelperType = "shuffle" | "bomb" | "hint";

export type HelperCounts = Record<HelperType, number>;
export type RewardedHelperUsage = Record<HelperType, number>;

export const MAX_REWARDED_USES_PER_HELPER = 1;

export function createStartingHelpers(): HelperCounts {
  return { shuffle: 3, bomb: 3, hint: 3 };
}

export function createRewardedHelperUsage(): RewardedHelperUsage {
  return { shuffle: 0, bomb: 0, hint: 0 };
}

export function canEarnRewardedHelperUse(
  usage: RewardedHelperUsage,
  helper: HelperType,
): boolean {
  return usage[helper] < MAX_REWARDED_USES_PER_HELPER;
}

export function recordRewardedHelperUse(
  usage: RewardedHelperUsage,
  helper: HelperType,
): RewardedHelperUsage {
  return {
    ...usage,
    [helper]: Math.min(usage[helper] + 1, MAX_REWARDED_USES_PER_HELPER),
  };
}
