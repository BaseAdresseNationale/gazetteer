const {keyBy} = require('lodash')

const communes = require('@etalab/decoupage-administratif/data/communes.json')
  .filter(c => c.type === 'commune-actuelle' || c.type === 'arrondissement-municipal')

const arrondissements = require('@etalab/decoupage-administratif/data/arrondissements.json')
const departements = require('@etalab/decoupage-administratif/data/departements.json')
const regions = require('@etalab/decoupage-administratif/data/regions.json')
const epci = require('@etalab/decoupage-administratif/data/epci.json')

const indexedCommunes = keyBy(communes, 'code')
const indexedArrondissements = keyBy(arrondissements, 'code')
const indexedDepartements = keyBy(departements, 'code')
const indexedRegions = keyBy(regions, 'code')
const indexedEPCI = epci.reduce((acc, item) => {
  for (const m of item.membres) {
    acc[m.code] = item
  }

  return acc
}, {})

const anciensCodesIndex = new Map()
for (const commune of communes) {
  const anciensCodes = commune.anciensCodes || []
  for (const ancienCode of anciensCodes) {
    anciensCodesIndex.set(ancienCode, commune)
  }
}

function getCommuneArrondissement(codeArrondissement) {
  return getCommuneActuelle(indexedCommunes[codeArrondissement].commune)
}

function getCommuneActuelle(codeCommune) {
  return indexedCommunes[codeCommune] || anciensCodesIndex.get(codeCommune)
}

function getEPCI(codeCommune) {
  return indexedEPCI[codeCommune]
}

function getArrondissement(codeCommune) {
  const commune = indexedCommunes[codeCommune]
  if (commune && commune.arrondissement) {
    return indexedArrondissements[commune.arrondissement]
  }
}

function getDepartement(codeCommune) {
  const commune = indexedCommunes[codeCommune]
  if (commune && commune.departement) {
    return indexedDepartements[commune.departement]
  }
}

function getRegion(codeCommune) {
  const commune = indexedCommunes[codeCommune]
  if (commune && commune.region) {
    return indexedRegions[commune.region]
  }
}

module.exports = {getCommuneActuelle, getCommuneArrondissement, getDepartement, getRegion, getArrondissement, getEPCI}
