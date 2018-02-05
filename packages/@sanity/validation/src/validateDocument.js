const Type = require('type-of-is')
const {flatten} = require('lodash')
const ValidationError = require('./ValidationError')

/* eslint-disable no-console */
module.exports = async (doc, schema) => {
  const type = schema.get(doc._type)
  if (!type) {
    console.warn('Schema type for object type "%s" not found, skipping validation', doc._type)
    return []
  }

  try {
    return await validateItem(doc, type, [], {})
  } catch (err) {
    console.error(err)
    return [{type: 'validation', level: 'error', path: [], item: new ValidationError(err.message)}]
  }
}

function validateItem(item, type, path, options) {
  if (Array.isArray(item)) {
    return validateArray(item, type, path, options)
  }

  if (typeof item === 'object') {
    return validateObject(item, type, path, options)
  }

  return validatePrimitive(item, type, path, options)
}

function validateObject(obj, type, path, options) {
  if (!type) {
    return []
  }

  // Validate actual object itself
  let objChecks = []
  if (type.validation) {
    objChecks = type.validation.map(async rule => {
      const ruleResults = await rule.validate(obj, {parent: options.parent})
      return applyPath(ruleResults, path)
    })
  }

  // Validate fields within object
  const fields = type.fields || []
  const fieldChecks = fields.map(field => {
    const validation = field.type.validation
    if (!validation) {
      return null
    }

    const fieldPath = appendPath(path, field.name)
    const fieldValue = obj[field.name]
    return validateItem(fieldValue, field.type, fieldPath, {parent: obj})
  })

  return Promise.all([...objChecks, ...fieldChecks]).then(flatten)
}

function validateArray(items, type, path, options) {
  // Validate actual array itself
  let arrayChecks = []
  if (type.validation) {
    arrayChecks = type.validation.map(async rule => {
      const ruleResults = await rule.validate(items, {parent: options.parent})
      return applyPath(ruleResults, path)
    })
  }

  // Validate items within array
  const itemChecks = items.map((item, i) => {
    const pathSegment = item._key ? {_key: item._key} : i
    const itemType = resolveTypeForArrayItem(item, type.of)
    const itemPath = appendPath(path, [pathSegment])
    return validateItem(item, itemType, itemPath, {parent: items})
  })

  return Promise.all([...arrayChecks, ...itemChecks]).then(flatten)
}

function validatePrimitive(item, type, path, options) {
  if (!type.validation) {
    return []
  }

  const results = type.validation.map(rule =>
    rule
      .validate(item, {parent: options.parent})
      .then(currRuleResults => applyPath(currRuleResults, path))
  )

  return Promise.all(results).then(flatten)
}

function resolveTypeForArrayItem(item, candidates) {
  const primitive = !item._type && Type.string(item).toLowerCase()
  if (primitive) {
    return candidates.find(candidate => candidate.jsonType === primitive)
  }

  return (
    candidates.find(candidate => candidate.type.name === item._type) ||
    candidates.find(candidate => candidate.name === item._type)
  )
}

function appendPath(base, next) {
  return base.concat(next)
}

function applyPath(results, pathPrefix) {
  return results.map(result => {
    const path = typeof result.path === 'undefined' ? pathPrefix : pathPrefix.concat(result.path)
    return {type: 'validation', ...result, path}
  })
}
