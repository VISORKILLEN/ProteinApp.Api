import type {
  JobActivity,
  ProteinGoal,
  TrainingType,
  UserProfile,
} from "../lib/types";

interface Props {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
}

export function ProfileForm({ profile, onChange }: Props) {
  // Skapar en ny profil-kopia med ett fält ändrat. React kräver att vi
  // aldrig ändrar state direkt, utan alltid skickar in ett nytt objekt.
  function update<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    onChange({ ...profile, [key]: value });
  }

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <label>
        Vikt (kg)
        <input
          type="number"
          inputMode="decimal"
          min={30}
          max={300}
          value={profile.weightKg}
          onChange={(e) => update("weightKg", Number(e.target.value))}
        />
      </label>

      <label>
        Ålder
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={120}
          value={profile.age ?? 30}
          onChange={(e) => update("age", Number(e.target.value))}
        />
      </label>

      <label>
        Ditt mål
        <select
          value={profile.goal ?? "maintain"}
          onChange={(e) => update("goal", e.target.value as ProteinGoal)}
        >
          <option value="maintain">Behålla muskler</option>
          <option value="build">Bygga muskler</option>
          <option value="lose">Gå ner i fett</option>
        </select>
      </label>

      <label>
        Längd (cm)
        <input
          type="number"
          inputMode="numeric"
          min={100}
          max={250}
          value={profile.heightCm}
          onChange={(e) => update("heightCm", Number(e.target.value))}
        />
      </label>

      <label>
        Vad gör du på jobbet?
        <select
          value={profile.job}
          onChange={(e) => update("job", e.target.value as JobActivity)}
        >
          <option value="sitting">Mest stillasittande</option>
          <option value="standing">Står/går en del</option>
          <option value="physical">Tungt fysiskt arbete</option>
        </select>
      </label>

      <label>
        Träningspass per vecka
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={14}
          value={profile.trainingSessionsPerWeek}
          onChange={(e) =>
            update("trainingSessionsPerWeek", Number(e.target.value))
          }
        />
      </label>

      <label>
        Typ av träning
        <select
          value={profile.trainingType}
          onChange={(e) =>
            update("trainingType", e.target.value as TrainingType)
          }
        >
          <option value="endurance">Löpning/kondition</option>
          <option value="mixed">Blandad träning</option>
          <option value="strength">Styrketräning</option>
        </select>
      </label>
    </form>
  );
}
