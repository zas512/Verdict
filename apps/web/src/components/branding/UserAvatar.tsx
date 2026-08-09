"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  email?: string;
  size?: "default" | "sm" | "lg";
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function UserAvatar({
  avatarUrl,
  name,
  email,
  size = "default"
}: Readonly<UserAvatarProps>) {
  const label = name?.trim() || email || "User";
  return (
    <Avatar size={size} className="shrink-0 border-0">
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={label} /> : null}
      <AvatarFallback>{initialsOf(label)}</AvatarFallback>
    </Avatar>
  );
}
