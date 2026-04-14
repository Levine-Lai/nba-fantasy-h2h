#!/usr/bin/env python3
"""Build generated play-in roster data from picks.xlsx and players.csv."""

from __future__ import annotations

import csv
import json
import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Iterable

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
WORKBOOK_PATH = ROOT / "picks.xlsx"
PLAYERS_CSV_PATH = ROOT / "players.csv"
HEADSHOT_DIR = ROOT / "nba-headshots-520x380"
OUTPUT_PATH = ROOT / "functions" / "api" / "_lib" / "playin-data.generated.js"

TEAM_CN_TO_META = {
    "热火": {"team_code": "MIA", "team_logo_url": "/nba-team-logos/heat.png", "team_name_en": "Miami Heat"},
    "黄蜂": {"team_code": "CHA", "team_logo_url": "/nba-team-logos/hornets.png", "team_name_en": "Charlotte Hornets"},
    "开拓者": {"team_code": "POR", "team_logo_url": "/nba-team-logos/blazers.png", "team_name_en": "Portland Trail Blazers"},
    "太阳": {"team_code": "PHX", "team_logo_url": "/nba-team-logos/suns.png", "team_name_en": "Phoenix Suns"},
    "魔术": {"team_code": "ORL", "team_logo_url": "/nba-team-logos/magic.png", "team_name_en": "Orlando Magic"},
    "76人": {"team_code": "PHI", "team_logo_url": "/nba-team-logos/sixers.png", "team_name_en": "Philadelphia 76ers"},
    "勇士": {"team_code": "GSW", "team_logo_url": "/nba-team-logos/warriors.png", "team_name_en": "Golden State Warriors"},
    "快船": {"team_code": "LAC", "team_logo_url": "/nba-team-logos/clippers.png", "team_name_en": "LA Clippers"},
}


@dataclass(frozen=True)
class HeadshotCandidate:
    filename: str
    person_id: str | None
    team_code: str | None
    short_key: str
    full_key: str


def contains_cjk(value: str) -> bool:
    return any("\u4e00" <= char <= "\u9fff" for char in value)


