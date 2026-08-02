import colors from "@/constants/colors";

/**
 * Returns dark-mode design tokens — Videofy is always dark.
 * (useColorScheme returns "light" on web, so we force dark here.)
 */
export function useColors() {
  return { ...colors.dark, radius: colors.radius };
}
