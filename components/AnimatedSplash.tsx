import React, { useEffect } from "react";
import { Image, StyleSheet } from "react-native";
import Animated, {
  Easing,
  SharedValue,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface AnimatedSplashProps {
  isReady: boolean;
  onFinish: () => void;
}

const RING_COLOR = "#884dff";
const BACKGROUND = "#060a14";

export default function AnimatedSplash({ isReady, onFinish }: AnimatedSplashProps) {
  const iconScale = useSharedValue(0.8);
  const iconOpacity = useSharedValue(0);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    iconOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
    iconScale.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });

    ring1.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    ring2.value = withDelay(
      700,
      withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(ring1);
      cancelAnimation(ring2);
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    cancelAnimation(ring1);
    cancelAnimation(ring2);

    iconScale.value = withSequence(
      withTiming(1.08, { duration: 150, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) })
    );

    overlayOpacity.value = withDelay(
      200,
      withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onFinish)();
      })
    );
  }, [isReady]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  const ringStyle = (anim: SharedValue<number>) =>
    useAnimatedStyle(() => ({
      opacity: (1 - anim.value) * 0.5,
      transform: [{ scale: 0.9 + anim.value * 1.6 }],
    }));

  const ring1Style = ringStyle(ring1);
  const ring2Style = ringStyle(ring2);

  return (
    <Animated.View style={[styles.container, overlayStyle]} pointerEvents="none">
      <Animated.View style={[styles.ring, ring1Style]} />
      <Animated.View style={[styles.ring, ring2Style]} />
      <Animated.View style={iconStyle}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.icon}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  icon: {
    width: 140,
    height: 140,
    borderRadius: 32,
  },
  ring: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: RING_COLOR,
  },
});
