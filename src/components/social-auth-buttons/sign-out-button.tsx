import { supabase } from "@/data/supabase";
import { Button, Host } from "@expo/ui";

async function onSignOutButtonPress() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Error signing out:", error);
  }
}

export default function SignOutButton() {
  return (
    <Host matchContents={{ vertical: true }}>
      <Button label="Sign out" onPress={onSignOutButtonPress} />
    </Host>
  );
}
