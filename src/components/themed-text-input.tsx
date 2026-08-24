import { useTheme } from "expo-router";
import { TextInput, TextInputProps } from "react-native";

export function ThemedTextInput(props: TextInputProps) {
  const { colors } = useTheme();
  return <TextInput {...props} style={[{ color: colors.text }, props.style]} />;
}
