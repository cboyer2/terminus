import { LOGO_MARK_SVG } from "@/components/logo-mark";
import { SvgXml } from "react-native-svg";

export function Logo(props: { size?: number }) {
  return (
    <SvgXml
      xml={LOGO_MARK_SVG}
      width={props.size ?? 64}
      height={props.size ?? 64}
    />
  );
}
