#!/usr/bin/env node --max-old-space-size=8192
const {join} = require('path')
const Keyv = require('keyv')
const bluebird = require('bluebird')
const {keyBy} = require('lodash')
const bbox = require('@turf/bbox').default
const {getCodeActuel} = require('../lib/cog')
const {readShapefile} = require('./shp')

const COMMUNES_FILENAME = 'communes-20190101-shp.zip'
const COMMUNES_ANCIENNES_FILENAME = 'communes-anciennes-20190101-shp.zip'
const ARRONDISSEMENTS_MUNICIPAUX_FILENAME = 'arrondissements-municipaux-20180711-shp.zip'

const PLM = ['75056', '13055', '69123']
const COMMUNES_ANCIENNES_TYPES = [
  'commune associée',
  'commune déléguée',
  'commune centre',
  'commune fusionnée',
  'ancienne commune',
  'commune associé',
  'ancienne commune déléguée'
]

const DATA_DIR = join(__dirname, '..', 'data')

async function main() {
  const db = new Keyv('sqlite://db.sqlite')
  await db.clear()
  console.time('chargement des communes')
  const communesFeatures = await readShapefile(join(DATA_DIR, COMMUNES_FILENAME))
  console.timeEnd('chargement des communes')

  console.time('chargement des arrondissements municipaux')
  const arrondissementsMunicipauxFeatures = await readShapefile(join(DATA_DIR, ARRONDISSEMENTS_MUNICIPAUX_FILENAME))
  console.timeEnd('chargement des arrondissements municipaux')

  console.time('chargement des communes anciennes')
  const communesAnciennesFeatures = await readShapefile(join(DATA_DIR, COMMUNES_ANCIENNES_FILENAME))
  console.timeEnd('chargement des communes anciennes')

  const indexedFeatures = keyBy(communesFeatures.map(addType, 'commune'), f => f.properties.insee)
  arrondissementsMunicipauxFeatures.forEach(f => {
    indexedFeatures[f.properties.insee] = addType(f, 'arrondissement-municipal')
  })
  PLM.forEach(codeArrondissement => {
    delete indexedFeatures[codeArrondissement]
  })
  communesAnciennesFeatures.forEach(f => {
    if (!COMMUNES_ANCIENNES_TYPES.includes(f.properties.status)) {
      return
    }

    const codeActuel = getCodeActuel(f.properties.insee)
    if (codeActuel) {
      delete indexedFeatures[codeActuel]
      indexedFeatures[f.properties.insee] = addType(f, 'commune-ancienne')
    }
  })

  const items = []

  console.time('sauvegarde')
  await bluebird.each(Object.values(indexedFeatures), async f => {
    const code = f.properties.insee
    await db.set(code, {nom: f.properties.nom, code, type: f.properties.type, contour: f.geometry})
    items.push({code, bbox: bbox(f)})
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
