
import { exprToSQL } from './expr'
import { indexDefinitionToSQL } from './index-definition'
import { columnDefinitionToSQL } from './column'
import { constraintDefinitionToSQL } from './constrain'
import { funcToSQL } from './func'
import { tablesToSQL, tableOptionToSQL, tableToSQL } from './tables'
import { unionToSQL } from './union'
import { commonKeywordArgsToSQL, toUpper, hasVal, identifierToSql, triggerEventToSQL, literalToSQL } from './util'

function createDefinitionToSQL(definition) {
  if (!definition) return []
  const { resource } = definition
  switch (resource) {
    case 'column':
      return columnDefinitionToSQL(definition)
    case 'index':
      return indexDefinitionToSQL(definition)
    case 'constraint':
      return constraintDefinitionToSQL(definition)
    default:
      throw new Error(`unknow resource = ${resource} type`)
  }
}

function createTableToSQL(stmt) {
  const {
    type, keyword, table, like, as, temporary,
    if_not_exists: ifNotExists,
    create_definitions: createDefinition,
    table_options: tableOptions,
    ignore_replace: ignoreReplace,
    query_expr: queryExpr,
  } = stmt
  const sql = [toUpper(type), toUpper(temporary), toUpper(keyword), toUpper(ifNotExists), tablesToSQL(table)]
  if (like) {
    const { type: likeType, table: likeTable } = like
    const likeTableName = tablesToSQL(likeTable)
    sql.push(toUpper(likeType), likeTableName)
    return sql.filter(hasVal).join(' ')
  }
  if (createDefinition) {
    sql.push(`(${createDefinition.map(createDefinitionToSQL).join(', ')})`)
  }
  if (tableOptions) {
    sql.push(tableOptions.map(tableOptionToSQL).join(' '))
  }
  sql.push(toUpper(ignoreReplace), toUpper(as))
  if (queryExpr) sql.push(unionToSQL(queryExpr))
  return sql.filter(hasVal).join(' ')
}

function createTriggerToSQL(stmt) {
  const {
    constraint, constraint_kw: constraintKw,
    deferrable,
    events, execute,
    for_each: forEach, from,
    location,
    keyword,
    type, table,
    when,
  } = stmt
  const sql = [toUpper(type), toUpper(constraintKw), toUpper(keyword), identifierToSql(constraint), toUpper(location)]
  const event = triggerEventToSQL(events)
  sql.push(event, 'ON', tableToSQL(table))
  if (from) sql.push('FROM', tableToSQL(from))
  sql.push(...commonKeywordArgsToSQL(deferrable), ...commonKeywordArgsToSQL(forEach))
  if (when) sql.push(toUpper(when.type), exprToSQL(when.cond))
  sql.push(toUpper(execute.keyword), funcToSQL(execute.expr))
  return sql.filter(hasVal).join(' ')
}

function createExtensionToSQL(stmt) {
  const {
    extension,
    from,
    if_not_exists: ifNotExists,
    keyword,
    schema,
    type,
    with: withName,
    version,
  } = stmt
  const sql = [toUpper(type), toUpper(keyword), toUpper(ifNotExists), literalToSQL(extension), toUpper(withName)]
  if (schema) sql.push('SCHEMA', literalToSQL(schema))
  if (version) sql.push('VERSION', literalToSQL(version))
  if (from) sql.push('FROM', literalToSQL(from))
  return sql.filter(hasVal).join(' ')
}

function createToSQL(stmt) {
  const { keyword } = stmt
  let sql = ''
  switch (keyword.toLowerCase()) {
    case 'table':
      sql = createTableToSQL(stmt)
      break
    case 'trigger':
      sql = createTriggerToSQL(stmt)
      break
    case 'extension':
      sql = createExtensionToSQL(stmt)
      break
    default:
      throw new Error(`unknow create resource ${keyword}`)
  }
  return sql
}

export {
  createToSQL,
}
