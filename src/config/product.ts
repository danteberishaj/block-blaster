export const PRODUCT = {
  name: "Rowflare",
  wordmarkLead: "ROW",
  wordmarkAccent: "FLARE",
  privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() || null,
  supportUrl: process.env.EXPO_PUBLIC_SUPPORT_URL?.trim() || null,
} as const;
