import { Share } from "react-native";
import type { RefObject } from "react";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

/**
 * Shares a result as a picture (the card drawn in `card`); when the picture cannot be made or the system cannot share files, the
 * text goes instead, so sharing never ends in nothing. Resolves with what was shared.
 */
export async function shareResult(card: RefObject<View | null>, message: string, dialogTitle: string): Promise<"image" | "text" | "none"> {
  try {
    if (card.current && (await Sharing.isAvailableAsync())) {
      const uri = await captureRef(card, { format: "png", quality: 1, result: "tmpfile", width: 1200, height: 630 });
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
