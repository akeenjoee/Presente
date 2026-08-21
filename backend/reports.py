import csv
import io
import math
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import models

def get_minutes_summary_data(db: Session, event_id: int, quorum_pct: float = 0.5) -> dict:
    """
    Retrieves and summarizes presence metrics for an event minutes document:
    - Quorum threshold (customizable percentage of active members, defaults to 50%)
    - Voting Quorum reached (Presenti + Valid Excused Proxies)
    - Separated lists of Presenti and Giustificati con Delega.
    """
    event = db.query(models.Evento).filter(models.Evento.id == event_id).first()
    if not event:
        raise ValueError("Event not found")

    total_active_members = db.query(models.Socio).filter(models.Socio.stato == "ATTIVO").count()
    quorum_threshold = math.ceil(total_active_members * quorum_pct)
    
    # Get all presence records
    presences = db.query(models.Presenza).filter(models.Presenza.evento_id == event_id).all()
    
    presenti = []
    giustificati_delega = []
    
    for p in presences:
        if p.modalita in ("IN_PRESENZA", "ONLINE"):
            presenti.append({
                "nome": p.socio.nome,
                "email": p.socio.email,
                "ruolo": p.socio.ruolo,
                "area_lavoro": p.socio.area_lavoro,
                "modalita": p.modalita
            })
        elif p.modalita == "GIUSTIFICATO":
            # Link delegate
            delegante_nome = p.socio.nome
            delegato_nome = p.delegato.nome if p.delegato else p.delega_a or "Nessuno"
            giustificati_delega.append({
                "delegante": delegante_nome,
                "delegato": delegato_nome,
                "text": f"{delegante_nome} (delega a {delegato_nome})"
            })

    total_presenti = len(presenti)
    total_deleghe = len(giustificati_delega)
    voting_quorum_reached = total_presenti + total_deleghe

    return {
        "event_title": event.titolo,
        "event_type": event.tipo,
        "event_date": event.data_ora.strftime("%d/%m/%Y %H:%M"),
        "total_active_members": total_active_members,
        "quorum_pct": quorum_pct,
        "quorum_threshold": quorum_threshold,
        "voting_quorum_reached": voting_quorum_reached,
        "is_quorum_valid": voting_quorum_reached >= quorum_threshold,
        "presenti": sorted(presenti, key=lambda x: x["nome"]),
        "giustificati_delega": sorted(giustificati_delega, key=lambda x: x["delegante"]),
    }

def generate_minutes_csv(db: Session, event_id: int, quorum_pct: float = 0.5) -> bytes:
    """
    Generates a CSV minutes report bytes string.
    """
    data = get_minutes_summary_data(db, event_id, quorum_pct)
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header metadata
    writer.writerow(["VERBALE DI PRESENZA - METADATI"])
    writer.writerow(["Titolo Evento", data["event_title"]])
    writer.writerow(["Tipologia", data["event_type"]])
    writer.writerow(["Data e Ora", data["event_date"]])
    writer.writerow(["Totale Soci Attivi", data["total_active_members"]])
    writer.writerow(["Soglia Quorum impostata", f"{int(data['quorum_pct'] * 100)}%"])
    writer.writerow(["Membri minimi per Quorum", data["quorum_threshold"]])
    writer.writerow(["Quorum Raggiunto (Presenti + Deleghe)", data["voting_quorum_reached"]])
    writer.writerow(["Quorum Valido", "SI" if data["is_quorum_valid"] else "NO"])
    writer.writerow([])
    
    # Presenti list
    writer.writerow(["MEMBRI PRESENTI", f"Totale: {len(data['presenti'])}"])
    writer.writerow(["Nome", "Email", "Ruolo", "Area Lavoro", "Modo Checkin"])
    for p in data["presenti"]:
        writer.writerow([p["nome"], p["email"], p["ruolo"], p["area_lavoro"], p["modalita"]])
    writer.writerow([])
    
    # Giustificati con delega list
    writer.writerow(["ASSENTI GIUSTIFICATI CON DELEGA", f"Totale: {len(data['giustificati_delega'])}"])
    writer.writerow(["Delegante", "Delegato", "Descrizione"])
    for gd in data["giustificati_delega"]:
        writer.writerow([gd["delegante"], gd["delegato"], gd["text"]])
        
    return output.getvalue().encode("utf-8")

