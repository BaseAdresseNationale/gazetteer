const Flatbush = require('flatbush')
const Cache = require('lru-cache')
const Keyv = require('keyv')
const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default
const {prepareOutput} = require('./lib/result')

async function createGazetteer(options = {}) {
  const dbPath = options.dbPath || process.env.GAZETTEER_DB_PATH

  if (!dbPath) {
    throw new Error('Path to the database is required')
  }

  const _db = new Keyv('sqlite://' + dbPath)
  const _cache = new Cache(options.cacheSize || 0)
  const _cacheEnabled = options.cacheEnabled === true
  const _items = await _db.get('items')
  const _spatialIndex = new Flatbush(_items.length)

  for (const c of _items) {
    _spatialIndex.add(...c.bbox)
  }

  _spatialIndex.finish()

  async function _getItem(id) {
    if (_cacheEnabled && _cache.has(id)) {
      return _cache.get(id)
    }

    const item = await _db.get(id)

    if (_cacheEnabled) {
      _cache.set(id, item)
    }

    return item
  }

  return {
    async find({lon, lat}) {
      const indices = _spatialIndex.search(lon, lat, lon, lat)
      const candidates = await Promise.all(
        indices.map(idx => {
          const {id} = _items[idx]
          return _getItem(id)
        })
      )
      const point = {type: 'Point', coordinates: [lon, lat]}
      const results = candidates.filter(item => booleanPointInPolygon(point, item.contour))

      return results.length > 0 ? prepareOutput(selectBestResult(results)) : null
    },

    clearCache() {
      if (_cacheEnabled) {
        _cache.reset()
      }
    },

    _getItem,
    _cache,
    _items,
    _db,
    _cacheEnabled,
    _spatialIndex
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
