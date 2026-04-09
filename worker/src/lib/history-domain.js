// History/event helpers centralize how the project interprets GW/Day semantics.
export function extractGwNumber(value) {
  if (value === null || value === undefined) return null;
  const text = String(value);
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

export function getCurrentEvent(events) {
  const current = events.find((e) => e.is_current);
  if (current) return [current.id, current.name || `GW${current.id}`];
  const firstUnfinished = events.find((e) => !e.finished);
  if (firstUnfinished) return [firstUnfinished.id, firstUnfinished.name || `GW${firstUnfinished.id}`];
  const last = events[events.length - 1];
  return [last?.id || 1, last?.name || "GW1"];
}

export function extractHistoryRecords(historyData) {
  if (!historyData || typeof historyData !== "object") return [];
  for (const key of ["history", "chips", "card_history", "cards", "events", "results"]) {
    if (Array.isArray(historyData[key])) return historyData[key];
  }
  return [];
}

export function extractChipHistoryRecords(historyData) {
  if (!historyData || typeof historyData !== "object") return [];
  if (Array.isArray(historyData.chips)) return historyData.chips;
  for (const key of ["card_history", "cards", "events", "results", "history"]) {
    if (Array.isArray(historyData[key])) return historyData[key];
  }
  return [];
}

export function parseEventMetaFromName(eventName) {
  const text = String(eventName || "");
  let match = text.match(/gameweek\s*(\d+)\s*-\s*day\s*(\d+)/i);
  if (match) {
    return { gw: Number(match[1]), day: Number(match[2]) };
  }
  match = text.match(/(?:GW)?(\d+)\.(\d+)/i);
  if (match) {
    return { gw: Number(match[1]), day: Number(match[2]) };
  }
  match = text.match(/(?:GW)?(\d+)[\s-]+day\s*(\d+)/i);
  if (match) {
    return { gw: Number(match[1]), day: Number(match[2]) };
  }
  return { gw: extractGwNumber(text), day: null };
}

export function buildEventMetaById(events) {
  const map = {};
  for (const item of events || []) {
    const id = Number(item?.id);
    if (!id) continue;
    const meta = parseEventMetaFromName(item?.name || "");
    map[id] = {
      gw: meta.gw,
      day: meta.day,
      name: item?.name || "",
      deadline_time: item?.deadline_time || null,
    };
  }
  return map;
}

export function resolveTransferGwDay(transfer, eventMetaById) {
  const eventId = Number(transfer?.event);
  const eventMeta = eventMetaById?.[eventId] || {};
  const gw =
    Number(transfer?.gw || transfer?.gameweek || eventMeta.gw || extractGwNumber(transfer?.event)) || null;

  let day = null;
  for (const key of ["day", "game_day", "gameday"]) {
    const value = transfer?.[key];
    if (value !== undefined && value !== null) {
      day = Number(value);
      if (!Number.isNaN(day)) break;
    }
  }
  if (!day && eventMeta.day) day = Number(eventMeta.day);
  if (!day) {
    const ev = transfer?.event;
    if (typeof ev === "number") {
      const frac = ev - Math.trunc(ev);
      const parsed = Math.round(frac * 10);
      if (parsed > 0) day = parsed;
    } else if (typeof ev === "string" && ev.includes(".")) {
      const part = ev.split(".", 2)[1];
      const m = part.match(/(\d+)/);
      if (m) day = Number(m[1]);
    }
  }
  return { gw, day };
}

export function getWildcardDayFromHistory(historyData, currentGw, currentEvent, eventMetaById) {
  for (const item of extractChipHistoryRecords(historyData)) {
    const name = String(item?.name || "").toLowerCase();
    if (name !== "wildcard" && name !== "wild_card") continue;
    const itemEvent = item?.event;
    const eventMeta = eventMetaById?.[Number(itemEvent)] || {};
    const itemGw = item?.gw || item?.gameweek || eventMeta.gw || extractGwNumber(itemEvent);
    if (itemGw !== currentGw && itemEvent !== currentEvent) continue;
    const day = Number(eventMeta.day || item?.day || 0) || null;
    if (day) return day;
    if (Number(itemEvent) === Number(currentEvent)) {
      return Number(eventMetaById?.[Number(currentEvent)]?.day || 0) || null;
    }
  }
  return null;
}

export function getChipDayMapFromHistory(historyData, currentGw, currentEvent, eventMetaById) {
  const chipDayMap = {};
  for (const item of extractChipHistoryRecords(historyData)) {
    const rawName = String(item?.name || "").toLowerCase();
    if (!rawName) continue;
    const itemEvent = item?.event;
    const eventMeta = eventMetaById?.[Number(itemEvent)] || {};
    const itemGw = item?.gw || item?.gameweek || eventMeta.gw || extractGwNumber(itemEvent);
    if (itemGw !== currentGw && itemEvent !== currentEvent) continue;
    const day = Number(eventMeta.day || item?.day || 0) || null;
    if (!day) continue;
    chipDayMap[day] = rawName;
  }
  return chipDayMap;
}

export function isWildcardActiveFromHistory(historyData, currentGw, currentEvent, eventMetaById) {
  return getWildcardDayFromHistory(historyData, currentGw, currentEvent, eventMetaById) !== null;
}

export function countTransfersInGw(transfers, currentGw, eventMetaById) {
  let count = 0;
  for (const t of transfers || []) {
    const { gw } = resolveTransferGwDay(t, eventMetaById);
    if (gw === currentGw) count += 1;
  }
  return count;
}

export function countTransfersInGd1(transfers, currentGw, eventMetaById) {
  let count = 0;
  for (const t of transfers || []) {
    const { gw, day } = resolveTransferGwDay(t, eventMetaById);
    if (gw !== currentGw) continue;
    if (day === 1) count += 1;
  }
  return count;
}

export function calculateTransferPenalty(transferCount) {
  return Math.max(0, transferCount - 2) * 100;
}
