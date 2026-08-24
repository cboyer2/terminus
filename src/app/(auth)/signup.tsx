import { supabase } from "@/data/supabase";
import { useAuthContext } from "@/hooks/use-auth-context";
import * as Linking from "expo-linking";
import { Link, Stack } from "expo-router";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function SignUpScreen() {
  const { claims } = useAuthContext();
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
      <View style={styles.container}>
        <View style={[styles.verticallySpaced, styles.mt20]}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            onChangeText={(text) => setEmail(text)}
            value={email}
            placeholder="email@address.com"
            autoCapitalize="none"
            style={styles.input}
          />
        </View>
        <View style={styles.verticallySpaced}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            onChangeText={(text) => setPassword(text)}
            value={password}
            secureTextEntry={true}
            placeholder="Password"
            autoCapitalize="none"
            style={styles.input}
          />
        </View>
        <View style={styles.verticallySpaced}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => signUpNewUser()}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Sign up</Text>
          </TouchableOpacity>
        </View>
        {claims && <Text>{claims.sub}</Text>}
        <Link href="/login">
          <Text>Already have an account? Log in</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    padding: 12,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: "stretch",
  },
  mt20: {
    marginTop: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#86939e",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#86939e",
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#2089dc",
    borderRadius: 4,
    padding: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
