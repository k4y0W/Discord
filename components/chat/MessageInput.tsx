// components/chat/MessageInput.tsx
"use client";

import { useState, useTransition, FormEvent } from "react";
import axios from "axios";
import { useRouter } from "next/navigation"; // Do odświeżenia listy wiadomości
import { Message as MessageType } from "../../frontend/lib/types"; // Importuj typ Message

// Użyj NEXT_PUBLIC_ jeśli ta zmienna ma być dostępna też po stronie klienta w przyszłości
const GO_BACKEND_URL =
  process.env.NEXT_PUBLIC_GO_BACKEND_URL || process.env.GO_BACKEND_URL;

interface MessageInputProps {
  channelId: string; // ID kanału, do którego wysyłamy wiadomość
  channelName: string; // Nazwa kanału dla placeholdera
  // Opcjonalny callback, gdy wiadomość zostanie pomyślnie wysłana
  // onMessageSent?: (newMessage: MessageType) => void;
}

export default function MessageInput({
  channelId,
  channelName /*, onMessageSent */,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!content.trim()) return; // Nie wysyłaj pustych wiadomości

    setError(null);

    startTransition(async () => {
      try {
        // Wywołanie API Route Next.js (zalecane dla obsługi tokena)
        // lub bezpośrednie wywołanie Go, jeśli masz token dostępny tutaj
        // Na razie zrobimy API Route Next.js

        const response = await fetch(
          `/api/chat/channels/${channelId}/messages`,
          {
            // Nowy API Route Next.js
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Nie udało się wysłać wiadomości.");
        }

        setContent(""); // Wyczyść input po wysłaniu
        // onMessageSent?.(data.createdMessage);

        // Odśwież dane na stronie, aby zobaczyć nową wiadomość
        // To spowoduje ponowne wywołanie getMessagesForChannel w ChannelPage
        router.refresh();
      } catch (err: any) {
        console.error("Błąd podczas wysyłania wiadomości:", err);
        setError(err.message || "Wystąpił nieoczekiwany błąd.");
        // Usuń błąd po kilku sekundach
        setTimeout(() => setError(null), 5000);
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-800 p-4 border-t border-gray-700 flex-shrink-0"
    >
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`Wiadomość #${channelName}`}
        className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow disabled:opacity-70"
        disabled={isPending}
        autoComplete="off"
      />
      {/* Przycisk wysyłania jest opcjonalny, bo można wysyłać Enterem, ale można dodać */}
      {/* <button type="submit" disabled={isPending}>Wyślij</button> */}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </form>
  );
}
