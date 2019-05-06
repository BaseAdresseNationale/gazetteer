const Flatbush = require('flatbush')
const Keyv = require('keyv')
const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default
const {prepareOutput} = require('./lib/result')

async function createGazetteer(dbPath) {
  const db = new Keyv('sqlite://' + (dbPath || process.env.GAZETTEER_DB_PATH))
  const items = await db.get('items')
  const spatialIndex = new Flatbush(items.length)
  items.forEach(c => spatialIndex.add(...c.bbox))
  spatialIndex.finish()

  return {
    async find({lon, lat}) {
      const indices = spatialIndex.search(lon, lat, lon, lat)
      const candidates = await Promise.all(
        indices.map(idx => {
          const {id} = items[idx]
          return db.get(id)
        })
      )
      const point = {type: 'Point', coordinates: [lon, lat]}
      const results = candidates.filter(item => booleanPointInPolygon(point, item.contour))

      return results.length > 0 ? prepareOutput(selectBestResult(results)) : null
    }
  }
}

function selectBestResult(candidates) {
  const communeAncienne = candidates.find(c => c.type === 'commune-ancienne')
  if (communeAncienne) {
    return communeAncienne
  }

  const arrondissementMunicipal = candidates.find(c => c.type === 'arrondissement-municipal')
  if (arrondissementMunicipal) {
    return arrondissementMunicipal
  }

  return candidates[0]
}

module.exports = {createGazetteer}
