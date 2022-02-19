const {groupBy, keyBy, maxBy} = require('lodash')
const historiqueCommunes = require('@etalab/decoupage-administratif/graph-communes')
const communes = require('@etalab/decoupage-administratif/data/communes.json')
const arrondissements = require('@etalab/decoupage-administratif/data/arrondissements.json')
const departements = require('@etalab/decoupage-administratif/data/departements.json')
const regions = require('@etalab/decoupage-administratif/data/regions.json')
const epci = require('@etalab/decoupage-administratif/data/epci.json')

const indexedCommunes = keyBy(communes.filter(c => c.type === 'commune-actuelle' || c.type === 'arrondissement-municipal'), 'code')
const indexedArrondissements = keyBy(arrondissements, 'code')
const indexedDepartements = keyBy(departements, 'code')
const indexedRegions = keyBy(regions, 'code')
const indexedEPCI = epci.reduce((acc, item) => {
  for (const m of item.membres) {
    acc[m.code] = item
  }

  return acc
}, {})

function getCommuneArrondissement(codeArrondissement) {
  return getCommuneActuelle(indexedCommunes[codeArrondissement].commune)
}

const arrondissementsMunicipaux = communes
  .filter(c => c.type === 'arrondissement-municipal')
  .map(c => ({code: c.code, nom: c.nom, type: 'COM'}))

const byCodeCommune = groupBy([...historiqueCommunes, ...arrondissementsMunicipaux], h => `${h.type}${h.code}`)

function getMostRecentCommune(codeCommune) {
  return maxBy(
    byCodeCommune[`COM${codeCommune}`] || byCodeCommune[`COMD${codeCommune}`] || byCodeCommune[`COMA${codeCommune}`],
    c => c.dateFin || '9999-99-99'
  )
}

function communeToCommuneActuelle(commune) {
  if (commune.pole) {
    return communeToCommuneActuelle(commune.pole)
  }

  if (commune.successeur) {
    return communeToCommuneActuelle(commune.successeur)
  }

  if (!commune.dateFin && commune.type === 'COM') {
    return commune
  }

  if (commune.pole) {
    return communeToCommuneActuelle(commune.pole)
  }
}

function getCommuneActuelle(codeCommune) {
  const communePlusRecente = getMostRecentCommune(codeCommune)
  if (communePlusRecente) {
    return communeToCommuneActuelle(communePlusRecente)
  }
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