def fold_ascii(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    return normalized.encode("ascii", "ignore").decode("ascii")


def normalize_text_key(value: str) -> str:
    text = str(value or "").strip().lower()
    return re.sub(r"[\s\-_.'·:：]+", "", text)


def normalize_ascii_key(value: str) -> str:
    text = fold_ascii(str(value or "")).lower()
    return re.sub(r"[^a-z0-9]+", "", text)


def english_name_candidates(name: str) -> list[str]:
    clean = fold_ascii(name or "").replace(".", " ").replace("-", " ").strip()
    tokens = [token for token in re.split(r"\s+", clean) if token]
    if not tokens:
        return []

    last_name = "".join(tokens[1:]) if len(tokens) > 1 else tokens[0]
    primary = "".join(tokens)
    candidates = {
        normalize_ascii_key(primary),
        normalize_ascii_key(f"{tokens[0][0]}{last_name}"),
        normalize_ascii_key(f"{tokens[0][0]}{tokens[-1]}"),
    }
    return [candidate for candidate in candidates if candidate]


def slugify(value: str) -> str:
    ascii_value = fold_ascii(value or "")
    lowered = ascii_value.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", lowered).strip("-")
    return slug or "manager"


def load_player_name_maps() -> tuple[dict[str, str], dict[str, str]]:
    cn_to_en: dict[str, str] = {}
    en_to_cn: dict[str, str] = {}

    with PLAYERS_CSV_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            chinese_name = str(row.get("Chinese Name") or "").strip()
            english_name = str(row.get("English Name") or "").strip()
            if not chinese_name or not english_name:
                continue
            cn_to_en[normalize_text_key(chinese_name)] = english_name
            en_to_cn[normalize_ascii_key(english_name)] = chinese_name

    return cn_to_en, en_to_cn


def load_headshot_candidates() -> list[HeadshotCandidate]:
    candidates: list[HeadshotCandidate] = []
    for image_path in HEADSHOT_DIR.glob("*.png"):
        stem = image_path.stem
        person_id = None
        team_code = None
        short_name = stem
        parts = stem.split("-", 2)
        if len(parts) == 3:
            person_id, team_code, short_name = parts
        candidates.append(
            HeadshotCandidate(
                filename=image_path.name,
                person_id=person_id,
                team_code=team_code,
                short_key=normalize_ascii_key(short_name),
                full_key=normalize_ascii_key(stem),
            )
        )
    return candidates


def find_best_headshot(
    english_name: str,
    team_code: str | None,
    candidates: Iterable[HeadshotCandidate],
) -> dict[str, str | None]:
    target_key = normalize_ascii_key(english_name)
    if not target_key:
        return {
            "headshot_url": None,
            "person_id": None,
        }

    tokens = [token for token in re.split(r"\s+", fold_ascii(english_name).replace(".", " ").replace("-", " ").strip()) if token]
    first_name = tokens[0].lower() if tokens else ""
    last_name = "".join(tokens[1:]).lower() if len(tokens) > 1 else first_name
    alias_keys = english_name_candidates(english_name)

    best_match: HeadshotCandidate | None = None
    best_score = 0.0

    for candidate in candidates:
        if team_code and candidate.team_code and candidate.team_code != team_code:
            continue

        score = SequenceMatcher(None, target_key, candidate.short_key).ratio()
        score = max(score, SequenceMatcher(None, target_key, candidate.full_key).ratio())

        if last_name and last_name in candidate.short_key:
            score += 0.35
        if first_name and candidate.short_key.startswith(first_name[:1]):
            score += 0.15
        if first_name and len(first_name) >= 3 and first_name[:3] in candidate.full_key:
            score += 0.15
        if any(alias and alias == candidate.short_key for alias in alias_keys):
            score += 0.4
        if team_code and candidate.team_code == team_code:
            score += 0.2

        if score > best_score:
            best_score = score
            best_match = candidate

    if not best_match or best_score < 0.72:
        return {
            "headshot_url": None,
            "person_id": None,
        }

    return {
        "headshot_url": f"/nba-headshots-520x380/{best_match.filename}",
        "person_id": best_match.person_id,
    }


def resolve_player_names(
    raw_name: str,
    cn_to_en: dict[str, str],
    en_to_cn: dict[str, str],
) -> tuple[str, str]:
    value = str(raw_name or "").strip()
    if not value:
        return "", ""

    if contains_cjk(value):
        chinese_name = value
        english_name = cn_to_en.get(normalize_text_key(value), "")
        return chinese_name, english_name or value

    english_name = value
    chinese_name = en_to_cn.get(normalize_ascii_key(value), "")
    return chinese_name or value, english_name


def parse_manager_name(title: str, fallback_index: int) -> str:
    raw = str(title or "").strip()
    if "：" in raw:
        value = raw.split("：", 1)[1].strip()
        return value or f"玩家{fallback_index}"
    if ":" in raw:
        value = raw.split(":", 1)[1].strip()
        return value or f"玩家{fallback_index}"
    return raw or f"玩家{fallback_index}"


def build_payload() -> dict:
    cn_to_en, en_to_cn = load_player_name_maps()
    headshot_candidates = load_headshot_candidates()
    workbook = openpyxl.load_workbook(WORKBOOK_PATH, data_only=True)
    worksheet = workbook.active
    rows = list(worksheet.iter_rows(values_only=True))

    manager_blocks: list[dict] = []
    non_empty_headers = [(column_index, header_value) for column_index, header_value in enumerate(rows[0]) if header_value is not None]

    for block_index, (title_column, header_value) in enumerate(non_empty_headers, start=1):
        block_start = title_column - 4
        title = str(header_value or "").replace("\n", " ").strip()
        manager_name = parse_manager_name(title, block_index)
        roster = []

        for slot_index, row in enumerate(rows[2:12], start=1):
            player_name_raw = row[block_start + 4] if block_start + 4 < len(row) else None
            if not player_name_raw:
                continue

            team_name_cn = str(row[block_start + 2] or "").strip()
            team_meta = TEAM_CN_TO_META.get(team_name_cn, {})
            chinese_name, english_name = resolve_player_names(str(player_name_raw), cn_to_en, en_to_cn)
            captain_mark = str(row[block_start + 5] or "").strip().upper()
            role = "starter" if slot_index <= 5 else "bench"
            bench_order = slot_index - 5 if role == "bench" else None
            headshot_meta = find_best_headshot(english_name, team_meta.get("team_code"), headshot_candidates)

            roster.append(
                {
                    "slot": slot_index,
                    "role": role,
                    "bench_order": bench_order,
                    "team_name_cn": team_name_cn,
                    "team_name_en": team_meta.get("team_name_en"),
                    "team_code": team_meta.get("team_code"),
                    "team_logo_url": team_meta.get("team_logo_url"),
                    "price": float(row[block_start + 3] or 0),
                    "display_name": chinese_name or english_name,
                    "chinese_name": chinese_name,
                    "english_name": english_name,
                    "is_captain": captain_mark == "C",
                    "headshot_url": headshot_meta.get("headshot_url"),
                    "person_id": headshot_meta.get("person_id"),
                }
            )

        if not roster:
            continue

        manager_blocks.append(
            {
                "manager_index": block_index,
                "manager_key": slugify(f"{block_index}-{manager_name}"),
                "manager_name": manager_name,
                "manager_label": title,
                "is_complete": len(roster) == 10 and any(player["is_captain"] for player in roster),
                "roster": roster,
            }
        )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_files": {
            "workbook": WORKBOOK_PATH.name,
            "players": PLAYERS_CSV_PATH.name,
        },
        "manager_count": len(manager_blocks),
        "managers": manager_blocks,
    }


def write_generated_module(payload: dict) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    module_text = (
        "// This file is generated by scripts/build-playin-data.py\n"
        "// Do not edit manually.\n\n"
        f"export const PLAYIN_ROSTER_DATA = {json.dumps(payload, ensure_ascii=False, indent=2)};\n"
    )
    OUTPUT_PATH.write_text(module_text, encoding="utf-8")


def main() -> None:
    payload = build_payload()
    write_generated_module(payload)
    print(f"Generated {OUTPUT_PATH.relative_to(ROOT)} with {payload['manager_count']} managers.")


if __name__ == "__main__":
    main()
