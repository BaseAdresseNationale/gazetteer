const {promisify} = require('util')
const mapshaper = require('mapshaper')
const decompress = require('decompress')

const applyCommands = promisify(mapshaper.applyCommands)

async function readShapefile(shapefile, interval) {
  const files = await decompress(shapefile)
  const inputFiles = files.reduce((acc, file) => {
    acc[file.path] = file.data
    return acc
  }, {})
  const inputName = files.find(f => f.path.endsWith('.shp')).path

  const simplifyOptions = `keep-shapes interval=${interval}`
  const command = `-i ${inputName} -simplify ${simplifyOptions} -o output.geojson format=geojson`

  const outputFiles = await applyCommands(command, inputFiles)
  return JSON.parse(outputFiles['output.geojson']).features
}

module.exports = {readShapefile}
