"use client";

import { createContext, useContext, useState, useEffect } from "react";

export interface ProfileState {
  avatarColor: string;
  avatarEmoji: string | null;
  avatarUrl: string | null;
  name: string;
}

interface ProfileContextValue {
  profile: ProfileState | null;
  updateProfile: (p: Partial<ProfileState>) => void;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  updateProfile: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ProfileState | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setProfile({
            avatarColor: data.avatarColor ?? "#2563EB",
            avatarEmoji: data.avatarEmoji ?? null,
            avatarUrl: data.avatarUrl ?? null,
            name: data.name ?? "",
          });
        }
      })
      .catch(() => {});
  }, []);

  function updateProfile(p: Partial<ProfileState>) {
    setProfile((prev) => (prev ? { ...prev, ...p } : null));
  }

  return (
    <ProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
