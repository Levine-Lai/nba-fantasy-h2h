// Fixture presentation helpers stay here so homepage/detail callers share one status model.
export function formatKickoffBj(isoTime) {
  if (!isoTime) return "--:--";
  const dt = new Date(isoTime);
  if (Number.isNaN(dt.getTime())) return "--:--";
  return dt.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  });
}

export function resolveFixtureStatus(fixture) {
  const kickoffMs = fixture?.kickoff_time ? new Date(fixture.kickoff_time).getTime() : null;
  const nowMs = Date.now();
  const finished = !!(fixture?.finished || fixture?.finished_provisional);

  if (finished) {
    return { code: "finished", label: "已结束" };
  }

  if (fixture?.started) {
    if (Number.isFinite(kickoffMs) && nowMs - kickoffMs >= 5 * 60 * 60 * 1000) {
      return { code: "finished", label: "已结束" };
    }
    const minutes = Number(fixture?.minutes || 0);
    if (minutes > 0) {
      return { code: "live", label: `进行中 ${minutes}'` };
    }
    return { code: "live", label: "进行中" };
  }

  return { code: "upcoming", label: "未开始" };
}
