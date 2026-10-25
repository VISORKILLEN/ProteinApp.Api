import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");

  // Håll senaste callbacken i en ref, så kameran inte startas om vid varje rendering
  const detectedRef = useRef(onDetected);
  useEffect(() => {
    detectedRef.current = onDetected;
  });

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);
    let controls: IScannerControls | undefined;
    let cancelled = false;
    let handled = false;

    reader
      .decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current!,
        (result) => {
          if (result && !handled) {
            handled = true;
            detectedRef.current(result.getText());
          }
        },
      )
      .then((c) => {
        if (cancelled) c.stop();
        else controls = c;
      })
      .catch(() =>
        setError("Kunde inte öppna kameran. Tillåt kameraåtkomst, eller skriv in koden nedan."),
      );

    // Stäng kameran när komponenten tas bort
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const code = manual.replace(/\D/g, "");
    if (code.length >= 8) onDetected(code);
  }

  return (
    <section className="scanner">
      <div className="scanner-view">
        {/* playsInline och muted krävs för att video ska starta på iPhone */}
        <video ref={videoRef} playsInline muted autoPlay />
        <div className="scanner-guide" />
      </div>

      {error ? (
        <p className="error">{error}</p>
      ) : (
        <p className="muted">Rikta kameran mot streckkoden.</p>
      )}

      <form className="scanner-manual" onSubmit={submitManual}>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Eller skriv streckkoden"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button type="submit">Sök</button>
      </form>

      <button type="button" className="link" onClick={onClose}>
        Avbryt
      </button>
    </section>
  );
}