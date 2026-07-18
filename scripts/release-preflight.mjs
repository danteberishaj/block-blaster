const requiredValues = [
  "EXPO_PUBLIC_LEVELPLAY_ANDROID_APP_KEY",
  "EXPO_PUBLIC_LEVELPLAY_ANDROID_REWARDED_AD_UNIT_ID",
];

const requiredUrls = [
  "EXPO_PUBLIC_PRIVACY_POLICY_URL",
  "EXPO_PUBLIC_SUPPORT_URL",
];

const errors = [];

for (const name of requiredValues) {
  const value = process.env[name]?.trim();
  if (!value) errors.push(`${name} is missing or blank.`);
  if (value && /example|placeholder|replace|changeme/i.test(value)) {
    errors.push(`${name} still looks like a placeholder.`);
  }
}

for (const name of requiredUrls) {
  const value = process.env[name]?.trim();
  if (!value) {
    errors.push(`${name} is missing or blank.`);
    continue;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") errors.push(`${name} must use HTTPS.`);
    if (/example\.(com|org|net)$/i.test(url.hostname)) {
      errors.push(`${name} still uses an example hostname.`);
    }
  } catch {
    errors.push(`${name} is not a valid URL.`);
  }
}

if (errors.length > 0) {
  console.error("Production release preflight failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Production release environment is configured.");
