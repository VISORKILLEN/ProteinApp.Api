import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Funktionen i useState körs bara en gång, vid första renderingen
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Körs varje gång value ändras: spara till localStorage
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // lagringen kan vara full eller blockerad
    }
  }, [key, value]);

  return [value, setValue] as const;
}