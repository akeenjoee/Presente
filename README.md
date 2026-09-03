# Presente! - JEMORE Attendance Management System

Presente! è la piattaforma  progettata e sviluppata per la gestione delle presenze agli eventi associativi (Assemblee, Formazioni, Area Meeting, etc.), integrando i sistemi di autenticazione Microsoft 365 e automatizzando le procedure burocratiche.

---

## 📑 Table of Contents
1. [Project Overview & Features](#1-project-overview--features)
2. [Project Directory Structure](#2-project-directory-structure)
3. [Database Architecture & ER Diagram](#3-database-architecture--er-diagram)
4. [System Architecture & Workflows](#4-system-architecture--workflows)
5. [Authentication & Environment Configuration](#5-authentication--environment-configuration)
6. [Local Setup & Quickstart Guide](#6-local-setup--quickstart-guide)

---

## 1. Project Overview & Features

Presente! risolve le inefficienze legate al monitoraggio delle presenze attraverso un approccio ibrido che copre ogni possibile modalità di partecipazione, garantendo validità formale ai fini statutari.

### 🌟 Key Features:
* **Hybrid Check-in Support**: 
  * Sistema di check-in in presenza tramite **Dynamic QR Code** crittografato (anti-tampering) via dashboard.
* **Pre-Assembly Form Import**: Importazione massiva dei dati provenienti dai moduli Forms pre-assemblea. Il sistema riconosce e traccia automaticamente le **Deleghe** e le **Assenze Giustificate** preventivamente, aggiornando lo stato dei soci senza intervento manuale.
* **Global Absence Streak & Alert Engine**: Motore analitico che calcola in tempo reale il rischio di decadimento in conformità allo statuto.
  * **🔴 Critica (Red Alert)**: $\ge 2$ assenze *consecutive* in Assemblea.
  * **🟡 Alert (Yellow Alert)**: $\ge 1$ assenza in Assemblea (non consecutiva).
* **Role-Based Access Control (RBAC)**: Integrazione profonda con Azure Active Directory.
  * Check-in accessibile a chiunque possegga un account `@jemore.it`.
  * Dashboard Admin rigorosamente riservata ai membri del Board e Responsabili.
* **One-Click Minutes Export**: Esportazione istantanea in **PDF** e **CSV** del registro presenze ufficiale, formattato per i Verbali d'Assemblea.


---

## 2. Project Directory Structure

Il progetto segue un'architettura moderna disaccoppiata (Frontend in React/Next.js e Backend in Python/FastAPI), comunicando tramite API REST e Server-Sent Events (SSE).

```text
Presente!/
├── backend/                  # Python FastAPI Backend
│   ├── main.py               # Application entrypoint e definizione delle rotte API (REST & SSE).
│   ├── models.py             # Definizione dei modelli SQLAlchemy (Schema Database).
│   ├── database.py           # Connessione e configurazione del database SQLite.
│   ├── auth.py               # Logica di decodifica token JWKS (Azure) e generazione HMAC per QR Code.
│   ├── ms_graph.py           # Integrazione Microsoft Graph API per esportazione e gestione file su OneDrive/SharePoint.
│   ├── services.py           # Logica di business (Analytics, Import CSV, Streak Engine, Workflow Assemblee).
│   └── teams_parser.py       # Algoritmi per il parsing e calcolo dei log di Microsoft Teams.
│
└── frontend/                 # Next.js Frontend (App Router)
    ├── src/
    │   ├── app/              # Rotte e Pagine (es. /dashboard, /analytics, /checkin).
    │   │   └── events/       # Rotte dinamiche per la gestione degli eventi e dei moduli di delega ([eventId]/partecipazione).
    │   ├── components/       # Componenti UI riutilizzabili (es. LiveRosterTable, Atoms, QrProjector, Navbar).
    │   ├── middleware.ts     # Protezione delle rotte (NextAuth) basata su RBAC per Board/Responsabili.
    │   └── lib/              # Utility frontend (configurazione tailwind, API fetchers).
    ├── public/               # Asset statici (immagini, logo, file CSV di test).
    └── tailwind.config.ts    # Configurazione del design system (Colori, Dark Mode).
```

---

## 3. Database Architecture & ER Diagram

Il database è ospitato su **PostgreSQL** in ambiente di produzione. Il sistema è progettato per garantire integrità referenziale, tracciando con precisione chi partecipa, come partecipa e chi eventualmente delega.
Inoltre è presente uno script di sincronizzazione (`postgres_sync.py`) che si occupa di popolare l'organigramma e mantenere aggiornati i ruoli leggendo da una sorgente dati remota pre-esistente.

```mermaid
erDiagram
    SOCI ||--o{ PRESENZE : registra
    EVENTI ||--o{ PRESENZE : contiene
    EVENTI ||--o{ UNMATCHED_LOGS : ha

    SOCI {
        int id PK
        string nome
        string email
        string ruolo
        string area_lavoro
        string stato
    }

    EVENTI {
        int id PK
        string titolo
        string tipo
        string modalita
        datetime data_ora
        boolean is_attivo
    }

    PRESENZE {
        int id PK
        int evento_id FK
        int socio_id FK
        string modalita
        string stato_presenza
        string delega_a
        int durata_minuti
        datetime registrato_il
    }

    UNMATCHED_LOGS {
        int id PK
        int evento_id FK
        string email
        string nome_rilevato
        int durata_minuti
    }
```

> **Note - Il calcolo delle Streak**: Lo stato di rischio (Alert/Critica) non è salvato come dato statico nel DB, ma viene calcolato dinamicamente on-the-fly (`services.py`) tramite _Common Table Expressions (CTE)_ e le funzioni Window di SQL (`ROW_NUMBER()`). Questo garantisce che l'aggiunta ritardata di una giustificazione aggiorni retroattivamente e automaticamente lo stato del socio.

---

## 4. Authentication & Environment Configuration

Il progetto demanda l'intero ciclo vitale dell'identità a **Microsoft Entra ID (Azure AD)** tramite NextAuth.js. Il backend si occupa esclusivamente di validare le firme crittografiche JWT rilasciate da Microsoft.

### `.env.example` (Backend)
Posizionato in `backend/.env`.
```env
# Modalità Sviluppo (True ignora la firma JWT per facilitare i test)
DEV_MODE=True

# Credenziali Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/dbname

# Sicurezza (Generazione HMAC QR Code)
QR_SECRET_KEY=la-tua-chiave-segreta-molto-complessa-321

# Integrazione Microsoft Graph API (OneDrive/SharePoint)
MS_CLIENT_ID=il-tuo-client-id-microsoft
MS_CLIENT_SECRET=il-tuo-client-secret-microsoft
MS_TENANT_ID=il-tuo-tenant-id-microsoft
MS_DRIVE_ID=il-tuo-drive-id-sharepoint-o-onedrive
```

### `.env.local` (Frontend)
Posizionato in `frontend/.env.local`.
```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=la-tua-secret-next-auth (generata con openssl rand -base64 32)

# Azure AD Configuration
AZURE_AD_CLIENT_ID=il-tuo-client-id-microsoft
AZURE_AD_CLIENT_SECRET=il-tuo-client-secret-microsoft
AZURE_AD_TENANT_ID=il-tuo-tenant-id-microsoft
```

---

## 6. Local Setup & Quickstart Guide

Segui questi passaggi per lanciare l'ambiente di sviluppo in locale senza l'utilizzo di Docker.

### 1. Avviare il Backend (Python / FastAPI)
Apri un terminale e naviga nella cartella `backend/`:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Su Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
Il backend sarà in ascolto su `http://localhost:8000`. Puoi esplorare la documentazione interattiva Swagger recandoti all'indirizzo `http://localhost:8000/docs`.

### 2. Avviare il Frontend (Next.js)
Apri un nuovo terminale e naviga nella cartella `frontend/`:
```bash
cd frontend
npm install
npm run dev
```
### 3. Inizializzare il Database (Seed Soci)
Prima di utilizzare la dashboard, devi popolare il database con l'organigramma attuale:
1. Assicurati che il backend sia in esecuzione.
2. Carica il file csv con l'organigramma completo dei soci da "Dashboard" → "Analisi Membri" → "Importa Soci da CSV".

Il frontend sarà accessibile all'indirizzo `http://localhost:3000`. 
Effettua l'accesso con un account autorizzato (`@jemore.it` avente ruolo/area compatibile col Board o Responsabili) per visualizzare l'interfaccia di amministrazione.

---

## 7. Guida all'Uso (Step-by-Step Workflow)

Questa guida illustra il flusso di lavoro tipico per un amministratore (Board / Responsabili) che deve utilizzare la piattaforma per gestire un nuovo evento.

### Step 1: Accesso alla Piattaforma
1. Apri la pagina principale dell'applicazione.
2. Clicca su **"Accedi con Microsoft"**. Verrà richiesto il login tramite l'account aziendale `@jemore.it`.
3. Il sistema riconoscerà automaticamente il tuo ruolo in base all'email. Se hai i permessi di amministrazione, verrai reindirizzato all'**Archivio Eventi** (la dashboard principale).

### Step 2: Creazione di un Nuovo Evento
1. Dalla schermata Home, clicca sul pulsante blu **"Nuovo Evento"**.
2. Compila il modulo a comparsa:
   - **Titolo Evento**: es. "Assemblea Ordinaria Marzo".
   - **Tipologia**: Scegli tra "ASSEMBLEA", "FORMAZIONE" o "TEAM_BUILDING". Le assemblee godono di funzionalità aggiuntive (come le deleghe).
   - **Modalità**: "Ibrida", "In Presenza" o "Online".
3. Clicca "Crea Evento". Verrai trasportato automaticamente nella pagina di gestione (Dashboard) di quel singolo evento.
   

### Step 3: Gestione Pre-Assemblea (Raccolta Deleghe)
Questa fase riguarda la preparazione prima dell'evento, utile soprattutto per le Assemblee.
1. Dalla schermata del tuo evento, cliccando sul bottone **Crea Link(Form)**, i soci possono accedere al link per la **Partecipazione / Delega**.
2. Il socio compila il modulo (indicando se partecipa o se intende delegare un collega). In caso di delega, il socio caricherà il PDF firmato.
3. I dati inseriti si aggiorneranno in tempo reale sulla **Live Roster Table** del tuo evento e verranno scritti automaticamente anche nell'**Excel condiviso su OneDrive**. 
4. Nella tabella admin vedrai una colonna **"Iscrizione"** (es. `29/08, 14:30`) che certifica il momento esatto dell'ultima interazione del socio con il form.

### Step 4: Il Giorno dell'Evento (Fase di Check-In)
1. **Per prendere le presenze in presenza o evento ibrido**:
   - Dalla dashboard dell'evento, clicca su **"Proietta QR Code"**.
   - Mostra il QR Code sullo schermo della sala o manda il link in chat. I soci scannerizzeranno il QR o copieranno il link ed incollarlo nel browser per segnare la loro presenza. 
2. **Per eventi solamente online (Microsoft Teams)**:
   - A fine evento, scarica il CSV standard dei log di Microsoft Teams.
   - Nella dashboard dell'evento su Presente!, clicca su **"Importa Presenze (Teams)"** e carica il file. Il sistema capirà automaticamente chi c'era e calcolerà il tempo di permanenza netto.
3. **Check-in Manuale / Correzioni**:
   - Qualcuno si è dimenticato di scannerizzare il QR Code? Utilizza la colonna **Azioni Rapide** nella tabella per segnare manualmente lo stato (`In Presenza` o `Online`) con un clic.

### Step 5: Esportazione Verbali e Monitoraggio Analytics
1. **Esportazione del Registro**:
   - A fine evento, sempre dalla dashboard, clicca su **"Esporta Verbale"**.
   - Scegli tra **CSV** o **PDF**. Il sistema genererà un documento con la lista di tutti i presenti, divisi per categoria e ruolo, perfetto da allegare ai verbali ufficiali.
2. **Controllo del Rischio Decadimento (Streaks)**:
   - Vai alla pagina globale **"Analisi Membri"** (raggiungibile dal menu di navigazione in alto).
   - In questa pagina, il Motore Analitico globale calcola gli "strike" storici dei membri per identificare chi rischia il decadimento ai sensi dello Statuto.
   - Vedrai delle KPI Card rosse/gialle e la tabella mostrerà i flag **"Alert"** (un'assenza ingiustificata) o **"Critica"** (due assenze consecutive in assemblea).
