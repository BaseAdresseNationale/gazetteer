#!/usr/bin/env node --max-old-space-size=8192
const {join} = require('path')
const Keyv = require('@livingdata/keyv')
const bluebird = require('bluebird')
const bbox = require('@turf/bbox').default
const {getCommuneActuelle} = require('../lib/cog')
const {readShapefile} = require('./shp')

const COMMUNES_FILENAME = 'communes-20190101-shp.zip'
const COMMUNES_ANCIENNES_FILENAME = 'communes-anciennes-20190808-shp.zip'
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
  const communesFeatures = (await readShapefile(join(DATA_DIR, COMMUNES_FILENAME)))
    .map(f => addType(f, 'commune'))
  console.timeEnd('chargement des communes')

  console.time('chargement des arrondissements municipaux')
  const arrondissementsMunicipauxFeatures = (await readShapefile(join(DATA_DIR, ARRONDISSEMENTS_MUNICIPAUX_FILENAME)))
    .map(f => addType(f, 'arrondissement-municipal'))
  console.timeEnd('chargement des arrondissements municipaux')

  console.time('chargement des communes anciennes')
  const communesAnciennesFeatures = await readShapefile(join(DATA_DIR, COMMUNES_ANCIENNES_FILENAME))
  console.timeEnd('chargement des communes anciennes')

  const features = communesFeatures
    .filter(c => !PLM.includes(c.properties.insee))
    .concat(arrondissementsMunicipauxFeatures)

  communesAnciennesFeatures.forEach(f => {
    if (!f.properties.ref_INSEE || !getCommuneActuelle(f.properties.ref_INSEE)) {
      console.log(`Commune actuelle introuvable pour le code INSEE ${f.properties.ref_INSEE}`)
      return
    }

    if (COMMUNES_ANCIENNES_TYPES.includes(f.properties.admin_type)) {
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
  })

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
