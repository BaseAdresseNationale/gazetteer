#!/usr/bin/env node --max-old-space-size=8192
const zlib = require('zlib')
const {promisify} = require('util')
const {chain, keyBy} = require('lodash')
const Keyv = require('keyv')
const got = require('got')
const bbox = require('@turf/bbox').default
const intersect = require('@turf/intersect').default
const {getCommuneActuelle, getCommune} = require('../lib/cog')
const {readShapefile} = require('./read-shapefile')

const gunzip = promisify(zlib.gunzip)

const COMMUNES_URL = 'http://etalab-datasets.geo.data.gouv.fr/contours-administratifs/2024/geojson/communes-5m.geojson.gz'
const COMMUNES_ANCIENNES_URL = 'https://osm13.openstreetmap.fr/~cquest/openfla/export/communes-anciennes-20230101-shp.zip'

function downloadFile(url) {
  return got(url).buffer()
}

async function downloadGeoJsonGzAsFeatures(url) {
  const gzippedData = await got(url).buffer()
  const gunzippedData = await gunzip(gzippedData)
  return JSON.parse(gunzippedData).features
}

const PLM = new Set(['75056', '13055', '69123'])
const COMMUNES_ANCIENNES_TYPES = new Set([
  'commune associée',
  'commune déléguée',
  'commune centre',
  'commune fusionnée',
  'ancienne commune',
  'commune associé',
  'ancienne commune déléguée',
  'commune chef-lieu d\'une association'
])

async function main() {
  const db = new Keyv('sqlite://gazetteer.sqlite')
  await db.clear()
  console.time('chargement des communes')
  const readCommunesFeatures = await downloadGeoJsonGzAsFeatures(COMMUNES_URL)
  console.timeEnd('chargement des communes')

  const communesFeatures = readCommunesFeatures
    .filter(f => !PLM.has(f.properties.code))
    .map(f => getCommune(f.properties.code).commune ? addType(f, 'arrondissement-municipal') : addType(f, 'commune'))

  const communesFeaturesIndex = keyBy(communesFeatures, f => f.properties.code)

  console.time('chargement des communes anciennes')
  const communesAnciennesFile = await downloadFile(COMMUNES_ANCIENNES_URL)
  const readCommunesAnciennesFeatures = await readShapefile(communesAnciennesFile, 5)
  console.timeEnd('chargement des communes anciennes')

  const communesAnciennesFeatures = []

  for (const f of readCommunesAnciennesFeatures) {
    const codeCommuneAncienne = f.properties.insee

    if (!codeCommuneAncienne || !getCommuneActuelle(codeCommuneAncienne)) {
      console.log(`Commune actuelle introuvable pour le code INSEE ${f.properties.insee}`)
      continue
    }

    const codeCommuneActuelle = getCommuneActuelle(codeCommuneAncienne).code
    const communeActuelleFeature = communesFeaturesIndex[codeCommuneActuelle]

    if (COMMUNES_ANCIENNES_TYPES.has(f.properties.status)) {
      communesAnciennesFeatures.push(intersect(f, communeActuelleFeature, {properties: {
        nom: f.properties.nom,
        code: codeCommuneAncienne,
        type: 'commune-ancienne'
      }}))
    } else {
      console.log(`Type de statut inconnu : ${f.properties.status}`)
    }
  }

  const duplicates = chain(communesAnciennesFeatures)
    .countBy(f => f.properties.code)
    .toPairs()
    .filter(([, count]) => count > 1)
    .value()

  if (duplicates.length > 0) {
    console.log(`Contours présents plusieurs fois : ${duplicates.map(d => d[0]).join(', ')}`)
    console.log('Abandon!')
    process.exit(1)
  }

  console.time('sauvegarde')
  const items = []

  for (const f of [...communesFeatures, ...communesAnciennesFeatures]) {
    const i = items.length
    const id = `item_${i}`
    await db.set(id, {
      nom: f.properties.nom,
      code: f.properties.code,
      type: f.properties.type,
      contour: f.geometry
    })
    items.push({id, bbox: bbox(f)})
  }

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
