!pip -q install -U google-genai pymupdf pydantic pandas numpy scikit-learn matplotlib seaborn
import os
import re
import json
import hashlib
from pathlib import Path
from typing import Optional, List, Literal

import fitz
import numpy as np
import pandas as pd
from pydantic import BaseModel, Field, ConfigDict

print("Environment ready.")
PDF_PATH = None

try:
    from google.colab import files
    uploaded = files.upload()
    if uploaded:
        PDF_PATH = next(iter(uploaded.keys()))
        print("Uploaded:", PDF_PATH)
except Exception:
    pass

# Local/Jupyter example:
# PDF_PATH = "/path/to/FlashReport_January_2026.pdf"

print("PDF_PATH =", PDF_PATH)
from google import genai
from google.genai import types

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("GEMINI_API_KEY is not set.")
else:
    client = genai.Client(api_key=GEMINI_API_KEY)
    MODEL_NAME = "gemini-2.5-flash"
    print("Configured:", MODEL_NAME)
PageType = Literal[
    "overview", "chart", "hml_category", "ministry_summary", "state_summary",
    "completed_projects", "newly_added_projects", "north_east_projects",
    "all_ongoing_projects", "table_of_contents", "other"
]

RecordType = Literal[
    "ongoing", "completed", "newly_added", "north_east_ongoing", "other_project"
]

class ProjectRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    serial_no: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    agency: Optional[str] = None
    ministry_or_department: Optional[str] = None
    sector: Optional[str] = None
    state: Optional[str] = None

    approval_date: Optional[str] = None
    start_date: Optional[str] = None
    original_completion_date: Optional[str] = None
    target_completion_date: Optional[str] = None
    revised_completion_date: Optional[str] = None

    original_cost_crore: Optional[float] = None
    revised_cost_crore: Optional[float] = None
    cumulative_expenditure_crore: Optional[float] = None
    physical_progress_pct: Optional[float] = None

    record_type: Optional[RecordType] = None
    source_page: Optional[int] = None
    source_section: Optional[str] = None
    source_pdf: Optional[str] = None

    extraction_confidence: Optional[float] = None
    extraction_notes: Optional[str] = None


class PageExtraction(BaseModel):
    model_config = ConfigDict(extra="ignore")

    page_type: PageType
    report_month: Optional[str] = None
    report_date: Optional[str] = None
    ministry_or_department: Optional[str] = None
    sector: Optional[str] = None
    state: Optional[str] = None
    records: List[ProjectRecord] = Field(default_factory=list)
    page_notes: Optional[str] = None
def render_pdf(pdf_path: str, output_dir="rendered_pages", dpi=160):
    pdf_path = Path(pdf_path)
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf_path)
    rendered = []
    matrix = fitz.Matrix(dpi / 72, dpi / 72)

    for page_index in range(len(doc)):
        page = doc.load_page(page_index)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        img_path = out_dir / f"page_{page_index+1:04d}.png"
        pix.save(str(img_path))
        rendered.append(str(img_path))

    print(f"Rendered {len(rendered)} pages.")
    return rendered

if PDF_PATH:
    page_images = render_pdf(PDF_PATH)
else:
    page_images = []
