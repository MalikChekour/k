# Monétisation et commandes : architecture et verrous

## Abonnement Pro (RevenueCat)
- L'app utilise le SDK RevenueCat pour l'achat et la lecture du droit « pro ». Le serveur ne sert que de copie : `POST /revenuecat`
  (en-tête `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`), idempotent par `event.id`.
- **La sécurité (alertes d'interaction) reste gratuite.** Le Pro débloque le confort (plus de plantes, profils familiaux), jamais l'accès à une alerte.
- Prix cibles à reconfirmer : 4,99 €/mois, 39,99 €/an. Commission des stores : 15 % (programme petites entreprises) ou 30 %.

## Commande de mélange (désactivée par construction)
- `POST /orders` accepte **uniquement** `{ lines: [{ plantId, grams }] }`. Tout autre champ (profil, symptôme, médicament) est **refusé**, pas ignoré.
- `data/sale_policy.json` → `verified_plants` est **vide** : toute commande est refusée (`422`) tant qu'un juriste ou le pharmacien partenaire n'a pas
  validé le statut de vente de chaque plante (plantes médicinales libres, décret 2008-841, ou préparation par officine).
- Le bon de préparation (`GET /prep/<code>`, jeton artisan) ne contient aucune donnée de santé. L'artisan doit être une officine ou un professionnel habilité.

## Données de santé
Le profil (grossesse, allergies, traitements) **reste sur le téléphone**. Le serveur n'en reçoit jamais : pas d'hébergement HDS requis à ce stade.

## Avant tout déploiement
1. Avis juridique : dispositif médical (MDR, règle 11) si l'app personnalise des alertes selon le profil ; monopole pharmaceutique ; allégations de santé.
2. Relecture professionnelle des affirmations (statut `publie`).
3. `wrangler d1 create`, schéma, 3 secrets. Aucun secret n'est dans le dépôt.