def generate_minutes_pdf(db: Session, event_id: int, quorum_pct: float = 0.5) -> bytes:
    """
    Generates a PDF minutes report matching the exact format in the screenshot:
    - Scopo della riunione: event_name
    - Presenti presso la Sala (count): comma-separated (no space)
    - Presenti in chiamata Teams (count): comma-separated (no space)
    - Assenti (count): comma-separated (no space)
    - Presiede la riunione: comma-separated (with space), ends with a dot
    - Annunci: deleghe separated by comma and space, no dot
    """
    event = db.query(models.Evento).filter(models.Evento.id == event_id).first()
    if not event:
        raise ValueError("Event not found")
        
    # Get all active members (stato == "ATTIVO")
    active_soci = db.query(models.Socio).filter(models.Socio.stato == "ATTIVO").all()
    
    # Get presence records for this event
    presences = db.query(models.Presenza).filter(models.Presenza.evento_id == event_id).all()
    
    presenti_sala_names = []
    presenti_teams_names = []
    presiede_names = []
    annunci_list = []
    assenti_names = []
    
    # Track who is present (sala + teams) to compute Assenti
    present_socio_ids = set()
    
    # Group presences
    for p in presences:
        socio = p.socio
        if socio.stato != "ATTIVO":
            continue
            
        if p.modalita == "IN_PRESENZA":
            presenti_sala_names.append(socio.nome)
            present_socio_ids.add(socio.id)
            # Check if area_lavoro is board
            if socio.area_lavoro and "board" in socio.area_lavoro.strip().lower():
                presiede_names.append(socio.nome)
        elif p.modalita == "ONLINE":
            presenti_teams_names.append(socio.nome)
            present_socio_ids.add(socio.id)
            # Check if area_lavoro is board
            if socio.area_lavoro and "board" in socio.area_lavoro.strip().lower():
                presiede_names.append(socio.nome)
        elif p.modalita == "GIUSTIFICATO":
            assenti_names.append(socio.nome)
                
        # Deleghe / Annunci
        if p.modalita == "GIUSTIFICATO" or p.delega_a or p.delegato_id:
            delegante_nome = socio.nome
            delegato_nome = p.delegato.nome if p.delegato else p.delega_a
            if delegato_nome and delegato_nome != "Nessuno":
                annunci_list.append(f"{delegante_nome} delega {delegato_nome}")
                
    # Sort present lists alphabetically by name
    presenti_sala_names.sort()
    presenti_teams_names.sort()
    
    # Assenti: only those who are GIUSTIFICATO
    assenti_names.sort()
    
    # Presiede: sort alphabetically by name
    presiede_names.sort()
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=54, leftMargin=54, topMargin=54, bottomMargin=54)
    
    styles = getSampleStyleSheet()
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        textColor=colors.HexColor('#000000'),
        spaceAfter=20
    )
    
    story = []
    
    # 1. Scopo della riunione
    story.append(Paragraph(f"Scopo della riunione: {event.titolo}", body_style))
    
    # 2. Presenti presso la Sala (comma-separated, no space)
    story.append(Paragraph(f"Presenti presso la Sala ({len(presenti_sala_names)}): {','.join(presenti_sala_names)}", body_style))
    
    # 3. Presenti in chiamata Teams (comma-separated, no space)
    story.append(Paragraph(f"Presenti in chiamata Teams ({len(presenti_teams_names)}): {','.join(presenti_teams_names)}", body_style))
    
    # 4. Assenti (comma-separated, no space)
    story.append(Paragraph(f"Assenti ({len(assenti_names)}): {','.join(assenti_names)}", body_style))
    
    # 5. Presiede la riunione (comma-separated with space, ends with a period)
    presiede_str = f"Presiede la riunione: {', '.join(presiede_names)}." if presiede_names else "Presiede la riunione: ."
    story.append(Paragraph(presiede_str, body_style))
    
    # 6. Annunci (deleges, separated by comma + space, no period at the end)
    annunci_str = f"Annunci: {', '.join(annunci_list)}" if annunci_list else "Annunci:"
    story.append(Paragraph(annunci_str, body_style))
    
    doc.build(story)
    return buffer.getvalue()
