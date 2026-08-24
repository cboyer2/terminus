import { ThemedText } from "@/components/themed-text";
import { StyleSheet, View } from "react-native";

export default function Tab() {
  return (
    <View style={styles.container}>
      <ThemedText>Tab Templates</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
