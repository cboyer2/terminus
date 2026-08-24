import { useTheme } from "expo-router";
import { Text, TextProps } from "react-native";

export function ThemedText(props: TextProps) {
  const { colors } = useTheme();
  return <Text {...props} style={[{ color: colors.text }, props.style]} />;
}