EXTRACTION_INSTRUCTION = """
You are a document-understanding system extracting structured data from a government infrastructure project report page.

First understand the VISUAL LAYOUT. Use visible table headers, column positions, row boundaries, typography and continuation structure.

Classify the page as:
overview, chart, hml_category, ministry_summary, state_summary,
completed_projects, newly_added_projects, north_east_projects,
all_ongoing_projects, table_of_contents, other.

PROJECT RULES:
- Do NOT treat headings, chart labels, legends, page numbers, totals, notes,
  table titles, sector names, ministry names, or report metadata as projects.
- A genuine project normally has a project identifier/code and project name.
- If an identifier is unreadable, do not invent one.
- Reconstruct wrapped/multi-line project names as one record.
- Interpret parentheses according to visible column headers.
- '-' / '—' / 'NA' / blank source values become null.
- Never calculate a missing source value.
- Never copy summary totals into individual project records.
- Preserve project names and agencies as shown, correcting only obvious OCR/spacing noise.
- Percentages are numeric values without the percent sign.
- Costs/expenditure are in Rs. crore when indicated by the table.
- If the page has no project rows, return records=[].
- Do not invent dates, costs, states, agencies or project IDs.
- Include source_page and source_section where visible.
- If a row continues from another page, record the visible information and explain it in extraction_notes.

Return valid JSON matching the supplied PageExtraction schema.
"""
PAGE_SCHEMA = PageExtraction.model_json_schema()
print(json.dumps(PAGE_SCHEMA, indent=2)[:6000])
def extract_page_with_vlm(image_path: str, page_number: int):
    if not GEMINI_API_KEY:
        raise RuntimeError("Set GEMINI_API_KEY before extraction.")

    image_bytes = Path(image_path).read_bytes()

    prompt = (
        EXTRACTION_INSTRUCTION
        + f"\\nPDF page number: {page_number}"
        + "\\nSet source_page to this page number."
    )

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
            prompt,
        ],
        config=types.GenerateContentConfig(
            temperature=0,
            response_mime_type="application/json",
            response_schema=PAGE_SCHEMA,
        ),
    )

    parsed = PageExtraction.model_validate(json.loads(response.text))

    for record in parsed.records:
        record.source_page = page_number
        record.source_pdf = Path(PDF_PATH).name if PDF_PATH else None

    return parsed
MAX_PAGES = 3

results = []
errors = []

images_to_process = page_images[:MAX_PAGES] if MAX_PAGES else page_images

for page_number, image_path in enumerate(images_to_process, start=1):
    try:
        result = extract_page_with_vlm(image_path, page_number)
        results.append(result)
        print(f"Page {page_number}: {result.page_type} | projects={len(result.records)}")
    except Exception as exc:
        errors.append({"page": page_number, "image": image_path, "error": str(exc)})
        print(f"Page {page_number}: ERROR -> {exc}")

print("Successful pages:", len(results))
print("Errors:", len(errors))
def results_to_records(results):
    rows = []

    for page_result in results:
        for record in page_result.records:
            row = record.model_dump()
            row["page_type"] = page_result.page_type
            row["report_month"] = page_result.report_month
            row["report_date"] = page_result.report_date

            if not row.get("ministry_or_department"):
                row["ministry_or_department"] = page_result.ministry_or_department
            if not row.get("sector"):
                row["sector"] = page_result.sector
            if not row.get("state"):
                row["state"] = page_result.state

            rows.append(row)

    return pd.DataFrame(rows)

raw_records = results_to_records(results)
print("Project records:", len(raw_records))
display(raw_records.head(20) if len(raw_records) else raw_records)
NUMERIC_COLS = [
    "original_cost_crore",
    "revised_cost_crore",
    "cumulative_expenditure_crore",
    "physical_progress_pct",
    "extraction_confidence",
]

def clean_text(x):
    if pd.isna(x):
        return None
    x = str(x).strip()
    return x if x else None

def normalize_project_id(x):
    x = clean_text(x)
    return re.sub(r"\\s+", "", x) if x else None

def normalize_numeric(x):
    if pd.isna(x) or x is None or x == "":
        return np.nan
    if isinstance(x, (int, float, np.number)):
        return float(x)
    try:
        return float(str(x).replace(",", "").replace("%", "").strip())
    except ValueError:
        return np.nan

canonical = raw_records.copy()

if len(canonical):
    for col in canonical.columns:
        if canonical[col].dtype == "object":
            canonical[col] = canonical[col].map(clean_text)

    canonical["project_id"] = canonical["project_id"].map(normalize_project_id)

    for col in NUMERIC_COLS:
        if col in canonical.columns:
            canonical[col] = canonical[col].map(normalize_numeric)

    for col in [
        "approval_date", "start_date", "original_completion_date",
        "target_completion_date", "revised_completion_date", "report_date"
    ]:
        if col in canonical.columns:
            canonical[col] = pd.to_datetime(canonical[col], errors="coerce")

