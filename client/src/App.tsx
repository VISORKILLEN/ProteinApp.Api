import { useEffect, useState } from "react";
import { DataTools } from "./components/DataTools";
import { DayView } from "./components/DayView";
import { ProfileForm } from "./components/ProfileForm";
import { dailyProteinFactor, dailyProteinTarget } from "./lib/protein";
import { defaultProfile } from "./lib/types";
import type { LogEntry, UserProfile } from "./lib/types";
import { useLocalStorage } from "./lib/useLocalStorage";

type Tab = "today" | "profile";

export default function App() {
  const [tab, setTab] = useState<Tab>("today");
  const [profile, setProfile] = useLocalStorage<UserProfile>(
    "profile",
    defaultProfile,
  );
  const [entries, setEntries] = useLocalStorage<LogEntry[]>("log", []);

  // Ber webbläsaren behålla datan även när lagringsutrymmet börjar ta slut
  useEffect(() => {
    navigator.storage?.persist?.();
  }, []);

  const target = dailyProteinTarget(profile);
  const factor = dailyProteinFactor(profile);

  return (
    <>
      <main>
        {tab === "today" ? (
          <DayView
            target={target}
            entries={entries}
            onAdd={(entry) => setEntries([...entries, entry])}
            onDelete={(id) => setEntries(entries.filter((e) => e.id !== id))}
          />
        ) : (
          <>
            <h1>Din profil</h1>
            <ProfileForm profile={profile} onChange={setProfile} />

            <section className="target">
              {target === null ? (
                <>
                  <p>Ingen automatisk uträkning</p>
                  <small>
                    För personer under 18 år behövs en separat bedömning.
                    Rådfråga vården eller en dietist.
                  </small>
                </>
              ) : (
                <>
                  <p>Ditt uppskattade dagliga proteinmål</p>
                  <strong>{target} g</strong>
                  <small>
                    {profile.customTargetGrams &&
                    profile.customTargetGrams > 0
                      ? "Manuellt angivet mål."
                      : `${profile.weightKg} kg × ${factor?.toLocaleString("sv-SE")} g/kg.`}{" "}
                    En förenklad uppskattning för friska vuxna. Vid njursjukdom
                    eller annan sjukdom, prata med vården.
                  </small>
                </>
              )}
            </section>
            <p className="muted">
              Träningstypen väljer den lägre delen, mitten eller den högre delen
              av tabellens spann. Från 65 år används minst 1,0 g/kg. Tungt
              fysiskt arbete ger +0,1 g/kg.
            </p>

            <DataTools
              profile={profile}
              entries={entries}
              onImport={(p, log) => {
                setProfile(p);
                setEntries(log);
              }}
            />
          </>
        )}
      </main>

      <nav className="tabs">
        <button
          type="button"
          className={tab === "today" ? "active" : ""}
          onClick={() => setTab("today")}
        >
          Idag
        </button>
        <button
          type="button"
          className={tab === "profile" ? "active" : ""}
          onClick={() => setTab("profile")}
        >
          Profil
        </button>
      </nav>
    </>
  );
}