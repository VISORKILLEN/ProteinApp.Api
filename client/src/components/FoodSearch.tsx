import { useEffect, useState } from "react";
import { ApiError, getFoodByBarcode, searchFoods } from "../lib/api";
import type { Food } from "../lib/types";
import { BarcodeScanner } from "./BarcodeScanner";

interface Props {
  onAdd: (name: string, proteinGrams: number) => void;
}

export function FoodSearch({ onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState("100");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);

  const term = query.trim();

  // Sök 300 ms efter att användaren slutat skriva. Cleanup avbryter gamla anrop.
  useEffect(() => {
    if (term.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setError("");
        setResults(await searchFoods(term, controller.signal));
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError("Kunde inte söka. Är servern igång?");
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  const shown = term.length >= 2 ? results : [];

  const gramsNum = Number(grams.replace(",", "."));
  const protein =
    selected && gramsNum > 0 ? (selected.proteinPer100g * gramsNum) / 100 : 0;

  function pick(food: Food) {
    setSelected(food);
    setGrams(String(food.servingGrams ? Math.round(food.servingGrams) : 100));
  }

  // Anropas när skannern hittat en streckkod
  async function handleCode(code: string) {
    setScanning(false);
    setError("");
    setBusy(true);
    try {
      pick(await getFoodByBarcode(code));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setError("Produkten finns inte i databasen. Lägg till den manuellt nedan.");
      } else if (e instanceof ApiError && e.status === 422) {
        setError("Produkten saknar proteinvärde. Lägg till den manuellt nedan.");
      } else {
        setError("Kunde inte slå upp streckkoden. Är servern igång?");
      }
    } finally {
      setBusy(false);
    }
  }

  function add() {
    if (!selected || protein <= 0) return;
    onAdd(`${selected.name} (${gramsNum} g)`, Math.round(protein * 10) / 10);
    setSelected(null);
    setQuery("");
    setResults([]);
  }

  if (scanning) {
    return (
      <BarcodeScanner onDetected={handleCode} onClose={() => setScanning(false)} />
    );
  }

  if (selected) {
    return (
      <section className="portion">
        <button type="button" className="link" onClick={() => setSelected(null)}>
          ← Tillbaka
        </button>
        <h2>
          {selected.name}
          {selected.brand ? <small> · {selected.brand}</small> : null}
        </h2>
        <p className="muted">{selected.proteinPer100g} g protein per 100 g</p>

        <label>
          Mängd (gram)
          <input
            type="text"
            inputMode="decimal"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
          />
        </label>

        <div className="quick">
          {[50, 100, 150, 200].map((g) => (
            <button key={g} type="button" onClick={() => setGrams(String(g))}>
              {g} g
            </button>
          ))}
          {selected.servingGrams ? (
            <button
              type="button"
              onClick={() => setGrams(String(Math.round(selected.servingGrams!)))}
            >
              1 port.
            </button>
          ) : null}
        </div>

        <p className="result">
          <strong>{Math.round(protein * 10) / 10} g</strong> protein
        </p>

        <button type="button" className="primary" onClick={add}>
          Lägg till
        </button>
      </section>
    );
  }

  return (
    <section className="search">
      <button
        type="button"
        className="scan-btn"
        onClick={() => setScanning(true)}
        disabled={busy}
      >
        {busy ? "Slår upp..." : "📷 Skanna streckkod"}
      </button>

      <input
        type="search"
        placeholder="Eller sök, t.ex. nötfärs"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      <ul>
        {shown.map((f) => (
          <li key={f.id}>
            <button type="button" onClick={() => pick(f)}>
              <span>
                {f.name}
                {f.brand ? <small> · {f.brand}</small> : null}
              </span>
              <small>{f.proteinPer100g} g / 100 g</small>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}