display(canonical.head(20) if len(canonical) else canonical)
def make_report_id(pdf_path):
    stem = Path(pdf_path).stem
    digest = hashlib.sha1(stem.encode("utf-8")).hexdigest()[:10]
    return f"{stem}_{digest}"

report_id = make_report_id(PDF_PATH) if PDF_PATH else None
report_name = Path(PDF_PATH).name if PDF_PATH else None

canonical["report_id"] = report_id
canonical["source_pdf"] = report_name

canonical["snapshot_id"] = (
    canonical["project_id"].fillna("NO_ID").astype(str)
    + "::"
    + canonical["report_id"].fillna("NO_REPORT").astype(str)
    + "::"
    + canonical["source_page"].fillna(-1).astype(str)
    + "::"
    + canonical["source_section"].fillna("unknown").astype(str)
)

print("report_id =", report_id)
def first_non_null(series):
    values = [v for v in series.tolist() if not pd.isna(v) and v not in ("", None)]
    return values[0] if values else np.nan

def reconcile_same_report(df):
    if df.empty:
        return df.copy()

    keys = ["project_id", "report_id", "source_section"]
    keys = [k for k in keys if k in df.columns]

    aggregations = {
        col: first_non_null
        for col in df.columns
        if col not in keys
    }

    return df.groupby(keys, dropna=False, as_index=False).agg(aggregations)

snapshots = reconcile_same_report(canonical)

print("Before:", len(canonical))
print("After same-report reconciliation:", len(snapshots))
def quality_report(df):
    if df.empty:
        return pd.DataFrame()

    checks = {
        "missing_project_id": df["project_id"].isna(),
        "missing_project_name": df["project_name"].isna(),
        "progress_out_of_range": (
            df["physical_progress_pct"].notna()
            & ((df["physical_progress_pct"] < 0) | (df["physical_progress_pct"] > 100))
        ),
        "negative_original_cost": (
            df["original_cost_crore"].notna() & (df["original_cost_crore"] < 0)
        ),
        "negative_revised_cost": (
            df["revised_cost_crore"].notna() & (df["revised_cost_crore"] < 0)
        ),
        "negative_expenditure": (
            df["cumulative_expenditure_crore"].notna()
            & (df["cumulative_expenditure_crore"] < 0)
        ),
        "revised_less_than_original": (
            df["revised_cost_crore"].notna()
            & df["original_cost_crore"].notna()
            & (df["revised_cost_crore"] < df["original_cost_crore"])
        ),
    }

    rows = []
    for name, mask in checks.items():
        rows.append({
            "check": name,
            "count": int(mask.sum()),
            "rate": float(mask.mean())
        })

    duplicate = df["snapshot_id"].duplicated(keep=False)
    rows.append({
        "check": "duplicate_snapshot_id",
        "count": int(duplicate.sum()),
        "rate": float(duplicate.mean())
    })

    return pd.DataFrame(rows)

dq = quality_report(snapshots)
display(dq)
if not snapshots.empty:
    with_id = snapshots[snapshots["project_id"].notna()].copy()

    master_cols = [
        "project_id", "project_name", "agency",
        "ministry_or_department", "sector", "state"
    ]
    master_cols = [c for c in master_cols if c in with_id.columns]

    if len(with_id):
        project_master = (
            with_id.sort_values(["project_id", "source_page"])
                    .groupby("project_id", as_index=False)[master_cols[1:]]
                    .first()
        )
        ids = with_id["project_id"].drop_duplicates().tolist()
        project_master.insert(0, "project_id", ids[:len(project_master)])
    else:
        project_master = pd.DataFrame()
else:
    project_master = pd.DataFrame()

display(project_master.head(20))
def safe_ratio(a, b):
    a = pd.to_numeric(a, errors="coerce")
    b = pd.to_numeric(b, errors="coerce")
    return a / b.replace(0, np.nan)

