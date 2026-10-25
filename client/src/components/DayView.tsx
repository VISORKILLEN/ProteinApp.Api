import { useState } from "react";
import type { LogEntry } from "../lib/types";
import { dateKey, formatDate, shiftDate } from "../lib/dates";
import { newId } from "../lib/id";
import { FoodSearch } from "./FoodSearch";

interface Props {
  target: number;
  entries: LogEntry[];
  onAdd: (entry: LogEntry) => void;
  onDelete: (id: string) => void;
}

export function DayView({ target, entries, onAdd, onDelete }: Props) {
  const today = dateKey();
  const [date, setDate] = useState(today);
  const [name, setName] = useState("");
  const [grams, setGrams] = useState("");

  // Härledda värden: räknas om vid varje rendering, lagras inte
  const dayEntries = entries.filter((e) => e.date === date);
  const total = dayEntries.reduce((sum, e) => sum + e.proteinGrams, 0);
  const percent = target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0;
  const remaining = Math.max(0, target - total);

  // Manuell inmatning (reserv när något inte hittas)
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(grams.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return;

    onAdd({
      id: newId(),
      date,
      name: name.trim() || "Måltid",
      proteinGrams: Math.round(value * 10) / 10,
    });
    setName("");
    setGrams("");
  }

  return (
    <div>
      <div className="date-nav">
        <button type="button" onClick={() => setDate(shiftDate(date, -1))}>
          ←
        </button>
        <span>{date === today ? "Idag" : formatDate(date)}</span>
        <button
          type="button"
          onClick={() => setDate(shiftDate(date, 1))}
          disabled={date >= today}
        >
          →
        </button>
      </div>

      <section className="progress-card">
        <div className="progress-numbers">
          <strong>{Math.round(total)} g</strong>
          <span>av {target} g</span>
        </div>
        <div
          className="bar"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="bar-fill" style={{ width: `${percent}%` }} />
        </div>
        <p>
          {remaining > 0
            ? `${Math.round(remaining)} g kvar`
            : "Målet är nått för dagen"}
        </p>
      </section>

      {/* Sök livsmedel eller skanna streckkod */}
      <FoodSearch
        onAdd={(foodName, proteinGrams) =>
          onAdd({ id: newId(), date, name: foodName, proteinGrams })
        }
      />

      {/* Manuell inmatning, hopfälld */}
      <details className="manual">
        <summary>Lägg till manuellt</summary>
        <form className="add-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Vad åt du? (valfritt)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Protein (g)"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
          />
          <button type="submit" className="primary">
            Lägg till
          </button>
        </form>
      </details>

      <ul className="entries">
        {dayEntries.length === 0 && <li className="empty">Inget loggat än.</li>}
        {dayEntries.map((e) => (
          <li key={e.id}>
            <span>{e.name}</span>
            <span>{e.proteinGrams} g</span>
            <button
              type="button"
              aria-label={`Ta bort ${e.name}`}
              onClick={() => onDelete(e.id)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}