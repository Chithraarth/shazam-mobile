import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useIAP, type Product, type Purchase } from "expo-iap";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { useAuthedFetch, useProfile } from "@/hooks/useProfile";

export const SCAN_PACK_SKU = process.env.EXPO_PUBLIC_SCAN_PACK_PRODUCT_ID || "scan_pack_50";
export const SCANS_PER_PACK = 50;
// Shown only until the store returns the real localized price.
const FALLBACK_PRICE = "₹499";

type BillingContextValue = {
  available: boolean;
  connected: boolean;
  product: Product | undefined;
  priceText: string;
  purchasing: boolean;
  restoring: boolean;
  // A UPI/cash payment the store hasn't completed yet. The backend credits
  // it when Google reports it complete, even if the app is closed.
  pendingPayment: boolean;
  error: string | null;
  clearError: () => void;
  // Bumped each time a purchase is credited, so screens can react to it.
  creditedCount: number;
  buyScanPack: () => Promise<void>;
  restorePurchases: () => Promise<void>;
};

const BillingContext = createContext<BillingContextValue | null>(null);

type VerifyOutcome = "credited" | "pending" | "rejected" | "retry";

// Mounted once at the app root (not just on the paywall), so a purchase is
// still verified if it completes, or was left unfinished, while the user is
// on another screen or had closed the app.
function NativeBillingProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, user } = useAuth();
  const authedFetch = useAuthedFetch();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditedCount, setCreditedCount] = useState(0);
  const inFlight = useRef(new Set<string>());

  const finishRef = useRef<((args: { purchase: Purchase; isConsumable?: boolean }) => Promise<void>) | null>(null);

  const verifyPurchase = useCallback(
    async (purchase: Purchase): Promise<VerifyOutcome> => {
      if (purchase.productId !== SCAN_PACK_SKU) return "rejected";
      if (purchase.purchaseState === "pending") {
        setPendingPayment(true);
        return "pending";
      }

      const key = purchase.purchaseToken ?? purchase.id;
      if (inFlight.current.has(key)) return "retry";
      inFlight.current.add(key);

      try {
        const body = Platform.OS === "ios"
          ? { platform: "ios", productId: purchase.productId, transactionId: purchase.id }
          : { platform: "android", productId: purchase.productId, purchaseToken: purchase.purchaseToken };

        const res = await authedFetch("/api/billing/verify", { method: "POST", body: JSON.stringify(body) });
        const data = (await res.json().catch(() => ({}))) as { error?: string };

        if (res.status === 202) {
          setPendingPayment(true);
          return "pending";
        }
        if (res.ok) {
          // On Android the backend has already consumed the purchase, and
          // consuming it again here would fail. iOS consumables can only be
          // finished on the device.
          if (Platform.OS === "ios") {
            await finishRef.current?.({ purchase, isConsumable: true }).catch(() => {});
          }
          setPendingPayment(false);
          setError(null);
          await queryClient.invalidateQueries({ queryKey: ["profile"] });
          setCreditedCount((n) => n + 1);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return "credited";
        }
        if (res.status >= 400 && res.status < 500 && res.status !== 401) {
          // The store says this purchase is invalid, refunded or someone
          // else's. Finish it on iOS so it isn't re-delivered forever.
          if (Platform.OS === "ios") {
            await finishRef.current?.({ purchase, isConsumable: true }).catch(() => {});
          }
          setError(data.error ?? "This purchase couldn't be verified.");
          return "rejected";
        }
        setError("Payment received — we couldn't confirm it yet. We'll retry automatically, or tap Restore purchases.");
        return "retry";
      } catch {
        setError("Payment received — we couldn't confirm it yet. We'll retry automatically, or tap Restore purchases.");
        return "retry";
      } finally {
        inFlight.current.delete(key);
      }
    },
    [authedFetch, queryClient]
  );

  const {
    connected,
    products,
    availablePurchases,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    getAvailablePurchases,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      await verifyPurchase(purchase);
      setPurchasing(false);
    },
    onPurchaseError: (err) => {
      setPurchasing(false);
      // Backing out of the native purchase sheet isn't an error.
      if (err.code !== "user-cancelled") setError(err.message);
    },
  });
  finishRef.current = finishTransaction;

  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: [SCAN_PACK_SKU], type: "in-app" }).catch(() => {});
  }, [connected]);

  // Pick up purchases that were paid for but never verified (app killed
  // mid-purchase, network error), and pending payments that have since
  // completed — on connect and every time the app comes back to the front.
  useEffect(() => {
    if (!connected || !isSignedIn) return;
    getAvailablePurchases().catch(() => {});
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") getAvailablePurchases().catch(() => {});
    });
    return () => sub.remove();
  }, [connected, isSignedIn, user?.uid]);

  useEffect(() => {
    if (!isSignedIn) return;
    for (const purchase of availablePurchases) {
      if (purchase.productId === SCAN_PACK_SKU) verifyPurchase(purchase);
    }
  }, [availablePurchases, isSignedIn, verifyPurchase]);

  const product = products.find((p) => p.id === SCAN_PACK_SKU);

  const buyScanPack = useCallback(async () => {
    if (!product || !user) return;
    setError(null);
    if (Platform.OS === "ios" && !profile?.appAccountToken) {
      setError("Couldn't load your account. Please try again.");
      return;
    }
    setPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await requestPurchase({
        request: {
          // Both IDs tie the purchase to this account; the backend rejects a
          // purchase whose ID doesn't match the signed-in user.
          google: { skus: [SCAN_PACK_SKU], obfuscatedAccountId: user.uid },
          apple: { sku: SCAN_PACK_SKU, appAccountToken: profile?.appAccountToken ?? null },
        },
        type: "in-app",
      });
      // Resolved via onPurchaseSuccess / onPurchaseError above.
    } catch (e) {
      setPurchasing(false);
      setError(e instanceof Error ? e.message : "Could not start purchase. Please try again.");
    }
  }, [product, user, profile?.appAccountToken, requestPurchase]);

  const restorePurchases = useCallback(async () => {
    setRestoring(true);
    setError(null);
    try {
      await getAvailablePurchases();
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't restore purchases.");
    } finally {
      setRestoring(false);
    }
  }, [getAvailablePurchases, queryClient]);

  return (
    <BillingContext.Provider
      value={{
        available: true,
        connected,
        product,
        priceText: product?.displayPrice ?? FALLBACK_PRICE,
        purchasing,
        restoring,
        pendingPayment,
        error,
        clearError: () => setError(null),
        creditedCount,
        buyScanPack,
        restorePurchases,
      }}
    >
      {children}
    </BillingContext.Provider>
  );
}

const unavailable: BillingContextValue = {
  available: false,
  connected: false,
  product: undefined,
  priceText: FALLBACK_PRICE,
  purchasing: false,
  restoring: false,
  pendingPayment: false,
  error: null,
  clearError: () => {},
  creditedCount: 0,
  buyScanPack: async () => {},
  restorePurchases: async () => {},
};

export function BillingProvider({ children }: { children: ReactNode }) {
  if (Platform.OS === "web") {
    return <BillingContext.Provider value={unavailable}>{children}</BillingContext.Provider>;
  }
  return <NativeBillingProvider>{children}</NativeBillingProvider>;
}

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBilling must be used within BillingProvider");
  return ctx;
}
