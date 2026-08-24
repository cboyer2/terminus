import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="figure.strengthtraining.traditional"
          md="home"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="maxes">
        <NativeTabs.Trigger.Icon
          sf="gauge.with.dots.needle.100percent"
          md="exercise"
        />
        <NativeTabs.Trigger.Label>Maxes</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="templates">
        <NativeTabs.Trigger.Icon
          sf="pencil.and.list.clipboard"
          md="flowsheet"
        />
        <NativeTabs.Trigger.Label>Templates</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
