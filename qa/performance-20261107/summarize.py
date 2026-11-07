"""Derive this dated snapshot from the four original Lighthouse JSON reports.

Raw reports stay local. Published copies remove URL queries/fragments, which
contain third-party analytics identifiers; scores and timings are unchanged.
"""
import gzip
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parent
URL = re.compile(r"https?://[^\s\"<>]+")


def clean_url(match):
    value = match.group(0)
    parts = urlsplit(value)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


def sanitize(value):
    if isinstance(value, str):
        return URL.sub(clean_url, value)
    if isinstance(value, list):
        return [sanitize(item) for item in value]
    if isinstance(value, dict):
        return {key: sanitize(item) for key, item in value.items()}
    return value


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


reports = []
(ROOT / "reports").mkdir(exist_ok=True)
for mode, run in [("mobile", 1), ("mobile", 2), ("mobile", 3), ("desktop", 1)]:
    source = ROOT / "cli" / f"lighthouse-{mode}-{run}.json"
    original = source.read_bytes()
    raw = json.loads(original)
    audits = raw["audits"]
    safe = sanitize(raw)
    # Numeric evidence must survive the removal of URL parameters unchanged.
    assert safe["categories"] == raw["categories"]
    for key, audit in audits.items():
        assert safe["audits"][key].get("score") == audit.get("score")
        assert safe["audits"][key].get("numericValue") == audit.get("numericValue")
    packed = gzip.compress(json.dumps(safe, ensure_ascii=False).encode(), mtime=0)
    destination = ROOT / "reports" / f"lighthouse-{mode}-{run}.json.gz"
    destination.write_bytes(packed)
    breakdown = audits["lcp-breakdown-insight"]["details"]["items"]
    node = next(item for item in breakdown if item["type"] == "node")
    table = next(item for item in breakdown if item["type"] == "table")
    document = next(
        item for item in audits["network-requests"]["details"]["items"]
        if item["resourceType"] == "Document"
        and item["url"] == "https://pirogorsk.ru/"
    )
    reports.append({
        "mode": mode,
        "run": run,
        "fetchTime": raw["fetchTime"],
        "lighthouseVersion": raw["lighthouseVersion"],
        "browser": raw["userAgent"],
        "scores": {key: round(value["score"] * 100) for key, value in raw["categories"].items()},
        "metrics": {key: audits[key]["numericValue"] for key in [
            "first-contentful-paint", "largest-contentful-paint",
            "total-blocking-time", "cumulative-layout-shift", "speed-index",
        ]},
        "observedLcpMs": audits["metrics"]["details"]["items"][0]["observedLargestContentfulPaint"],
        "observedSubpartsMs": {item["subpart"]: item["duration"] for item in table["items"]},
        "lcpElement": node,
        "insightScores": {key: audits[key]["score"] for key in [
            "lcp-discovery-insight", "lcp-breakdown-insight", "render-blocking-insight",
        ]},
        "failedBestPractices": [{
            "id": item["id"],
            "title": audits[item["id"]]["title"],
            "details": safe["audits"][item["id"]].get("details"),
        } for item in raw["categories"]["best-practices"]["auditRefs"]
            if audits[item["id"]].get("score") == 0 and item.get("weight", 0) > 0],
        "mainDocument": document,
        "settings": raw["configSettings"],
        "runWarnings": raw.get("runWarnings", []),
        "sourceSha256": hashlib.sha256(original).hexdigest(),
        "publishedReport": str(destination.relative_to(ROOT)),
        "publishedReportSha256": hashlib.sha256(packed).hexdigest(),
    })

write_json(ROOT / "diagnostics.json", sanitize({
    "url": "https://pirogorsk.ru/",
    "qaQuery": False,
    "runtimeSha": "a4648bd57574f71628758473ef3cdbc2e20e0a7e",
    "method": "One new Chrome process/profile per sample; default Lighthouse simulated throttling; analytics enabled",
    "sanitization": "HTTP(S) URL query strings/fragments removed recursively; numeric audits and category scores verified unchanged; original reports remain local",
    "reports": reports,
}))
write_json(ROOT / "ranges.json", json.loads((ROOT / "cli" / "performance-ranges.json").read_text()))
print(json.dumps({"reports": len(reports), "numericEvidenceUnchanged": True,
                  "sanitizedBytes": sum((ROOT / item["publishedReport"]).stat().st_size for item in reports)}))
