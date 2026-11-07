#!/usr/bin/env python3
"""Validate saved Wordstat exports and derive research files without summing demand."""
import csv
import hashlib
import json
import re
from collections import defaultdict
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[1]


def save_json(name, value):
    (ROOT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def save_csv(name, rows, fields):
    with (ROOT / name).open("w", newline="") as output:
        writer = csv.DictWriter(output, fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def phrase_key(value):
    return re.sub(r"\s+", " ", value.lower().replace("ё", "е")).strip()


def main():
    observations = json.loads((ROOT / "observations.json").read_text())
    queue = json.loads((ROOT / "review-queue.json").read_text())
    reviewed_keys = {phrase_key(example["query"]) for item in queue for example in item["examples"]}
    old_path = PROJECT / "research/blog-semantics-20261031/wordstat-20261031/broad-tail-triage.csv"
    with old_path.open() as source:
        old_rows = list(csv.DictReader(source))
    old = defaultdict(set)
    for row in old_rows:
        old[phrase_key(row["query"])].add(row["status"])

    normalized, manifest = [], []
    for observation in observations:
        path = ROOT / observation["raw"]
        raw = path.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        assert digest == observation["sha256"], path
        rows = list(csv.reader(raw.decode("utf-8-sig").splitlines(), delimiter=";"))
        assert rows[0][:2] == ["Запросы со словами", "Число запросов"], path
        match = re.fullmatch(r"Топ частотных запросов «(.+)», (\d{2}\.\d{2}\.\d{4}) — (\d{2}\.\d{2}\.\d{4}), Калининградская область, все устройства", rows[0][2])
        assert match and match[1] == observation["seed"], path
        assert len(rows) - 1 == observation["rowCount"], path
        seen = set()
        for index, row in enumerate(rows[1:], 1):
            assert len(row) == 3 and row[0] and row[1].isdigit() and not row[2], (path, index)
            key = phrase_key(row[0])
            assert key not in seen, (path, key)
            seen.add(key)
            normalized.append({
                "seed": observation["seed"], "export_row": index,
                "query": row[0], "query_key": key, "frequency": int(row[1]),
                "export_period_start": match[2], "export_period_end": match[3],
                "region_id": 10857, "devices": "all", "metric": "seo_frequency",
                "ui_period_observed": observation.get("uiPeriodObserved") or "not_recorded",
                "source_url": observation["sourceURL"], "raw": observation["raw"], "sha256": digest,
                "prior_lexical_labels": "|".join(sorted(old.get(key, []))),
                "review_status": "reviewed_example_only" if key in reviewed_keys else "not_manually_reviewed",
                "serp_verified": False,
            })
        manifest.append({"path": observation["raw"], "bytes": len(raw), "sha256": digest,
                         "rows": len(rows) - 1, "header": rows[0][2]})

    save_csv("normalized.csv", normalized, list(normalized[0]))
    save_json("raw-manifest.json", manifest)
    unique = defaultdict(list)
    for row in normalized:
        unique[row["query_key"]].append(row)
    deduplicated = []
    for key, rows in unique.items():
        frequencies = sorted({row["frequency"] for row in rows})
        deduplicated.append({"query_key": key, "query": rows[0]["query"],
                            "frequency_min": frequencies[0], "frequency_max": frequencies[-1],
                            "frequency_conflict": len(frequencies) != 1,
                            "observations": len(rows), "seeds": "|".join(row["seed"] for row in rows),
                            "prior_lexical_labels": rows[0]["prior_lexical_labels"],
                            "review_status": rows[0]["review_status"]})
    deduplicated.sort(key=lambda row: (-row["frequency_max"], row["query_key"]))
    save_csv("unique-queries.csv", deduplicated, list(deduplicated[0]))

    owners = []
    for path in sorted((PROJECT / "site/journal").glob("*/index.html")):
        html = path.read_text()
        title = re.search(r"<h1\b[^>]*>(.*?)</h1>", html, re.S)
        canonical = re.search(r'<link\s[^>]*rel="canonical"[^>]*href="([^"]+)"', html)
        if title and canonical:
            owners.append({"url": unescape(canonical[1]),
                           "title": unescape(re.sub(r"<[^>]+>", "", title[1])).strip()})
    assert len(owners) >= 61, len(owners)
    save_csv("journal-owners.csv", owners, ["url", "title"])

    urls = {row["url"] for row in owners}
    reviewed = set()
    for item in queue:
        if item["ownerURL"]:
            assert item["ownerURL"] in urls, item["ownerURL"]
        for example in item["examples"]:
            key = phrase_key(example["query"])
            assert key in unique and {row["frequency"] for row in unique[key]} == {example["frequency"]}, example
            reviewed.add(key)
        assert item["serpVerified"] is False

    summary = {
        "exportFiles": len(manifest), "rows": len(normalized), "uniqueQueries": len(unique),
        "duplicateObservations": len(normalized) - len(unique),
        "frequencyConflicts": sum(row["frequency_conflict"] for row in deduplicated),
        "priorDisplayedRows": len(old_rows), "priorUniqueQueries": len(old),
        "queriesPresentInOldTriage": len(set(unique) & set(old)),
        "queriesAbsentFromOldTriage": len(set(unique) - set(old)),
        "absentMeaning": "Phrase-set difference only; not new demand or frequency growth.",
        "journalOwners": len(owners), "manuallyReviewedExamples": len(reviewed),
        "manualReviewRemaining": len(unique) - len(reviewed),
        "periodMismatch": True, "completeTailConfirmed": False,
        "possibleExportBoundary": [o["seed"] for o in observations if o["rowCount"] == 2000],
        "sumsOfFrequencyComputed": False, "serpVerificationPerformed": False,
        "ownerInventorySource": "Local built site/journal snapshot; not a live Google index.",
    }
    save_json("summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
