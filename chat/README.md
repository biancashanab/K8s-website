# Sistem de Chat pentru CMS

## Configurație actualizată

Sistemul de chat a fost configurat conform următoarelor cerințe:

1. **Backend**:
   - Implementat folosind WebSocket cu Java și Tomcat
   - Expus pe portul **88**
   - Codul pentru backend se află în directorul `/backend`

2. **Frontend**:
   - Implementat folosind framework-ul Angular (1 replică)
   - Expus pe portul **90**
   - Codul pentru frontend se află în directorul `/frontend`

3. **Baza de date**:
   - Stochează mesajele cu următoarele informații:
     - numele utilizatorului sursă
     - mesajul în format text ASCII
     - timestamp-ul trimiterii mesajului
   - Codul pentru inițializarea bazei de date se află în `/db/init`

4. **Comunicare**:
   - Configurare CORS corectă pentru comunicare între servicii
   - Proxy configurat pentru direcționarea cerințelor WebSocket
   - Sistemul de chat este integrat într-un iframe HTML pentru încorporare în CMS

## Rulare

Pentru a rula sistemul, folosiți comanda:

```bash
docker-compose up -d
```

Accesați aplicația prin:
- **Pagina web a chat-ului**: http://localhost:90
- **Iframe pentru încorporare în CMS**: utilizați fișierul `/frontend/src/chat-iframe.html`

## Note tehnice

- Portul 88 este utilizat pentru backend și WebSocket
- Portul 90 este utilizat pentru frontend
- Comunicarea între client și server se realizează prin WebSocket
- Mesajele din trecut (aflate în baza de date) sunt afișate în ordine cronologică
