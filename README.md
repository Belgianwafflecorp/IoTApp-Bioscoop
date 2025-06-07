# Absolute Cinema 

Een complete bioscoopbeheer applicatie met moderne technologieën voor ticketreservering, film- en zaalbeheer.

**Teamleden**:
1. Domien Verstraete
2. Niels Denoo
3. Olivier Westerman

## 📋 Inhoudsopgave

- [Features](#-features)
- [Tech Stack](#-tech-stack)  
- [Snelstart](#-snelstart)
- [Architectuur](#-architectuur)
- [API Documentatie](#-api-documentatie)
- [Frontend Functionaliteiten](#-frontend-functionaliteiten)
- [Backend Overzicht](#-backend-overzicht)
- [Deployment](#-deployment)
- [Bijdragen](#-bijdragen)

## Demo video

In dezelfde root folder als deze Readme is een mp4 bestand toegevoegd die een demo geeft van de flow die een gewone gebruiker zou kunnen doorlopen op deze website.

##  Features

- **Real-time zitplaatsreservering** met WebSocket ondersteuning
- **Complete bioscoopbeheer** voor managers
- **TMDB integratie** voor filmgegevens
- **Automatische e-mailbevestiging** met QR-codes
- **Responsive design** voor alle apparaten
- **Live voorstellingsplanner** met Gantt-diagram
- **JWT authenticatie** en rolbeheer

##  Stack

### Frontend
- **React.js** - UI framework
- **WebSockets** - Real-time updates
- **Responsive CSS** - Mobile-first design

### Backend  
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **JWT** - Authenticatie
- **WebSockets** - Real-time communicatie
- **Nodemailer** - E-mail service

### Database
- **MySQL** - Relationele database
- **Docker** - Containerisatie

### Externe Services
- **TMDB API** - Filmgegevens
- **Mailtrap** - E-mail testing

## Quick Start

### Vereisten
- Docker & Docker Compose
- Node.js 16+ (voor lokale ontwikkeling)

### Installatie

1. **Clone het repository**
   ```bash
   git clone <repository-url>
   cd absolute-cinema
   ```

2. **Configureer environment variabelen**
   ```bash
   # Root environment
   mv .env.voorbeeld .env
   
   # API environment  
   mv ./API/.env.voorbeeld ./API/.env
   ```

3. **Start de applicatie**
   ```bash
   docker-compose up --build
   ```

4. **Toegang tot de applicatie**
   - Frontend: `http://localhost:5000`
   - API Documentatie: `http://localhost:3000/docs`
   - Database: `localhost:3306`

### Standaard Accounts

**Manager Account:**
- Gebruiker: `manager`
- Wachtwoord: `adminadmin`

## 🏗 Architectuur

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (MySQL)       │
│   Port: 3001    │    │   Port: 3000    │    │   Port: 3306    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
              WebSocket
```

## API Documentatie

Volledige API documentatie is beschikbaar via Swagger UI op:
- **URL:** `http://localhost:3000/docs`
- **Format:** OpenAPI 3.0

### Belangrijkste Endpoints

| Methode | Endpoint | Beschrijving | Authenticatie |
|---------|----------|--------------|---------------|
| GET | `/api/movies` | Lijst van beschikbare films (TMDB data) | Nee |
| GET | `/api/movies/:id` | Detailinformatie van 1 film | Nee |
| GET | `/api/screenings` | Geplande voorstellingen | Nee |
| POST | `/api/screenings` | Nieuwe voorstelling aanmaken | Manager |
| PUT | `/api/screenings/:id` | Voorstelling aanpassen | Manager |
| DELETE | `/api/screenings/:id` | Voorstelling verwijderen | Manager |
| POST | `/api/reserve` | Ticket reserveren | Gebruiker |
| GET | `/api/screenings/:id/tickets` | Beschikbare tickets ophalen | Nee |
| POST | `/api/register` | Nieuwe gebruiker registreren | Nee |
| POST | `/api/login` | Gebruiker inloggen | Nee |
| GET | `/api/me` | JWT-profielinformatie ophalen | Gebruiker |
| GET | `/api/users` | Gebruikersbeheer overzicht | Manager |

## Frontend Functionaliteiten

### Homepage
- **Filmoverzicht:** Kaarten met filmposters en basisinfo
- **Filter & Sorteer:** Op titel, genre, en beoordeling
- **Filmdetails:** Uitgebreide info met embedded trailers
- **Navigatie:** Logo fungeert als home-knop

### Voorstellingspagina  
- **Voorstellingsoverzicht:** Georganiseerd per film en datum
- **Zaalinfo:** Duidelijke weergave van beschikbare zalen
- **Snelle booking:** Directe navigatie naar reserveringspagina

### Reserveringspagina
- **Live zitplekken:** Real-time beschikbaarheid via WebSockets
- **Interactieve stoelkeuze:** Visuele zaal layout
- **Automatische toewijzing:** Optie voor snelle ticket selectie
- **E-mail bevestiging:** Met QR-code voor ticket validatie

#### QR-Code Format
```json
{
  "reservation_id": 2,
  "username": "olivier", 
  "movie": "Inception",
  "datetime": "5/5/2025, 6:00:00PM",
  "hall": "Main Hall A",
  "seats": ["B1", "B2"]
}
```

###  Manager Dashboard

#### Gebruikersbeheer
- Bekijk en zoek alle gebruikers
- Rol management (gebruiker ↔ manager)
- Reserveringsgeschiedenis per gebruiker
- Gebruikers verwijderen

#### Filmbeheer  
- **TMDB Integratie:** Zoek en voeg films toe via titel
- **Film editing:** Pas filmdetails aan
- **Sorteren & Filteren:** Op naam, duur, genre
- **Film verwijdering:** Veilig verwijderen uit database

#### Voorstellingsbeheer
- **Gantt Diagram:** Visuele voorstellingsplanner
- **Conflict detectie:** Voorkomt overlappende voorstellingen
- **Bulk operaties:** Meerdere voorstellingen tegelijk beheren
- **Dynamische validatie:** Real-time schema controle

## Backend Overzicht

### Database Setup
Bij het starten van de containers worden automatisch uitgevoerd:
- **Schema initialisatie** volgens ERD-ontwerp
- **Dummy data** voor development en testing
- **Gebruikersaccounts** met verschillende rollen
- **SQL gebruiker** met beperkte rechten

### API Controllers
- `HallController` - Zaalbeheer
- `ManagerController` - Manager functionaliteiten  
- `MovieController` - Filmbeheer
- `ReservationController` - Reserveringssysteem
- `ScreeningController` - Voorstellingsbeheer
- `UserController` - Gebruikersbeheer

#### ERD Diagramma van de database:
![image](https://github.com/user-attachments/assets/f21a0d32-6e67-41e2-9100-6a72127a13e6)


### Middleware Stack
- **Authenticatie:** JWT token validatie
- **Validatie:** Input sanitization en validatie
- **E-mail:** Automatische bevestigingsmails
- **WebSockets:** Real-time updates
- **CORS:** Cross-origin resource sharing
- **Logging:** Request/response logging

## 🐳 Deployment

### Docker Compose Services

```yaml
services:
  api:        # Backend API (Port 3000)
  db:         # MySQL Database (Port 3306)  
  front:      # React Frontend (Port 5000)
```

### Environment Configuratie

#### Root `.env`
```env
DB_HOST=db
DB_ROOT_PASSWORD=root
DB_DATABASE=cinema
DB_USER=webuser
DB_PASSWORD=webuserPass
API_HOST=3000
FRONT_HOST=5000
JWT_SECRET_KEY=voorbeeld
TMDB_API_KEY=8542cca9bc9909421cae0ac38b504a19
TMDB_FULL_KEY=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4NTQyY2NhOWJjOTkwOTQyMWNhZTBhYzM4YjUwNGExOSIsIm5iZiI6MTc0Njc4NzAzNS42NDIsInN1YiI6IjY4MWRkYWRiYjk1NWFmNDE3MjYzYmNhYiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.e7tZIY0tfmNR4U9gf7OUqI_ECN8TWhIyKQnYTjg11JA
MAILTRAP_USER=b3e13b5eb74b2d
MAILTRAP_PASS=1e3d9e7e06ee0f
```

### Production Deployment

1. **Beveiliging**
   - Wijzig standaard wachtwoorden
   - Gebruik sterke JWT secrets
   - Configureer HTTPS
   - Implementeer rate limiting

2. **Monitoring**
   - Database backup strategie
   - Application logging
   - Performance monitoring
   - Health checks

3. **Scaling**
   - Load balancer configuratie
   - Database replicatie
   - CDN voor static assets

## Bijdragen

1. Fork het project
2. Maak een feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit je wijzigingen (`git commit -m 'Add some AmazingFeature'`)
4. Push naar de branch (`git push origin feature/AmazingFeature`)
5. Open een Pull Request

### Development Guidelines
- Volg de bestaande code style
- Schrijf unit tests voor nieuwe features
- Update documentatie waar nodig
- Test je wijzigingen in Docker omgeving

## Licentie

Dit project is gelicenseerd onder de MIT License - zie het [LICENSE](LICENSE) bestand voor details.

## Support

Voor vragen of problemen:
- Open een [GitHub Issue](../../issues)
- Contacteer het development team

---

**Gemaakt door het Absolute Cinema team**
