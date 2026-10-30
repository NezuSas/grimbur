import { PixelRatio, Share } from "react-native";
import type { ComponentRef, RefObject } from "react";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from "../ui/components/ShareCard";

/**
 * Shares a result as a picture (the card drawn in `card`); when the picture cannot be made or the system cannot share files, the
 * text goes instead, so sharing never ends in nothing. Resolves with what was shared.
 */
export async function shareResult(card: RefObject<ComponentRef<typeof View> | null>, message: string, dialogTitle: string, layoutWidth = SHARE_CARD_WIDTH): Promise<"image" | "text" | "none"> {
  try {
    if (card.current && (await Sharing.isAvailableAsync())) {
      // Captured at the phone's own pixels (never scaled up from a smaller grab, which is what blurred it), at least 1200 wide.
      const width = Math.round(Math.min(2400, Math.max(SHARE_CARD_WIDTH, layoutWidth * PixelRatio.get())));
      const height = Math.round((width * SHARE_CARD_HEIGHT) / SHARE_CARD_WIDTH);
      const uri = await captureRef(card, { format: "png", quality: 1, result: "tmpfile", width, height });
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle, UTI: "public.png" });
      return "image";
    }
  } catch (e) {
    console.warn("[share] the picture could not be shared, sharing the text instead:", e);
  }
  try {
    await Share.share({ message });
    return "text";
  } catch (e) {
    console.warn("[share] share error:", e);
    return "none";
  }
}
