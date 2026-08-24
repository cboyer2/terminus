import { Platform, PlatformColor } from "react-native";

export const colors = {
  label: Platform.OS === "ios" ? PlatformColor("label") : "#000000",
  secondaryLabel:
    Platform.OS === "ios" ? PlatformColor("secondaryLabel") : "#3c3c43",
  separator: Platform.OS === "ios" ? PlatformColor("separator") : "#c6c6c8",
  systemBlue: Platform.OS === "ios" ? PlatformColor("systemBlue") : "#007aff",
  onTint: "#ffffff",
};
