import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";

interface ScanButtonProps {
  onPress: () => void;
  isScanning: boolean;
  disabled?: boolean;
}

export default function ScanButton({ onPress, isScanning, disabled }: ScanButtonProps) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const ripple3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulseAnim.stopAnimation();
    ripple1.stopAnimation();
    ripple2.stopAnimation();
    ripple3.stopAnimation();

    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(ripple1, { toValue: 1, duration: 2200, useNativeDriver: true }),
            Animated.timing(ripple1, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(700),
            Animated.timing(ripple2, { toValue: 1, duration: 2200, useNativeDriver: true }),
            Animated.timing(ripple2, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(1400),
            Animated.timing(ripple3, { toValue: 1, duration: 2200, useNativeDriver: true }),
            Animated.timing(ripple3, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start();
    }

    return () => {
      pulseAnim.stopAnimation();
      ripple1.stopAnimation();
      ripple2.stopAnimation();
      ripple3.stopAnimation();
    };
  }, [isScanning]);

  const rippleStyle = (anim: Animated.Value) => ({
    position: "absolute" as const,
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.5,
    borderColor: colors.primary,
    opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.5, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 2.5] }) }],
  });

  return (
    <View style={styles.wrapper}>
      {!isScanning && (
        <>
          <Animated.View style={rippleStyle(ripple1)} />
          <Animated.View style={rippleStyle(ripple2)} />
          <Animated.View style={rippleStyle(ripple3)} />
        </>
      )}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Pressable
          onPress={onPress}
          disabled={disabled || isScanning}
          testID="scan-button"
          style={({ pressed }) => [
            styles.pressable,
            { opacity: (disabled && !isScanning) ? 0.5 : pressed ? 0.85 : 1 },
          ]}
        >
          <LinearGradient
            colors={["#884dff", "#7c3aed"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <Ionicons
              name={isScanning ? "scan" : "scan-outline"}
              size={36}
              color="#fff"
            />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 110,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  pressable: {
    width: 110,
    height: 110,
    borderRadius: 55,
    shadowColor: "#884dff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 16,
  },
  gradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
  },
});
