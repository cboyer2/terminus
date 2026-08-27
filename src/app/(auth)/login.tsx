import { Logo } from "@/components/logo";
import { PrimaryButton } from "@/components/primary-button";
import AppleSignInButton from "@/components/social-auth-buttons/apple/apple-sign-in-button";
import { TextField } from "@/components/text-field";
import { ThemedText } from "@/components/themed-text";
import { supabase } from "@/data/supabase";
import { spacing } from "@/theme";
import { Link, Stack } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, ScrollView } from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  return (
    <>
      <Stack.Screen options={{ title: "Login" }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
        <Logo size={200} />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="email@address.com"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
        />
        <PrimaryButton
          title="Sign in"
          onPress={signInWithEmail}
          loading={loading}
        />
        <AppleSignInButton />
        <Link href="/signup" replace>
          <ThemedText>Don&apos;t have an account? Sign up</ThemedText>
        </Link>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 40,
    padding: spacing.md,
    gap: spacing.md,
  },
});
