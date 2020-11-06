const gdal = require('gdal-next')

async function readShapefile(path) {
  const dataset = gdal.open(`/vsizip/${path}`)
  const layer = dataset.layers.get(0)
  return layer.features.map(feature => {
    const properties = feature.fields.toObject()
    const geometry = feature.getGeometry().toObject()
    return {type: 'Feature', properties, geometry}
  })
}

module.exports = {readShapefile}
