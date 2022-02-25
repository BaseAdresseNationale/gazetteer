# @etalab/gazetteer

Bibliothèque permettant de déterminer le découpage administratif dans lequel se trouve des coordonnées géographiques au format WGS-84.

Données fournies :

| Niveau administratif | Source | Géométrie |
| --- | --- | --- |
| Région | INSEE/COG | dérivée d'ADMIN EXPRESS |
| Département | INSEE/COG | dérivée d'ADMIN EXPRESS |
| EPCI | DGCL | dérivée d'ADMIN EXPRESS |
| Commune | INSEE/COG | dérivée d'ADMIN EXPRESS |
| Communes anciennes | INSEE/COG | OSM |

NB : Les géométries des collectivités d'outremer proviennent d'OSM.

## Pré-requis

- Node.js 16+
- yarn

## Installation des dépendances

```bash
yarn
```

## Production des données

```bash
yarn build
```
