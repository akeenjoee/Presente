import csv
import io
import re
from sqlalchemy.orm import Session
from models import Socio, Presenza, UnmatchedLog
from parsers import find_socio_by_name_or_email

def parse_duration_to_minutes(duration_str: str) -> int:
    """
    Converts a Teams duration string like "1h 45m 30s" or "45m" into an integer (total minutes).
    """
    duration_str = duration_str.lower().strip()
    if not duration_str:
        return 0

    total_minutes = 0
    # Match hours
    h_match = re.search(r'(\d+)\s*h', duration_str)
    if h_match:
        total_minutes += int(h_match.group(1)) * 60

    # Match minutes
    m_match = re.search(r'(\d+)\s*m', duration_str)
    if m_match:
        total_minutes += int(m_match.group(1))
        
    # If it only contains seconds (e.g. "30s" or something), and no hours/mins, we could return 1 or 0
    # Let's say if total_minutes is 0 but there is some time, maybe it's less than a minute
    if total_minutes == 0 and re.search(r'\d+', duration_str):
        # Could just be "45" meaning minutes depending on locale, but Teams uses explicit units.
        s_match = re.search(r'(\d+)\s*s', duration_str)
        if s_match and int(s_match.group(1)) >= 30:
            total_minutes = 1

    return total_minutes

def parse_teams_csv(db: Session, event_id: int, csv_bytes: bytes, threshold_minutes: int = 15) -> dict:
    """
    Parses a Microsoft Teams attendance report CSV and updates the database.
    """
    # 1. Smart Decode
    if csv_bytes.startswith(b'\xff\xfe') or csv_bytes.startswith(b'\xfe\xff'):
        # UTF-16 with BOM
        csv_text = csv_bytes.decode('utf-16')
        separator = '\t'
    else:
        try:
            # UTF-8 (with or without BOM)
            csv_text = csv_bytes.decode('utf-8-sig')
            separator = ','
        except UnicodeDecodeError:
            # Fallback
            csv_text = csv_bytes.decode('utf-16le')
            separator = '\t'

    # 2. Extract the actual CSV table (Teams reports have "1. Summary" and "2. Participants" sections)
    lines = csv_text.splitlines()
    table_start_idx = 0
    # Search for a row that has recognizable headers
    for idx, line in enumerate(lines):
        line_lower = line.lower()
        if ("nome" in line_lower or "name" in line_lower) and ("durata" in line_lower or "duration" in line_lower):
            table_start_idx = idx
            break
            
    csv_table_text = "\n".join(lines[table_start_idx:])

    # 3. Parse CSV
    f = io.StringIO(csv_table_text)
    reader = csv.DictReader(f, delimiter=separator)
    headers = reader.fieldnames or []
    
    # If the delimiter was wrong (e.g. UTF-8 but uses tab instead of comma, or viceversa)
    if len(headers) == 1 and (',' in headers[0] or ';' in headers[0] or '\t' in headers[0]):
        # Re-try with a different separator
        if ';' in headers[0]:
            separator = ';'
        elif '\t' in headers[0]:
            separator = '\t'
        else:
            separator = ','
        f = io.StringIO(csv_table_text)
        reader = csv.DictReader(f, delimiter=separator)
        headers = reader.fieldnames or []

    print(f"Teams CSV Headers: {headers}")

    # 3. Flexible Header Parsing
    def find_header(keywords):
        for h in headers:
            if any(k in h.lower() for k in keywords):
                return h
        return None

    nome_header = find_header(["nome", "name"])
    email_header = find_header(["email", "mail", "e-mail"])
    durata_header = find_header(["durata", "duration"])

    if not nome_header or not durata_header:
        raise ValueError(f"CSV format non riconosciuto. Header trovati: {headers}")

    count_matched = 0
    count_unmatched = 0
    count_skipped_threshold = 0

    for row in reader:
        nome_val = (row.get(nome_header) or "").strip()
        email_val = (row.get(email_header) or "").strip() if email_header else ""
        durata_val = (row.get(durata_header) or "").strip()

        if not nome_val:
            continue

        # Convert duration
        durata_minuti = parse_duration_to_minutes(durata_val)

        # Skip if duration is strictly 0 (could just be a phantom row)
        if durata_minuti == 0 and "0" not in durata_val and "m" not in durata_val and "s" not in durata_val:
             pass # might be just an empty string

        # Match member
        query_str = email_val if email_val else nome_val
        socio = find_socio_by_name_or_email(db, query_str)

        if socio:
            if durata_minuti >= threshold_minutes:
                # Add/Update Presenza
                presence = db.query(Presenza).filter(
                    Presenza.evento_id == event_id,
                    Presenza.socio_id == socio.id
                ).first()

                if presence:
                    # Update if modalita was not already better (e.g. IN_PRESENZA)
                    if presence.modalita != "IN_PRESENZA":
                        presence.modalita = "ONLINE"
                    presence.durata_minuti = max(presence.durata_minuti, durata_minuti)
                else:
                    presence = Presenza(
                        evento_id=event_id,
                        socio_id=socio.id,
                        modalita="ONLINE",
                        durata_minuti=durata_minuti
                    )
                    db.add(presence)
                    db.flush()
                count_matched += 1
            else:
                count_skipped_threshold += 1
        else:
            # Add to UnmatchedLog
            # Check if it's already there for this event
            unmatched = db.query(UnmatchedLog).filter(
                UnmatchedLog.evento_id == event_id,
                UnmatchedLog.nome_rilevato == nome_val
            ).first()
            
            if unmatched:
                unmatched.durata_minuti = max(unmatched.durata_minuti, durata_minuti)
                if email_val and not unmatched.email:
                    unmatched.email = email_val
            else:
                unmatched = UnmatchedLog(
                    evento_id=event_id,
                    email=email_val.lower() if email_val else None,
                    nome_rilevato=nome_val,
                    durata_minuti=durata_minuti
                )
                db.add(unmatched)
                db.flush()
            count_unmatched += 1

    db.commit()

    return {
        "status": "success",
        "matched": count_matched,
        "unmatched": count_unmatched,
        "skipped_threshold": count_skipped_threshold,
        "threshold_minutes": threshold_minutes
    }
