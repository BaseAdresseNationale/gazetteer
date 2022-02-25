const {promisify} = require('util')
const mapshaper = require('mapshaper')

const applyCommands = promisify(mapshaper.applyCommands)

async function readShapefile(shapefile, interval) {
  const inputFiles = {'shp.zip': shapefile}

  const simplifyOptions = `keep-shapes interval=${interval}`
  const command = `-i shp.zip -simplify ${simplifyOptions} -o output.geojson format=geojson`

  const outputFiles = await applyCommands(command, inputFiles)
  return JSON.parse(outputFiles['output.geojson']).features
}

module.exports = {readShapefile}
