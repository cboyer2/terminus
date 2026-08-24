import { supabase } from "@/data/supabase";
import { spacing } from "@/theme";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  StyleSheet,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";

export default function App() {
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  return (
    <View style={styles.container}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={
          colorScheme === "dark"
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
        }
        cornerRadius={5}
        style={[styles.button, { width: width - spacing.md * 2 }]}
        onPress={async () => {
          try {
            const credential = await AppleAuthentication.signInAsync({
              requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
              ],
            });
            // signed in
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "apple",
              token: credential.identityToken!,
            });
            if (error) {
              console.error("Error signing in with Apple:", error);
            }
          } catch (e) {
            if (
              e instanceof Error &&
              "code" in e &&
              e.code === "ERR_REQUEST_CANCELED"
            ) {
              // handle that the user canceled the sign-in flow
            } else {
              // handle other errors
            }
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    height: 44,
  },
});
