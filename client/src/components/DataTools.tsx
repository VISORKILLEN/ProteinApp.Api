import { useRef, useState } from "react";
import { dateKey } from "../lib/dates";
import { defaultProfile } from "../lib/types";
import type { LogEntry, UserProfile } from "../lib/types";

interface BackupData {
  version: 1;
  exportedAt: string;
  profile: UserProfile;
  log: LogEntry[];
}

interface Props {
  profile: UserProfile;
  entries: LogEntry[];
  onImport: (profile: UserProfile, entries: LogEntry[]) => void;
}

/** Kontrollerar att en inläst fil verkligen är en backup från appen. */
function isBackup(x: unknown): x is BackupData {
  if (typeof x !== "object" || x === null) return false;
  const d = x as Partial<BackupData>;
  return (
    d.version === 1 &&
    typeof d.profile?.weightKg === "number" &&
    typeof d.profile?.heightCm === "number" &&
    Array.isArray(d.log) &&
    d.log.every(
      (e) =>
        typeof e?.id === "string" &&
        typeof e?.date === "string" &&
        typeof e?.name === "string" &&
        typeof e?.proteinGrams === "number",
    )
  );
}

export function DataTools({ profile, entries, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  async function exportData() {
    const data: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile,
      log: entries,
    };
    const name = `protein-backup-${dateKey()}.json`;
    const file = new File([JSON.stringify(data, null, 2)], name, {
      type: "application/json",
    });

    // På iPhone fungerar delningsmenyn bäst ("Spara i Filer", AirDrop m.m.)
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Protein-backup" });
        setMessage("Backup delad.");
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }

    // Reserv: vanlig nedladdning
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Backup nedladdad.");
  }

  async function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // gör att man kan välja samma fil igen
    if (!file) return;

    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isBackup(parsed)) {
        setMessage("Filen är ingen giltig backup.");
        return;
      }
      const ok = window.confirm(
        `Detta ersätter all data i appen med backupen (${parsed.log.length} loggade poster). Fortsätta?`,
      );
      if (!ok) return;

      onImport({ ...defaultProfile, ...parsed.profile }, parsed.log);
      setMessage("Backup återställd.");
    } catch {
      setMessage("Kunde inte läsa filen.");
    }
  }

  return (
    <section className="data-tools">
      <h2>Din data</h2>
      <p className="muted">
        Allt sparas bara på den här enheten. Ta en backup ibland, så att inget
        försvinner om webbläsaren rensar lagringen.
      </p>
      <div className="btn-row">
        <button type="button" className="secondary" onClick={exportData}>
          Exportera
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => fileRef.current?.click()}
        >
          Importera
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={importData}
      />
      {message && <p className="notice">{message}</p>}
    </section>
  );
}