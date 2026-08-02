import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface ConfidenceRingProps {
  confidence: number;
  size?: number;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return "#22c55e";
  if (confidence >= 60) return "#f59e0b";
  return "#ef4444";
}

export default function ConfidenceRing({ confidence, size = 120 }: ConfidenceRingProps) {
  const colors = useColors();
  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - confidence / 100);
  const ringColor = getConfidenceColor(confidence);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={colors.muted}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <Text style={[styles.label, { color: ringColor }]}>{confidence}%</Text>
      <Text style={[styles.sublabel, { color: colors.mutedForeground }]}>
        {confidence >= 80 ? "HIGH" : confidence >= 60 ? "MED" : "LOW"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 26,
    fontWeight: "700",
  },
  sublabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    marginTop: 1,
  },
});
