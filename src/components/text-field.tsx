import { ThemedText } from "@/components/themed-text";
import { ThemedTextInput } from "@/components/themed-text-input";
import { colors, spacing } from "@/theme";
import { StyleSheet, View } from "react-native";

export function TextField(props: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={[{ gap: spacing.xs, alignSelf: "stretch" }]}>
      <ThemedText style={styles.label}>{props.label}</ThemedText>
      <ThemedTextInput
        onChangeText={props.onChangeText}
        value={props.value}
        placeholder={props.placeholder}
        autoCapitalize="none"
        style={styles.input}
        secureTextEntry={props.secureTextEntry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.secondaryLabel,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.separator,
    borderCurve: "continuous",
    borderRadius: 4,
    padding: spacing.md,
    fontSize: 16,
  },
});
