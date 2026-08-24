import { Logo } from "@/components/logo";
import { PrimaryButton } from "@/components/primary-button";
import { TextField } from "@/components/text-field";
import { ThemedText } from "@/components/themed-text";
import { supabase } from "@/data/supabase";
import { spacing } from "@/theme";
import * as Linking from "expo-linking";
import { Link, Stack } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, ScrollView } from "react-native";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signUpNewUser() {
    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: Linking.createURL("confirm"),
      },
    });

    if (error) Alert.alert(error.message);
    if (!session)
      Alert.alert("Please check your inbox for email verification!");
    setLoading(false);
  }

  return (
    <>
      <Stack.Screen options={{ title: "Sign-up" }} />
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
          title="Sign up"
          onPress={signUpNewUser}
          loading={loading}
        />
        <Link href="/login" replace>
          <ThemedText>Already have an account? Log in</ThemedText>
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
