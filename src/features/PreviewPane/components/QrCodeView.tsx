"use client";

/**
 * Preview renderer for the Tool Builder's QR Code node.
 *
 * Encodes the string held in the node's bound state slot as a QR code rendered
 * to crisp SVG (via the `qrcode` library, loaded on demand) at the node's
 * `size` and error-correction `level`. Empty input shows a placeholder; the
 * node never writes to state.
 */
import { QrCode } from "lucide-react";
import { useEffect, useState } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import type { QrCodeNode } from "@/types/tool-builder";

/**
 * Render a QR Code node's code.
 *
 * @param props.node - The QR Code node config (size, error-correction level).
 * @param props.value - The raw value held in the node's bound state slot.
 */
export function QrCodeView({
  node,
  value,
}: {
  node: QrCodeNode;
  value: unknown;
}): React.ReactElement {
  const { t } = useTranslation();
  const text =
    typeof value === "string" ? value : value == null ? "" : String(value);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!text) {
      setSvg("");
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const out = await QRCode.toString(text, {
          type: "svg",
          errorCorrectionLevel: node.level,
          margin: 1,
          width: node.size,
        });
        if (!cancelled) {
          setSvg(out);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSvg("");
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [text, node.level, node.size]);

  if (!text) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/50 px-4 py-8 text-center text-xs text-muted-foreground">
        <QrCode size={20} className="opacity-30" />
        {t("qrcode.empty")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        {t("qrcode.invalid", { msg: error })}
      </div>
    );
  }

  return (
    <div className="w-fit border-2 border-foreground bg-white p-3 shadow-nb">
      <div
        style={{ width: node.size, height: node.size }}
        className="[&_svg]:h-full [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
