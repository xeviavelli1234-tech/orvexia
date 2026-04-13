"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface ProfileState {
  avatarColor: string;
  avatarEmoji: string | null;
  avatarUrl: string | null;
  name: string;
}

interface ProfileContextValue {
  profile: ProfileState | null;
  updateProfile: (p: Partial<ProfileState>) => void;
  resetProfile: () => void;
  refreshProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  updateProfile: () => {},
  resetProfile: () => {},
  refreshProfile: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ProfileState | null>(null);

  const fetchProfile = useCallback(() => {
    fetch("/api/profile")
      .then((r) => {
        if (r.status === 401) {
          // No session — clear the profile so stale data from a previous user disappears
          setProfile(null);
          return null;
        }
        return r.ok ? r.json() : null;
      })
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

  useEffect(() => {
    fetchProfile();
    window.addEventListener("focus", fetchProfile);
    return () => window.removeEventListener("focus", fetchProfile);
  }, [fetchProfile]);

  function updateProfile(p: Partial<ProfileState>) {
    setProfile((prev) => (prev ? { ...prev, ...p } : null));
  }

  function resetProfile() {
    setProfile(null);
  }

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, resetProfile, refreshProfile: fetchProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
