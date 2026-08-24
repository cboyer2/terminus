import { ThemedText } from "@/components/themed-text";
import { colors, spacing } from "@/theme";
import { StyleSheet, TouchableOpacity } from "react-native";

export function PrimaryButton(props: {
  title: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.button, props.loading && styles.buttonDisabled]}
      onPress={props.onPress}
      disabled={props.loading}
    >
      <ThemedText style={styles.buttonText}>{props.title}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.systemBlue,
    borderRadius: 4,
    alignSelf: "stretch",
    borderCurve: "continuous",
    padding: spacing.md,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.onTint,
    fontSize: 16,
    fontWeight: "600",
  },
});
