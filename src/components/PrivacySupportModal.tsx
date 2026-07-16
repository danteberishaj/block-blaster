import React from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PRODUCT } from "../config/product";
import { palette, radii, spacing } from "../theme/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
}

async function openLink(url: string, label: string) {
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error(`Could not open ${label}`, error);
    Alert.alert(`Could not open ${label}`, "Please try again later.");
  }
}

function LinkButton({ label, url }: { label: string; url: string | null }) {
  return (
    <Pressable
      disabled={!url}
      accessibilityRole="link"
      accessibilityState={{ disabled: !url }}
      accessibilityHint={url ? "Opens in your browser" : undefined}
      onPress={() => {
        if (url) void openLink(url, label.toLowerCase());
      }}
      style={({ pressed }) => [
        styles.linkButton,
        !url && styles.linkButtonDisabled,
        pressed && url && styles.linkButtonPressed,
      ]}
    >
      <Text style={[styles.linkText, !url && styles.linkTextDisabled]}>
        {url ? label : `${label} — coming soon`}
      </Text>
    </Pressable>
  );
}

export default function PrivacySupportModal({ visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={styles.backdrop}
        edges={["top", "right", "bottom", "left"]}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          accessibilityViewIsModal
        >
          <View style={styles.card}>
            <Text style={styles.title} accessibilityRole="header">
              Privacy & Support
            </Text>
            <Text style={styles.intro}>
              A plain-language summary of how {PRODUCT.name} works.
            </Text>

            <View style={styles.section}>
              <Text style={styles.heading}>Optional rewarded ads</Text>
              <Text style={styles.body}>
                Ads only start after you choose Watch Ad. Completing one earns
                one helper use; skipping it never removes game progress. Each
                helper can earn one ad-funded use per run.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.heading}>Contextual ads</Text>
              <Text style={styles.body}>
                {PRODUCT.name} asks the ad provider for non-personalized,
                contextual ads. The provider may still process device, network,
                and ad-performance data to deliver and measure an ad.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.heading}>Saved on this device</Text>
              <Text style={styles.body}>
                Your active run, high score, sound preference, and tutorial
                status are stored locally. There is no account or cloud save.
              </Text>
            </View>

            <View style={styles.links}>
              <LinkButton
                label="Privacy Policy"
                url={PRODUCT.privacyPolicyUrl}
              />
              <LinkButton label="Contact Support" url={PRODUCT.supportUrl} />
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
            >
              <Text style={styles.closeText}>Done</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(6,8,24,0.86)",
  },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: spacing.lg,
    backgroundColor: palette.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: palette.surfaceLight,
  },
  title: {
    color: palette.text,
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  intro: {
    color: palette.textDim,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.md,
  },
  heading: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  body: {
    color: palette.textDim,
    fontSize: 14,
    lineHeight: 20,
  },
  links: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  linkButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.accent,
    backgroundColor: "rgba(91,124,255,0.12)",
  },
  linkButtonPressed: { opacity: 0.72 },
  linkButtonDisabled: {
    borderColor: palette.surfaceLight,
    backgroundColor: "transparent",
  },
  linkText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  linkTextDisabled: { color: palette.textMuted },
  closeButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: palette.accent,
  },
  closeButtonPressed: { opacity: 0.82 },
  closeText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900",
  },
});
