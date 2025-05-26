// components/channels/ChannelCategoryView.tsx
import ChannelItemView from "./ChannelItemView";
// Upewnij się, że ścieżka do lib/types jest poprawna z tej lokalizacji
// Jeśli components i lib są na tym samym poziomie w REACT-PROJECT:
import { ChannelCategory, Channel } from "../../../lib/types"; // ../../lib/types

interface ChannelCategoryViewProps {
  category: ChannelCategory; // Zakładamy, że ChannelCategory ma pole 'channels: Channel[]'
  // i 'name: string' (lub 'Name: string' jeśli tak jest w typie)
  activeChannelId?: string | null; // Otrzymujemy jako string (z URL) lub null/undefined
}

export default function ChannelCategoryView({
  category,
  activeChannelId,
}: ChannelCategoryViewProps) {
  // Konwertuj activeChannelId na liczbę tylko raz, jeśli istnieje
  let numericActiveChannelId: number | null = null;
  if (activeChannelId !== null && activeChannelId !== undefined) {
    const parsedId = parseInt(activeChannelId, 10);
    if (!isNaN(parsedId)) {
      // Sprawdź, czy konwersja się udała
      numericActiveChannelId = parsedId;
    }
  }

  return (
    <div>
      <div className="flex items-center px-1 py-0.5 mb-1 text-xs font-semibold tracking-wider text-gray-400 uppercase hover:text-gray-300 cursor-pointer group">
        {/* Sprawdź, czy Twój typ ChannelCategory ma pole 'Name' czy 'name' */}
        <span className="ml-1">{category.Name}</span> {/* lub category.Name */}
      </div>
      <ul className="space-y-0.5">
        {category.channels.map(
          (
            channel: Channel // channel.ID jest typu number
          ) => (
            <ChannelItemView
              key={channel.ID}
              channel={channel}
              // Porównuj channel.ID (number) z numericActiveChannelId (number | null)
              isActive={
                numericActiveChannelId !== null &&
                channel.ID === numericActiveChannelId
              }
            />
          )
        )}
      </ul>
    </div>
  );
}
