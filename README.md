# Ordnaro-Umfrage (GitHub Pages)

Statische Seite für die Ordnaro-Umfrage (EN/DE). Kein Backend, keine Cookies, keine Tracker,
keine externen Skripte, Schriften oder CDNs. Beim Absenden geht genau eine POST-Anfrage an das
veröffentlichte Google-Formular (`docs.google.com/forms/.../formResponse`); die Antworten landen im
bestehenden Google-Sheet.

Erzeugt mit `python3 site-v3/build.py --umfrage` im Ordner `ordnaro/` (nicht hier von Hand ändern).

## Links für die Mails

- EN: `https://edwinkraus.github.io/ordnaro-umfrage/?c=CODE`
- DE: `https://edwinkraus.github.io/ordnaro-umfrage/?c=CODE&lang=de`

Ohne `lang` entscheidet die Browsersprache (Deutsch → DE, sonst EN). Ohne `c` geht die Umfrage auch.

## Später: eigene Domain anschließen (ohne Umbau)

Alle Links sind relativ, die Seite läuft unter `/ordnaro-umfrage/` genauso wie unter einer eigenen Domain.

Empfohlen ist eine Subdomain, damit `ordnaro.com` selbst frei für die Website bleibt, z. B. `umfrage.ordnaro.com`:

1. Bei GitHub: Profil → Settings → Pages → „Add a domain“ → `ordnaro.com` verifizieren (TXT-Eintrag beim
   DNS-Anbieter). Das verhindert, dass jemand anderes die Domain bei GitHub übernimmt.
2. Beim DNS-Anbieter: `CNAME  umfrage  →  edwinkraus.github.io`
3. Im Repository: Settings → Pages → Custom domain → `umfrage.ordnaro.com` eintragen, speichern
   (GitHub legt dabei die Datei `CNAME` an). Wenn das Zertifikat da ist: „Enforce HTTPS“ anhaken.
4. In den Mails die neue Adresse verwenden: `https://umfrage.ordnaro.com/?c=CODE`.

Soll die Umfrage direkt unter `ordnaro.com` laufen (Apex-Domain), statt Schritt 2 diese Einträge setzen:
`A @ 185.199.108.153`, `A @ 185.199.109.153`, `A @ 185.199.110.153`, `A @ 185.199.111.153`
(und optional `AAAA @ 2606:50c0:8000::153` … `2606:50c0:8003::153`), dazu `CNAME www → edwinkraus.github.io`.
Werte vorher in der GitHub-Doku „Managing a custom domain for your GitHub Pages site“ gegenprüfen.

Mit eigener Domain gilt auch `robots.txt` (sperrt alles). Unter `github.io/ordnaro-umfrage/` schützt
`<meta name="robots" content="noindex">` auf jeder Seite.

