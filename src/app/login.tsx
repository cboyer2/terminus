import AppleSignInButton from "@/components/social-auth-buttons/apple/apple-sign-in-button";
import { Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Auth from "../components/Auth";
import { useAuthContext } from "@/hooks/use-auth-context";

export default function LoginScreen() {
  const { claims } = useAuthContext();
  return (
    <>
      <Stack.Screen options={{ title: "Login" }} />
      <View style={styles.container}>
        <Text>Login</Text>
        <Auth />
        {claims && <Text>{claims.sub}</Text>}
        <AppleSignInButton />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
});
