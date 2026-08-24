import SignOutButton from "@/components/social-auth-buttons/sign-out-button";
import { ThemedText } from "@/components/themed-text";
import { StyleSheet, View } from "react-native";

export default function Tab() {
  return (
    <View style={styles.container}>
      <ThemedText>Tab Plan</ThemedText>
      <SignOutButton />
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
