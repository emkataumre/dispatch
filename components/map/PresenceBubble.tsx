import { UserAvatar } from "@/components/UserAvatar";

interface Props {
  displayName: string;
  avatarUrl: string | null;
  size?: number;
}

export function PresenceBubble({ displayName, avatarUrl, size = 32 }: Props) {
  return <UserAvatar displayName={displayName} avatarUrl={avatarUrl} size={size} />;
}
