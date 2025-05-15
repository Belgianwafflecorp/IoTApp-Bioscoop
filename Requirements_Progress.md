## Doelstelling

- [ ] Ontwerp en bouw een uitbreidbare hybride applicatie voor een bioscoop die:
  - [ ] Filmdata ophaalt via **The Movie Database (TMDB)** API
  - [ ] Voorstellingen beheert via een **Node.js backend**
  - [ ] Tickets real-time bijwerkt met **WebSocket** (of MQTT als uitbreiding)
  - [x] Gebruikersbeheer bevat via **JWT-authenticatie** met sessiebehoud
  - [ ] Een **front-end gebruikersinterface en managerinterface** bevat
  - [ ] Een duidelijke, **gedocumenteerde Open API** aanbiedt (via Swagger)
  - [ ] Optioneel: Docker & hosting (bv. Azure of Railway)

---

## Situering

- [ ] Prototype van een bioscoopsysteem waarin gebruikers films kunnen bekijken en tickets reserveren
- [ ] Managers kunnen via beveiligde login films inplannen en bewerken
- [ ] **Beschikbaarheid wordt real-time gesynchroniseerd**
- [ ] Gebruikers loggen in als **'user'** of **'manager'**
- [ ] Applicatie gedraagt zich anders op basis van toegekende **rol**
- [ ] JWT wordt gebruikt om sessie te onthouden

---

## Beheerdersinterface (Manager)

### Vereisten
- [ ] Toegankelijk na **inloggen via `/login`** als `manager`
- [ ] JWT wordt lokaal opgeslagen (bv. `localStorage`) en bij elke request meegestuurd
- [ ] **Beveiligd gebied binnen dezelfde webapp** (zelfde URL/adres, geen subsite)
- [ ] Front-end detecteert via JWT payload of gebruiker een `manager` is
- [ ] Alleen managers kunnen:
  - [ ] Voorstellingen aanmaken, wijzigen, verwijderen
  - [ ] Filmgegevens aanvullen of corrigeren
  - [ ] Aantal tickets instellen voor een voorstelling

### UI-suggestie
- [ ] Beheerdersknop zichtbaar na login
- [ ] Toegang tot een "dashboard" met overzicht van voorstellingen
- [ ] Formulieren voor aanpassen/bewerken van films en planningen

---

## Functionaliteiten

### Gebruiker
- [ ] Raadpleegt films + details
- [ ] Ziet planning met ticketstatus
- [ ] Reserveert tickets (JWT vereist)
- [ ] Real-time updates via WebSocket

### Manager
- [ ] Logt in via `/login` (met `manager` credentials)
- [ ] JWT bevat rol-informatie (`role: 'manager'`)
- [ ] Kan filmvoorstellingen toevoegen of bewerken
- [ ] Ziet wie wat heeft gereserveerd (optioneel)

---

## Technische Specificaties

### Backend
- [ ] Node.js + Express
- [ ] REST API
- [ ] JSON Web Tokens (JWT) voor authenticatie en rolbeheer
- [ ] WebSocket (via `ws`) of MQTT (optioneel)
- [ ] Data in JSON-bestand of in-memory (MongoDB optioneel)
- [ ] Swagger-documentatie op `/api-docs`

### Front-end
- [ ] HTML + CSS + vanilla JavaScript
- [ ] Fetch-requests met JWT in headers
- [ ] Login-UI + detectie op basis van `role`
- [ ] Condities in UI afhankelijk van rol

---

## API-overzicht

| Methode | Endpoint                      | Omschrijving                              | Auth     |
|---------|-------------------------------|-------------------------------------------|----------|
| [x] GET     | `/movies`                     | Lijst van beschikbare films (TMDB data)   | Nee      |
| [x] GET     | `/movies/:id`                 | Detailinformatie van 1 film               | Nee      |
| [x] GET     | `/screenings`                 | Geplande voorstellingen                   | Nee      |
| [x] POST    | `/screenings`                 | Nieuwe voorstelling aanmaken              | Manager  |
| [x] PUT     | `/screenings/:id`             | Voorstelling aanpassen                    | Manager  |
| [x] DELETE  | `/screenings/:id`             | Voorstelling verwijderen                  | Manager  |
| [ ] POST    | `/reserve`                    | Ticket reserveren                         | Gebruiker|
| [ ] GET     | `/screenings/:id/tickets`     | Beschikbare tickets ophalen               | Nee      |
| [x] POST    | `/register` / `/login`        | Registratie / Login                       | Nee      |
| [x] GET     | `/me`                         | JWT-profielinformatie ophalen             | Ja       |


---

## Aanpak in fasen

### Fase 1: TMDB API-integratie
- [ ] TMDB-key aanvragen
- [ ] Endpoint + fetch voor basis filmdata
- [ ] UI-overzicht met filmkaarten of lijst

### Fase 2: Voorstellingen aanmaken/beheren
- [ ] JSON-structuur voor voorstellingen
- [ ] CRUD-endpoints voor screenings (manager only)
- [ ] Manager-dashboard op zelfde site (conditie op rol)

### Fase 3: Auth en sessiebeheer met JWT
- [ ] Gebruikers & managers kunnen inloggen
- [ ] JWT gebruiken als session token (in headers)
- [ ] Rolgebaseerde toegang tot routes en UI

### Fase 4: Ticketreservering met validatie
- [ ] POST `/reserve` met voorstelling-ID
- [ ] Aantal tickets verminderen bij reservatie
- [ ] JWT vereist → gebruikers kunnen enkel 1 ticket boeken

### Fase 5: Real-time communicatie
- [ ] WebSocket-server met `ws`
- [ ] Klanten krijgen updates als tickets veranderen
- [ ] UI toont resterende tickets live

### Fase 6: Swagger-documentatie
- [ ] Documenteer alle routes met `swagger-jsdoc`
- [ ] Toegankelijk op `/api-docs`

### (Optioneel) Fase 7: Docker & hosting
- [ ] Dockerfile voor Node-backend
- [ ] Hosting via gratis platform naar keuze (bv. Railway, Azure)

---

## Wat lever je in?

- [ ] Volledige codebase met `README.md`
- [ ] Werkende front- en back-end
- [ ] JWT-auth en Swagger-documentatie
- [ ] Publieke of gedeelde GitHub-repository
- [ ] (Optioneel) Dockerfile + online demo

---

## Mogelijke uitbreidingen

- [ ] Filters op filmgenre of datum
- [ ] Meerdere zalen per bioscoop
- [ ] Rolgebaseerde toegang met middleware
- [ ] QR-code voor ticket
- [ ] E-mail met bevestiging (bv. Mailtrap)
- [ ] MQTT in plaats van WebSocket
- [ ] Grafiek met verkochte tickets (bv. via Chart.js)
- [ ] Hosting op Azure (gratis studentenpakket)

---

## Ondersteuning

- [ ] Gebruik GitHub voor versiebeheer
- [ ] Overleg tijdig bij problemen

**Veel succes met de ontwikkeling!**
