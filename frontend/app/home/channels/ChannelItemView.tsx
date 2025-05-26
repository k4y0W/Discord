// components/channels/ChannelItemView.tsx
import Link from "next/link";
import { Channel } from "../../../lib/types";
import { Hash, Mic } from "lucide-react"; // Import specific Lucide icons

interface ChannelItemViewProps {
  channel: Channel;
  isActive: boolean;
}

export default function ChannelItemView({
  channel,
  isActive,
}: ChannelItemViewProps) {
  const hasUnread = channel.unread && !isActive;
  const channelHref = `/home/channels/${channel.ID}`;

  return (
    <li>
      <Link
        href={channelHref}
        className={`
          group relative flex items-center rounded px-2.5 py-1.5
          text-sm transition-colors duration-100
          ${
            isActive
              ? "bg-gray-600 text-white"
              : `text-gray-300 hover:bg-gray-700 hover:text-gray-100 ${
                  hasUnread ? "font-semibold text-white" : "font-normal"
                }`
          }
        `}
      >
        {hasUnread && !isActive && (
          <div className="absolute left-0 top-0 bottom-0 flex items-center pl-0.5">
            <span className="h-2 w-1 bg-white rounded-r-full"></span>
          </div>
        )}
        <div className="mr-1.5 flex-shrink-0">
          {channel.Type === "text" ? (
            <Hash className="w-5 h-5 text-gray-500 group-hover:text-gray-400" />
          ) : (
            <Mic className="w-5 h-5 text-gray-500 group-hover:text-gray-400" />
          )}
        </div>
        <span className="truncate flex-1">{channel.Name}</span>
      </Link>
    </li>
  );
}