def build_features(df):
    out = df.copy()

    out["expenditure_ratio_original"] = safe_ratio(
        out["cumulative_expenditure_crore"],
        out["original_cost_crore"]
    )

    out["expenditure_ratio_revised"] = safe_ratio(
        out["cumulative_expenditure_crore"],
        out["revised_cost_crore"]
    )

    out["revised_cost_growth_pct"] = (
        safe_ratio(out["revised_cost_crore"], out["original_cost_crore"]) - 1
    ) * 100

    out["physical_minus_expenditure_pct"] = (
        out["physical_progress_pct"]
        - out["expenditure_ratio_original"] * 100
    )

    return out

snapshot_features = build_features(snapshots)
display(snapshot_features.head(20))
def build_outcomes(df):
    if df.empty:
        return pd.DataFrame()

    completed = df[
        df["record_type"].eq("completed")
        & df["project_id"].notna()
    ].copy()

    if completed.empty:
        return completed

    final = (
        completed.sort_values(["project_id", "source_page"])
                  .groupby("project_id", as_index=False)
                  .tail(1)
                  .copy()
    )

    final["overrun_amount_crore"] = (
        final["revised_cost_crore"] - final["original_cost_crore"]
    )

    final["overrun_pct"] = (
        final["overrun_amount_crore"]
        / final["original_cost_crore"].replace(0, np.nan)
    ) * 100

    final["is_overrun"] = final["overrun_pct"] > 0

    return final

outcomes = build_outcomes(snapshots)
display(outcomes.head(20))
from sklearn.model_selection import GroupShuffleSplit
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score

if not outcomes.empty:
    feature_candidates = [
        "original_cost_crore",
        "cumulative_expenditure_crore",
        "physical_progress_pct",
        "expenditure_ratio_original",
        "expenditure_ratio_revised",
        "physical_minus_expenditure_pct",
        "revised_cost_growth_pct",
        "sector",
        "state",
        "ministry_or_department",
    ]

    feature_cols = [c for c in feature_candidates if c in outcomes.columns]

    X = outcomes[feature_cols].copy()
    y = outcomes["is_overrun"].astype(int)
    groups = outcomes["project_id"]

    numeric_features = [c for c in feature_cols if X[c].dtype != "object"]
    categorical_features = [c for c in feature_cols if X[c].dtype == "object"]

    preprocessor = ColumnTransformer([
        ("num", SimpleImputer(strategy="median"), numeric_features),
        ("cat", Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore"))
        ]), categorical_features)
    ])

    model = Pipeline([
        ("prep", preprocessor),
        ("clf", RandomForestClassifier(
            n_estimators=300,
            random_state=42,
            class_weight="balanced"
        ))
    ])

    if len(outcomes) >= 10 and groups.nunique() >= 2:
        splitter = GroupShuffleSplit(
            n_splits=1, test_size=0.2, random_state=42
        )
        train_idx, test_idx = next(splitter.split(X, y, groups=groups))

        model.fit(X.iloc[train_idx], y.iloc[train_idx])
        pred = model.predict(X.iloc[test_idx])

        print(classification_report(
            y.iloc[test_idx], pred, zero_division=0
        ))

        if len(np.unique(y.iloc[test_idx])) == 2:
            prob = model.predict_proba(X.iloc[test_idx])[:, 1]
            print("ROC-AUC:", roc_auc_score(y.iloc[test_idx], prob))
    else:
        print("Not enough completed project outcomes for a meaningful evaluation.")
else:
    print("No completed project outcomes in this extraction.")
EXPORT_DIR = Path("PS2026103_output")
EXPORT_DIR.mkdir(exist_ok=True)

project_master.to_csv(EXPORT_DIR / "project_master.csv", index=False)
snapshots.to_csv(EXPORT_DIR / "project_snapshots.csv", index=False)
outcomes.to_csv(EXPORT_DIR / "project_outcomes.csv", index=False)
dq.to_csv(EXPORT_DIR / "data_quality_report.csv", index=False)
pd.DataFrame(errors).to_csv(EXPORT_DIR / "extraction_errors.csv", index=False)

print("Output directory:", EXPORT_DIR.resolve())
for path in sorted(EXPORT_DIR.iterdir()):
    print(f" - {path.name}: {path.stat().st_size:,} bytes")
