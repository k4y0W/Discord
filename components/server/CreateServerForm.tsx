// components/server/CreateServerForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// ZAKTUALIZOWANY INTERFEJS PROPSÓW
interface CreateServerFormProps {
  onServerCreated?: (newServerData: any) => void; // Uczyniliśmy go opcjonalnym
  onClose?: () => void; // Uczyniliśmy go opcjonalnym
}

export default function CreateServerForm({
  onServerCreated,
  onClose,
}: CreateServerFormProps) {
  // ... reszta kodu komponentu CreateServerForm pozostaje taka sama jak podałem wcześniej ...
  const [serverName, setServerName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!serverName.trim()) {
      setError("Nazwa serwera nie może być pusta.");
      return;
    }
    if (serverName.length < 3 || serverName.length > 100) {
      setError("Nazwa serwera musi mieć od 3 do 100 znaków.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/servers/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: serverName }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Nie udało się utworzyć serwera. Spróbuj ponownie."
          );
        }

        setSuccessMessage(
          `Serwer "${data.server?.name || serverName}" utworzony pomyślnie!`
        );
        setServerName("");

        if (onServerCreated) {
          onServerCreated(data.server);
        }

        router.refresh();

        if (onClose) {
          setTimeout(() => {
            onClose();
            setSuccessMessage(null);
          }, 2000);
        }
      } catch (err: any) {
        console.error("Błąd podczas tworzenia serwera:", err);
        setError(err.message || "Wystąpił nieoczekiwany błąd.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="serverName"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          Nazwa serwera
        </label>
        <input
          type="text"
          id="serverName"
          name="serverName"
          value={serverName}
          onChange={(e) => setServerName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Mój super serwer"
          disabled={isPending}
          required
          minLength={3}
          maxLength={100}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {successMessage && (
        <p className="text-sm text-green-400">{successMessage}</p>
      )}

      <div className="flex justify-end space-x-3 pt-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 disabled:opacity-50"
          >
            Anuluj
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
        >
          {isPending ? "Tworzenie..." : "Utwórz"}
        </button>
      </div>
    </form>
  );
}
