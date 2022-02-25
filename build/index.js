#!/usr/bin/env node --max-old-space-size=8192
const Keyv = require('keyv')
const bluebird = require('bluebird')
const got = require('got')
const bbox = require('@turf/bbox').default
const {getCommuneActuelle} = require('../lib/cog')
const {readShapefile} = require('./read-shapefile')

const COMMUNES_URL = 'https://osm13.openstreetmap.fr/~cquest/openfla/export/communes-20190101-shp.zip'
const COMMUNES_ANCIENNES_URL = 'https://osm13.openstreetmap.fr/~cquest/openfla/export/communes-anciennes-20190808-shp.zip'
const ARRONDISSEMENTS_MUNICIPAUX_URL = 'https://osm13.openstreetmap.fr/~cquest/openfla/export/arrondissements-municipaux-20180711-shp.zip'

function downloadFile(url) {
  return got(url).buffer()
}

const PLM = new Set(['75056', '13055', '69123'])
const COMMUNES_ANCIENNES_TYPES = new Set([
  'commune associée',
  'commune déléguée',
  'commune centre',
  'commune fusionnée',
  'ancienne commune',
  'commune associé',
  'ancienne commune déléguée'
])

async function main() {
  const db = new Keyv('sqlite://gazetteer.sqlite')
  await db.clear()
  console.time('chargement des communes')
  const communesFile = await downloadFile(COMMUNES_URL)
  const readCommunesFeatures = await readShapefile(communesFile, 5)
  const communesFeatures = readCommunesFeatures
    .map(f => addType(f, 'commune'))
  console.timeEnd('chargement des communes')

  console.time('chargement des arrondissements municipaux')
  const arrondissementsMunicipauxFile = await downloadFile(ARRONDISSEMENTS_MUNICIPAUX_URL)
  const readArrondissementsMunicipauxFeatures = await readShapefile(arrondissementsMunicipauxFile, 5)
  const arrondissementsMunicipauxFeatures = readArrondissementsMunicipauxFeatures
    .map(f => addType(f, 'arrondissement-municipal'))
  console.timeEnd('chargement des arrondissements municipaux')

  console.time('chargement des communes anciennes')
  const communesAnciennesFile = await downloadFile(COMMUNES_ANCIENNES_URL)
  const communesAnciennesFeatures = await readShapefile(communesAnciennesFile, 5)
  console.timeEnd('chargement des communes anciennes')

  const features = [
    ...communesFeatures.filter(c => !PLM.has(c.properties.insee)),
    ...arrondissementsMunicipauxFeatures
  ]

  for (const f of communesAnciennesFeatures) {
    if (!f.properties.ref_INSEE || !getCommuneActuelle(f.properties.ref_INSEE)) {
      console.log(`Commune actuelle introuvable pour le code INSEE ${f.properties.ref_INSEE}`)
      continue
    }

    if (COMMUNES_ANCIENNES_TYPES.has(f.properties.admin_type)) {
      features.push({
        type: 'Feature',
        geometry: f.geometry,
        properties: {
          nom: f.properties.name,
          insee: f.properties.ref_INSEE,
          type: 'commune-ancienne'
        }
      })
    }
  }

  const items = []

  console.time('sauvegarde')
  await bluebird.each(features, async f => {
    const i = items.length
    const id = `item_${i}`
    await db.set(id, {
      nom: f.properties.nom,
      code: f.properties.insee,
      type: f.properties.type,
      contour: f.geometry
    })
    items.push({id, bbox: bbox(f)})
  })
  await db.set('items', items)
  console.timeEnd('sauvegarde')
}

function addType(f, type) {
  f.properties.type = type
  return f
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
