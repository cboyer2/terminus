import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs>
      {/* Every tab handles its own top/bottom safe area manually via
          SafeAreaView in the screen — NativeTabs renders no header (so
          there's no automatic top inset for any of these regardless), and
          its automatic bottom inset only reliably targets a bare
          ScrollView/FlatList as the first child, which none of these
          screens are once loading/error/empty states and SafeAreaView
          wrapping are accounted for. Kept explicit and consistent across
          all three tabs rather than relying on partial default behavior. */}
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="figure.strengthtraining.traditional"
          md="home"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="maxes" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon
          sf="gauge.with.dots.needle.100percent"
          md="exercise"
        />
        <NativeTabs.Trigger.Label>Maxes</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="templates" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon
          sf="pencil.and.list.clipboard"
          md="flowsheet"
        />
        <NativeTabs.Trigger.Label>Templates</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
