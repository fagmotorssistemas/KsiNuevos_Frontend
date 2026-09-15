const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const Module = require('node:module')
const root = path.resolve(__dirname, '../src')
const original = Module._resolveFilename
Module._resolveFilename = function (name, ...args) {
  return original.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args)
}
require.extensions['.ts'] = function (mod, file) {
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, file)
}
const { emovResult, emovText } = require('../src/lib/inventario/emovResult.ts')
const { buildContrastMatrix, emptyContrasteStaff, officialPendingSummary, contrasteTopicDetail } = require('../src/lib/inventario/ecuadorContraste.ts')
const { buildContrasteAiContext } = require('../src/lib/inventario/documentAiRules.ts')
const { VEHICLE_DOCUMENT_CATALOG } = require('../src/lib/inventario/vehicleDocumentCatalog.ts')
const raw = { generado_en: '2026-09-15T10:28:08Z', consulta: { valor: 'ABC5722', sin_deudas: false, total_a_pagar: 112.6, deudas: [{ concepto: 'MULTAS RTV', total: 75 }, { concepto: 'REVISIÓN TÉCNICA VEHICULAR', total: 25 }, { concepto: 'RODAJE', total: 12.6 }] } }
const emov = emovResult(raw, 'ABC5722', 'job')
test('Preserves all three concepts without counting the total twice', () => {
  assert.equal(emov.total, 112.6)
  assert.equal(emov.conceptos.length, 3)
  const summary = officialPendingSummary({ emov, ant: { total: 75 } })
  assert.equal(summary.emovTotal, 112.6)
  assert.equal(summary.total, 75)
  const detail = contrasteTopicDetail({ emov }, 'informe_emov')
  assert.deepEqual(detail.lines.map(x => x.amount), [75, 25, 12.6])
})
test('Rejects another vehicle and missing or inconsistent amounts', () => {
  assert.throws(() => emovResult(raw, 'XYZ1234', 'job'))
  assert.throws(() => emovResult({ consulta: { valor: 'ABC5722' } }, 'ABC5722', 'job'))
  assert.throws(() => emovResult({ consulta: { ...raw.consulta, sin_deudas: true } }, 'ABC5722', 'job'))
})
test('Only an explicit zero result means no outstanding EMOV values', () => {
  const zero = emovResult({ consulta: { valor: 'ABC5722', sin_deudas: true } }, 'ABC5722', 'job')
  const row = state => buildContrastMatrix({ emov: state }, emptyContrasteStaff(), { visibleDocTypes: ['informe_emov'] })[0]
  assert.equal(row(zero).emov.kind, 'ok')
  assert.equal(row({ ...emov, estado: 'pendiente', total: null }).emov.kind, 'warn')
  assert.equal(row({ ...emov, estado: 'error', total: null }).emov.kind, 'warn')
  assert.equal(row(emov).emov.kind, 'missing')
  assert.equal(officialPendingSummary({}).emovTotal, null)
})
test('EMOV text includes concepts and unknown states without displaying the timestamp', () => {
  const context = buildContrasteAiContext({ plate: 'ABC5722', emov }, null)
  assert.match(context.snapshotText, /RODAJE: \$12.60/)
  assert.doesNotMatch(emovText(emov), /Consultado:|2026-09-15/)
  assert.match(emovText({ ...emov, estado: 'error', error: 'No disponible' }), /No disponible/)
})
test('ATM and AMT are separate document types that accept files', () => {
  for (const docType of ['informe_atm', 'informe_amt']) {
    assert.equal(VEHICLE_DOCUMENT_CATALOG.filter(c => c.docType === docType).length, 1)
    assert.equal(VEHICLE_DOCUMENT_CATALOG.find(c => c.docType === docType).requiresFile, true)
  }
})

const oldLoad = Module._load
let remoteOk = true
let visible = true
let saved = null
let calls = []
Module._load = function (name, ...args) {
  if (name === 'server-only') return {}
  if (name === '@/lib/emov') return {
    EMOV_ID: /^[0-9a-f-]{36}$/,
    emovRequest: async (url, owner) => {
      calls.push({ url, owner })
      return { ok: remoteOk, json: async () => url.endsWith('/resultado') ? raw : { estado: 'completada', valor: 'ABC5722', actualizado_en: raw.generado_en } }
    },
  }
  if (name === '@/lib/supabase/server') return { createServiceRoleClient: () => ({ from: () => ({ update: value => {
    saved = value
    const query = { eq: () => query, select: () => query, maybeSingle: async () => ({ data: { ...historyRow, ...value }, error: null }) }
    return query
  } }) }) }
  return oldLoad.call(this, name, ...args)
}
const { refreshEmov } = require('../src/lib/inventario/emovContraste.server.ts')
const historyRow = { id: 'history', consulted_by: 'owner-of-original-query', staff_snapshot: {}, payload: { plate: 'ABC5722', matricula: { text: '', vigente: null }, emov: { ...emov, estado: 'pendiente', total: null, conceptos: [] } } }
const authenticatedDb = { from: () => {
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: visible ? { id: 'history' } : null }) }
  return query
} }
test('Completed jobs persist on the original history row using its query owner', async () => {
  saved = null; calls = []; visible = true; remoteOk = true
  const row = await refreshEmov(authenticatedDb, historyRow)
  assert.equal(row.payload.emov.estado, 'completada')
  assert.equal(saved.payload.emov.total, 112.6)
  assert.ok(calls.every(c => c.owner === historyRow.consulted_by))
})
test('No visible record means no privileged update', async () => {
  saved = null; visible = false
  assert.equal(await refreshEmov(authenticatedDb, historyRow), historyRow)
  assert.equal(saved, null)
  visible = true
})
test('Temporary remote errors preserve pending status rather than claiming zero', async () => {
  remoteOk = false; saved = null
  const row = await refreshEmov(authenticatedDb, historyRow)
  assert.equal(row.payload.emov.estado, 'pendiente')
  assert.equal(row.payload.emov.total, null)
  assert.equal(saved, null)
  remoteOk = true
})

test('A new EMOV query on an old contrast uses the EMOV requester for status and result', async () => {
  remoteOk = true; visible = true; calls = []
  const input = { ...historyRow, payload: { ...historyRow.payload, emov: { ...historyRow.payload.emov, ownerId: 'new-requester' } } }
  const result = await refreshEmov(authenticatedDb, input)
  assert.equal(calls.length, 2)
  assert.ok(calls.every(c => c.owner === 'new-requester'))
  assert.equal(result.payload.emov.ownerId, 'new-requester')
  assert.equal(result.consulted_by, 'owner-of-original-query')
  assert.equal(result.payload.emov.total, 112.6)
})
