const form = document.getElementById('mine-form')
const artifactList = document.getElementById('artifact-list')
const geoList = document.getElementById('geo-list')
const sourceList = document.getElementById('source-list')
const resultList = document.getElementById('result-list')
const statusEl = document.getElementById('status')
const mineBtn = document.getElementById('mine-btn')
const saveBtn = document.getElementById('save-btn')
const selectAll = document.getElementById('select-all')

let catalog = { artifacts: [], sources: [], geoLevels: [] }
let results = []

function chip(id, label, hint, checked, configured = true) {
  const el = document.createElement('label')
  el.className = `chip${configured ? '' : ' off'}`
  el.title = hint || ''
  el.innerHTML = `<input type="checkbox" value="${id}" ${checked ? 'checked' : ''} ${configured ? '' : ''}/><span>${label}${configured ? '' : ' <span class="sub">needs key</span>'}</span>`
  return el
}

async function loadCatalog() {
  const res = await fetch('/api/catalog')
  catalog = await res.json()
  artifactList.replaceChildren()
  for (const kind of catalog.artifacts) {
    artifactList.append(chip(kind.id, kind.label, kind.hint, ['belief', 'plank', 'goal', 'cause'].includes(kind.id)))
  }
  geoList.replaceChildren()
  for (const level of catalog.geoLevels || []) {
    geoList.append(chip(level.id, level.label, level.hint, true))
  }
  sourceList.replaceChildren()
  for (const source of catalog.sources) {
    sourceList.append(chip(source.id, source.label, source.hint, source.configured && source.id !== 'web-url', source.configured))
  }
}

function selected(container) {
  return [...container.querySelectorAll('input:checked')].map((el) => el.value)
}

function geoLabel(id) {
  const row = (catalog.geoLevels || []).find((level) => level.id === id)
  return row ? row.label : id
}

function renderResults() {
  resultList.replaceChildren()
  saveBtn.disabled = results.length === 0
  for (const [index, row] of results.entries()) {
    const item = document.createElement('li')
    item.className = 'result'
    const link = row.url ? ` · <a href="${row.url}" target="_blank" rel="noreferrer">source</a>` : ''
    item.innerHTML = `
      <input type="checkbox" data-index="${index}" checked />
      <div>
        <div class="type">${row.type}${row.geoLevel ? ` · ${geoLabel(row.geoLevel)}` : ''}</div>
        <p class="text"></p>
        <p class="meta">${row.sourceName || row.sourceId}${link}</p>
      </div>`
    item.querySelector('.text').textContent = row.text
    resultList.append(item)
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const types = selected(artifactList)
  const geoLevels = selected(geoList)
  const sources = selected(sourceList)
  statusEl.textContent = 'Mining…'
  mineBtn.disabled = true
  try {
    const res = await fetch('/api/mine', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: document.getElementById('query').value,
        url: document.getElementById('url').value,
        types,
        geoLevels,
        sources,
      }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.message || 'Mine failed')
    results = body.examples || []
    renderResults()
    const err = (body.errors || []).join(' · ')
    statusEl.textContent = `${results.length} candidates${err ? ` · ${err}` : ''}`
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : String(error)
  } finally {
    mineBtn.disabled = false
  }
})

selectAll.addEventListener('change', () => {
  for (const box of resultList.querySelectorAll('input[type="checkbox"]')) {
    box.checked = selectAll.checked
  }
})

saveBtn.addEventListener('click', async () => {
  const picked = [...resultList.querySelectorAll('input[type="checkbox"]:checked')]
    .map((box) => results[Number(box.dataset.index)])
    .filter(Boolean)
  statusEl.textContent = 'Saving…'
  saveBtn.disabled = true
  try {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ examples: picked }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.message || 'Save failed')
    statusEl.textContent = `Saved ${body.count} rows to mined data/${body.file}`
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : String(error)
  } finally {
    saveBtn.disabled = results.length === 0
  }
})

loadCatalog().catch((error) => {
  statusEl.textContent = error instanceof Error ? error.message : String(error)
})
