import { useEffect, useRef, useState } from "react";
import {
  SOCIAL_STAT_KEYS,
  SOCIAL_STATS_CACHE_TTL_MS,
  fetchSocialStat,
  readFreshSocialStatsCache,
  writeSocialStatsCache,
} from "./socialStats.mjs";

export type SocialStatKey = "twitch" | "youtube" | "discord" | "tiktok" | "instagram" | "x" | "github";

export type SocialStat = {
  platform: SocialStatKey;
  value: number;
  label: string;
  secondary?: {
    value: number;
    label: string;
  };
  fetchedAt: number;
};

export type SocialStats = Partial<Record<SocialStatKey, SocialStat>>;

const statKeys = SOCIAL_STAT_KEYS as SocialStatKey[];

function keepFreshStats(stats: SocialStats, now: number): SocialStats {
  return Object.fromEntries(Object.entries(stats).filter(([, stat]) => (
    stat && now - stat.fetchedAt < SOCIAL_STATS_CACHE_TTL_MS
  ))) as SocialStats;
}

export function useSocialStats(): SocialStats {
  const [stats, setStats] = useState<SocialStats>({});
  const lastRefreshAt = useRef(0);

  useEffect(() => {
    let active = true;
    let refreshInFlight = false;
    const lifecycle = new AbortController();
    const cacheFrame = window.requestAnimationFrame(() => {
      if (active) setStats(readFreshSocialStatsCache(window.localStorage) as SocialStats);
    });

    const refresh = async () => {
      if (!active || refreshInFlight || document.visibilityState === "hidden") return;
      refreshInFlight = true;
      setStats((current) => keepFreshStats(current, Date.now()));

      const nextStats: SocialStats = {};
      await Promise.all(statKeys.map(async (platform) => {
        const result = await fetchSocialStat(platform, { signal: lifecycle.signal }) as SocialStat | null;
        if (!active) return;

        if (result) {
          nextStats[platform] = result;
          setStats((current) => ({ ...current, [platform]: result }));
        } else {
          setStats((current) => {
            if (!current[platform]) return current;
            const next = { ...current };
            delete next[platform];
            return next;
          });
        }
      }));

      if (active) {
        writeSocialStatsCache(window.localStorage, nextStats);
        lastRefreshAt.current = Date.now();
        refreshInFlight = false;
      }
    };

    void refresh();
    const refreshInterval = window.setInterval(() => void refresh(), SOCIAL_STATS_CACHE_TTL_MS);
    const refreshWhenVisible = () => {
      if (
        document.visibilityState === "visible"
        && Date.now() - lastRefreshAt.current >= SOCIAL_STATS_CACHE_TTL_MS
      ) {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      lifecycle.abort();
      window.cancelAnimationFrame(cacheFrame);
      window.clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  return stats;
}
