const {pick} = require('lodash')
const {getCommuneActuelle, getCommuneArrondissement, getDepartement, getRegion, getArrondissement, getEPCI} = require('./cog')

function prepareOutput(searchResult) {
  const output = {}

  if (searchResult.type === 'commune-ancienne') {
    output.communeAncienne = {
      nom: searchResult.nom,
      code: searchResult.code
    }

    const communeActuelle = getCommuneActuelle(searchResult.code)
    output.commune = {
      nom: communeActuelle.nom,
      code: communeActuelle.code
    }
  }

  if (searchResult.type === 'commune') {
    output.commune = {
      nom: searchResult.nom,
      code: searchResult.code
    }
  }

  if (searchResult.type === 'arrondissement-municipal') {
    output.arrondissementMunicipal = {
      nom: searchResult.nom,
      code: searchResult.code
    }

    const commune = getCommuneArrondissement(searchResult.code)
    output.commune = {
      nom: commune.nom,
      code: commune.code
    }
  }

  const epci = getEPCI(output.commune.code)
  if (epci) {
    output.epci = pick(epci, 'nom', 'code')
  }

  const arrondissement = getArrondissement(output.commune.code)
  if (arrondissement) {
    output.arrondissement = pick(arrondissement, 'nom', 'code')
  }

  const departement = getDepartement(output.commune.code)
  if (departement) {
    output.departement = pick(departement, 'nom', 'code')
  }

  const region = getRegion(output.commune.code)
  if (region) {
    output.region = pick(region, 'nom', 'code')
  }

  return output
}

module.exports = {prepareOutput}
