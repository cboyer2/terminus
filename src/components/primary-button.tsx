import { colors, spacing } from "@/theme";
import { Button, Host, type UniversalStyle } from "@expo/ui";
import { StyleSheet } from "react-native";

// UniversalStyle (the Button's own `style` prop) doesn't support text color,
// size, or weight — the native filled-button text convention applies
// instead, which trades exact control for a native look-and-feel.
export const BUTTON_STYLE: UniversalStyle = {
  backgroundColor: colors.systemBlue,
  borderRadius: 4,
  padding: spacing.md,
};

export const BUTTON_DISABLED_STYLE: UniversalStyle = {
  ...BUTTON_STYLE,
  opacity: 0.5,
};

export function PrimaryButton(props: { title: string; onPress: () => void; loading?: boolean }) {
  return (
    <Host style={styles.host} matchContents={{ vertical: true }}>
      <Button
        variant="filled"
        label={props.title}
        onPress={props.onPress}
        disabled={props.loading}
        style={props.loading ? BUTTON_DISABLED_STYLE : BUTTON_STYLE}
      />
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    alignSelf: "stretch",
  },
});
