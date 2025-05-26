// components/server/AddServerControl.tsx
"use client";

import { useState } from "react";
import CreateServerForm from "./CreateServerForm";

export default function AddServerControl() {
  const [showFormAsModal, setShowFormAsModal] = useState(false);

  return (
    <>
      {" "}
      {/* Użyj fragmentu, jeśli nie potrzebujesz dodatkowego diva dla samego przycisku */}
      <button
        title="Dodaj serwer"
        onClick={() => setShowFormAsModal(true)}
        className="w-12 h-12 mt-auto bg-gray-700 rounded-full flex items-center justify-center text-green-400 text-2xl hover:bg-green-600 hover:text-white hover:rounded-xl transition-all duration-150 ease-in-out"
      >
        +
      </button>
      {showFormAsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md relative">
            {" "}
            {/* Dodano relative dla pozycjonowania krzyżyka */}
            <button
              onClick={() => setShowFormAsModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl leading-none"
              aria-label="Zamknij"
            >
              &times;
            </button>
            <h2 className="text-xl font-semibold text-white mb-4">
              Utwórz nowy serwer
            </h2>
            <CreateServerForm
              onClose={() => setShowFormAsModal(false)} // Przekaż funkcję do zamknięcia modala
              onServerCreated={() => {
                // Opcjonalnie: dodatkowa logika po utworzeniu serwera, np. wyświetlenie innego komunikatu
                // router.refresh() jest już w CreateServerForm, więc lista serwerów powinna się odświeżyć
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
