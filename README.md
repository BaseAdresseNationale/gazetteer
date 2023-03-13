# @ban-team/gazetteer

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

## Utilisation

⚠️ Le chemin d’accès aux données doit être renseigné, soit via le paramètre `dbPath`, soit via la variable d’environnement `GAZETTEER_DB_PATH`.

```js
const {createGazetteer} = require('@ban-team/gazetteer')

const g = await createGazetteer(options)
await g.find({lon: 5.9225, lat: 49.2741})
>

{
  communeAncienne: { nom: 'Mance', code: '54341' },
  commune: { nom: 'Val de Briey', code: '54099' },
  epci: { nom: 'CC Orne Lorraine Confluences', code: '200070845' },
  arrondissement: { nom: 'Briey', code: '541' },
  departement: { nom: 'Meurthe-et-Moselle', code: '54' },
  region: { nom: 'Grand Est', code: '44' }
}

await g.find({lon: 0, lat: 0})
>

null
```

## Production des données

On clone le dépôt puis on installe les dépendances.

```bash
yarn
```

On lance la commande dédiée à la production des données.

```bash
yarn build
```

Le fichier résultant `gazetteer.sqlite` servira ensuite à utiliser la bibliothèque en elle-même.

## Licence

MIT
