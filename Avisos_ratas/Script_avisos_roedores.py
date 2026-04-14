import requests
import pandas as pd
from datetime import datetime, timedelta, timezone

# =========================
# CONFIGURACIÓN (RATAS Y CUCARACHAS)
# =========================
BASE_URL = "https://servpub.madrid.es/AVSICAPI/requests"

SERVICE_ID = "5b60529fed6abc0b2b8b45eb"   # Ratas y cucarachas
END_DATE_STR = "2026-01-27T09:37:37Z"
DAYS_BACK = 365

OUT_CSV = "avisos_ratas_365dias.csv"

def parse_utc(dt_str: str) -> datetime:
    if dt_str.endswith("Z"):
        dt_str = dt_str.replace("Z", "+00:00")
    dt = datetime.fromisoformat(dt_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

end_dt = parse_utc(END_DATE_STR)
start_dt = end_dt - timedelta(days=DAYS_BACK)

params = {
    "jurisdiction_ids": "es.madrid",
    "limit": 90,
    "service_ids": SERVICE_ID,              # <-- aquí sí va el de ratas
    "datetime_option": "requested_datetime",
    "start_date": start_dt.isoformat(timespec="seconds").replace("+00:00", "Z"),
}

all_records = []
seen_ids = set()

while True:
    params["end_date"] = end_dt.isoformat(timespec="seconds").replace("+00:00", "Z")

    r = requests.get(BASE_URL, params=params, timeout=60)
    r.raise_for_status()

    records = r.json()  # lista

    if not records:
        print("No hay más registros en el rango.")
        break

    nuevos = 0
    for rec in records:
        rid = rec.get("service_request_id") or rec.get("token") or rec.get("id")
        if rid and rid not in seen_ids:
            seen_ids.add(rid)
            all_records.append(rec)
            nuevos += 1

    oldest = min(parse_utc(rec["requested_datetime"]) for rec in records if "requested_datetime" in rec)
    print(f"Lote: {len(records)} | Nuevos: {nuevos} | Total: {len(all_records)} | Oldest: {oldest.isoformat()}")

    if oldest <= start_dt:
        print(f"Alcanzado el inicio del rango ({DAYS_BACK} días).")
        break

    end_dt = oldest - timedelta(seconds=1)

df = pd.DataFrame(all_records)
df.to_csv(OUT_CSV, index=False, encoding="utf-8")
print(f"CSV generado: {OUT_CSV} | Registros: {len(df)}")
