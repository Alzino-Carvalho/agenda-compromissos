/* script.js - funções compartilhadas entre index.html e day.html */

// --- utilitários ---
function pad(n){return n.toString().padStart(2,'0')}
function formatHeader(date){
  const d = pad(date.getDate()) + '/' + pad(date.getMonth()+1);
  const weekday = date.toLocaleDateString('pt-BR',{weekday:'long'}).slice(0,3);
  // Capitaliza primeira letra
  const w = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${d} - ${w}`;
}

function dateToKey(date){ // date: Date or yyyy-mm-dd
  if (typeof date === 'string') return date;
  const y = date.getFullYear(); const m = pad(date.getMonth()+1); const d = pad(date.getDate());
  return `${y}-${m}-${d}`;
}

// --- storage ---
function loadEvents(){
  try{ return JSON.parse(localStorage.getItem('agendaEvents')||'{}') }catch(e){return {}}
}
function saveEvents(obj){ localStorage.setItem('agendaEvents', JSON.stringify(obj)) }

function downloadJSON(obj, filename){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename || 'agenda.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 5000);
} 
function setEvent(dateKey,time,value){
  const all = loadEvents();
  all[dateKey] = all[dateKey] || {};
  if (value) all[dateKey][time] = value; else delete all[dateKey][time];
  saveEvents(all);
}
function getEvent(dateKey,time){
  const all = loadEvents();
  return all[dateKey] && all[dateKey][time] ? all[dateKey][time] : '';
}

// --- slots generator ---
function generateTimes(startHour=0,endHour=24,stepMinutes=30){
  const times=[];
  for(let h=startHour; h<endHour; h++){
    for(let m=0;m<60;m+=stepMinutes){
      times.push(pad(h)+':'+pad(m));
    }
  }
  return times;
}

// --- renderers ---
function renderSlotElement(time, dateKey, compact=false){
  const div = document.createElement('div');
  div.className = 'slot';

  const timeEl = document.createElement('time');
  timeEl.textContent = time;
  div.appendChild(timeEl);

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Inserir compromisso...';
  input.value = getEvent(dateKey,time);
  input.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter') { e.preventDefault(); btn.click(); }
  });

  const btn = document.createElement('button');
  btn.innerText = 'Salvar';
  btn.title = 'Salvar compromisso';
  btn.addEventListener('click', ()=>{
    const v = input.value.trim();
    setEvent(dateKey,time, v);
    if (v) { savedSpan.textContent = 'Salvo'; } else { savedSpan.textContent = ''; }
  });

  const savedSpan = document.createElement('span');
  savedSpan.className = 'saved';
  if (input.value) savedSpan.textContent = 'Salvo';

  div.appendChild(input);
  div.appendChild(btn);
  div.appendChild(savedSpan);

  return div;
}

function renderDaySlots(container, dateKey, compact=false){
  container.innerHTML = '';
  const times = generateTimes(0,24,30);
  times.forEach(time => {
    const slot = renderSlotElement(time,dateKey,compact);
    container.appendChild(slot);
  });
}

// --- index page ---
function getCurrentWeekDays(offsetWeeks = 0){
  const today = new Date();
  // shift by weeks
  if (offsetWeeks) today.setDate(today.getDate() + (offsetWeeks * 7));
  const day = today.getDay(); // 0 Sun .. 6 Sat
  // calculate Monday of that week
  const monday = new Date(today);
  const diffToMonday = ((day + 6) % 7);
  monday.setDate(today.getDate() - diffToMonday);
  const arr = [];
  for(let i=0;i<6;i++){ // Monday..Saturday
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    arr.push(d);
  }
  return arr;
}

function formatWeekRange(offsetWeeks = 0){
  const days = getCurrentWeekDays(offsetWeeks);
  const first = days[0], last = days[days.length-1];
  return `${pad(first.getDate())}/${pad(first.getMonth()+1)} — ${pad(last.getDate())}/${pad(last.getMonth()+1)}`;
}

// notes storage per week
function getWeekKey(offsetWeeks = 0){
  const days = getCurrentWeekDays(offsetWeeks);
  const monday = days[0];
  return dateToKey(monday) + '-w';
}
function loadWeekNotes(){
  try{ return JSON.parse(localStorage.getItem('agendaNotes')||'{}') }catch(e){ return {} }
}
function saveWeekNotes(obj){ localStorage.setItem('agendaNotes', JSON.stringify(obj)) }
function getWeekNotes(weekKey){ const m = loadWeekNotes(); return m[weekKey] || ''; }
function setWeekNotes(weekKey, text){ const m = loadWeekNotes(); if (text && text.trim()) m[weekKey] = text.trim(); else delete m[weekKey]; saveWeekNotes(m); }

function renderNotesPanel(offsetWeeks = 0){
  const panel = document.getElementById('notesPanel');
  if (!panel) return;
  const weekKey = getWeekKey(offsetWeeks);
  const weekLabel = document.getElementById('notesWeekLabel');
  const listEl = document.getElementById('notesList');
  const input = document.getElementById('noteInput');
  const addBtn = document.getElementById('addNoteBtn');
  const clearAllBtn = document.getElementById('clearAllNotesBtn');

  if (weekLabel) weekLabel.textContent = formatWeekRange(offsetWeeks);

  function getNotesArray(){
    const text = getWeekNotes(weekKey) || '';
    return text.split('\n').map(l=>l.trim()).filter(Boolean);
  }
  function saveNotesArray(arr){
    // write back into the notes object to avoid races
    try{
      console.debug('saveNotesArray - about to save', weekKey, arr);
      let m = loadWeekNotes();
      // ensure m is an object
      if (!m || typeof m !== 'object') {
        console.warn('saveNotesArray - agendaNotes not object, resetting');
        m = {};
      }
      if (arr && arr.length) m[weekKey] = arr.join('\n'); else delete m[weekKey];
      saveWeekNotes(m);
      console.debug('saveNotesArray - saved for', weekKey, m[weekKey], 'full object keys:', Object.keys(m));
    }catch(err){ console.error('saveNotesArray error', err); }
  }

  function renderList(){
    if (!listEl){ console.warn('Notas: elemento #notesList não encontrado'); if (statusEl) statusEl.textContent = 'Erro: lista de observações não encontrada.'; return; }
    listEl.innerHTML = '';
    const notes = getNotesArray();
    console.debug('renderList - notes for', weekKey, notes);
    if (notes.length === 0){ const n = document.createElement('div'); n.className = 'muted'; n.textContent = 'Nenhuma observação'; listEl.appendChild(n); return; }
    notes.forEach((note, idx) => {
      const row = document.createElement('div'); row.className = 'note-row';
      const text = document.createElement('div'); text.className = 'note-text'; text.textContent = note;
      const editInput = document.createElement('input'); editInput.className = 'edit-input'; editInput.type = 'text'; editInput.value = note;
      const actions = document.createElement('div'); actions.className = 'note-actions';
      const editBtn = document.createElement('button'); editBtn.className = 'edit-btn'; editBtn.title = 'Editar'; editBtn.textContent = '✎';
      const delBtn = document.createElement('button'); delBtn.className = 'del-btn'; delBtn.title = 'Excluir'; delBtn.textContent = '✕';

      editBtn.addEventListener('click', (e)=>{ e.stopPropagation(); row.classList.add('editing'); editInput.focus(); });
      delBtn.addEventListener('click', (e)=>{ e.stopPropagation(); if (!confirm('Excluir esta observação?')) return; const arr = getNotesArray(); arr.splice(idx,1); saveNotesArray(arr); renderList(); });

      // save on Enter, cancel on Escape
      editInput.addEventListener('keydown', (e)=>{
        if (e.key === 'Enter'){ e.preventDefault(); const v = editInput.value.trim(); if (!v){ alert('Observação vazia'); return; } const arr = getNotesArray(); arr[idx] = v; saveNotesArray(arr); row.classList.remove('editing'); renderList(); }
        if (e.key === 'Escape'){ e.preventDefault(); row.classList.remove('editing'); }
      });

      actions.appendChild(editBtn); actions.appendChild(delBtn);
      row.appendChild(text); row.appendChild(editInput); row.appendChild(actions);
      listEl.appendChild(row);
    });
  }

  // bind add handler safely
  const statusEl = document.getElementById('notesStatus');
  if (addBtn && input){
    addBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      try{
        // attempt to read value from input or active element (fallback)
        const raw = (input && ('value' in input)) ? input.value : ((document.activeElement && 'value' in document.activeElement) ? document.activeElement.value : '');
        console.debug('Lendo valor raw:', JSON.stringify(raw));
        const v = raw ? raw.trim() : '';
        if (!v){ if (statusEl) { statusEl.textContent = 'Digite algo antes de adicionar (valor lido: ' + JSON.stringify(raw) + ')'; setTimeout(()=> statusEl.textContent = '', 3000); } return; }

        // reload directly from storage and append
        try{
          const arrNow = getNotesArray(); // read current
          console.debug('Antes de push, arrNow=', arrNow);
          arrNow.push(v);
          saveNotesArray(arrNow);
          const reload = getNotesArray();
          console.debug('Notas após salvar:', reload);
          if (statusEl) { statusEl.textContent = (reload.length) + ' observação(ões)'; setTimeout(()=> statusEl.textContent = '', 2500); }
        }catch(e){ console.error('Erro salvando/recarregando notas:', e); if (statusEl) statusEl.textContent = 'Erro ao salvar (veja console).'; }

        // copy to next week (avoid duplicates)
        try{
          const nextKey = getWeekKey(offsetWeeks + 1);
          const nextArr = (getWeekNotes(nextKey) || '').split('\n').map(l=>l.trim()).filter(Boolean);
          if (!nextArr.includes(v)){
            nextArr.push(v);
            setWeekNotes(nextKey, nextArr.join('\n'));
          }
        }catch(err){ console.warn('Erro ao copiar para próxima semana:', err); }

        // finally update UI
        input.value='';
        try{ renderList(); }catch(err){ console.error('Erro em renderList após adicionar:', err); if (statusEl) statusEl.textContent = 'Erro ao atualizar lista (veja console).'; }

        // fallback: if renderList didn't show the new item, append it directly
        try{
          const existingTexts = Array.from(document.querySelectorAll('.note-text')).map(n=>n.textContent.trim());
          if (!existingTexts.includes(v)){
            console.warn('Item não apareceu via renderList — aplicando fallback DOM append');
            const notesListEl = document.getElementById('notesList');
            if (notesListEl){
              const row = document.createElement('div'); row.className = 'note-row fallback';
              const tdiv = document.createElement('div'); tdiv.className = 'note-text'; tdiv.textContent = v;
              const actions = document.createElement('div'); actions.className = 'note-actions';
              const editBtn = document.createElement('button'); editBtn.className = 'edit-btn'; editBtn.textContent = '✎';
              const delBtn = document.createElement('button'); delBtn.className = 'del-btn'; delBtn.textContent = '✕';
              delBtn.addEventListener('click',(ev)=>{ ev.stopPropagation(); // remove from storage and UI
                const arr2 = getNotesArray(); const ix = arr2.indexOf(v); if (ix>-1){ arr2.splice(ix,1); saveNotesArray(arr2); }
                row.remove();
              });
              editBtn.addEventListener('click',(ev)=>{ ev.stopPropagation(); const newVal = prompt('Editar observação:', v); if (newVal && newVal.trim()){ const arr2 = getNotesArray(); const ix = arr2.indexOf(v); if (ix>-1){ arr2[ix]=newVal.trim(); saveNotesArray(arr2); renderList(); } }});
              actions.appendChild(editBtn); actions.appendChild(delBtn);
              row.appendChild(tdiv); row.appendChild(actions);
              notesListEl.prepend(row);
            }
          }
        }catch(fbErr){ console.warn('Fallback append falhou:', fbErr); }

        if (statusEl) { statusEl.textContent = 'Informação adicionada.'; setTimeout(()=> statusEl.textContent = '', 2500); }
        console.info('Observação adicionada e copiada para a próxima semana (se não havia duplicata).');
      }catch(err){ console.error('Erro ao adicionar observação:', err); if (statusEl) statusEl.textContent = 'Erro ao adicionar (veja console).'; }
    });

    input.addEventListener('keydown', (e)=>{ if (e.key === 'Enter'){ e.preventDefault(); addBtn.click(); } });
  } else {
    console.warn('Elemento de observações não encontrado (noteInput/addNoteBtn)');
    if (statusEl) statusEl.textContent = 'Elementos de observações não encontrados.';
  }

  const forwardBtn = document.getElementById('forwardNotesBtn');
  if (forwardBtn){
    forwardBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      try{
        if (!confirm('Enviar todas as observações desta semana para a próxima semana? Observações já existentes não serão duplicadas.')) return;
        const notes = getNotesArray();
        if (notes.length === 0){ alert('Nenhuma observação para enviar.'); return; }
        const nextKey = getWeekKey(offsetWeeks + 1);
        const nextArr = (getWeekNotes(nextKey) || '').split('\n').map(l=>l.trim()).filter(Boolean);
        let added = 0;
        notes.forEach(n => { if (!nextArr.includes(n)){ nextArr.push(n); added++; }});
        if (added > 0) { setWeekNotes(nextKey, nextArr.join('\n')); alert(added + ' observação(ões) copiadas para a próxima semana.'); }
        else { alert('Nenhuma nova observação foi copiada (todas já existem na próxima semana).'); }
      }catch(err){ console.error('Erro ao enviar todas as observações:', err); alert('Erro ao enviar observações. Veja o console.'); }
    });
  }

  clearAllBtn.onclick = (e)=>{ e.stopPropagation(); if (!confirm('Limpar todas as observações desta semana?')) return; saveWeekNotes(weekKey,''); renderList(); };

  // initial render
  if (input) input.value = '';
  renderList();
}

// helpers for events view
function getEventsForDate(dateKey){
  const all = loadEvents();
  const obj = all[dateKey] || {};
  return Object.keys(obj).sort().map(t=>({ time: t, text: obj[t] }));
}

function renderEventsList(container, dateKey, compact=false){
  container.innerHTML = '';
  const events = getEventsForDate(dateKey);
  const list = document.createElement('div'); list.className = 'events-list';

  if (events.length === 0){
    const note = document.createElement('div'); note.className = 'muted'; note.textContent = 'Nenhum compromisso agendado';
    list.appendChild(note);
  } else {
    events.forEach(ev => {
      const it = document.createElement('div'); it.className = 'event-item';
      const info = document.createElement('div'); info.className = 'event-info';
      const timeB = document.createElement('div'); timeB.className = 'time-badge'; timeB.textContent = ev.time;
      const txt = document.createElement('div'); txt.className = 'event-text'; txt.textContent = ev.text;
      info.appendChild(timeB); info.appendChild(txt);
      const del = document.createElement('button'); del.className = 'delete-btn'; del.textContent = 'Remover';
      del.addEventListener('click', (e)=>{
        e.stopPropagation();
        setEvent(dateKey, ev.time, '');
        // re-render list and update card info if present
        const parentCard = container.closest('.day-card');
        if (parentCard) {
          const infoNode = parentCard.querySelector('.info');
          const updatedCount = Object.keys(loadEvents()[dateKey] || {}).length;
          infoNode.textContent = updatedCount ? `${updatedCount} compromisso(s)` : '';
        }
        renderEventsList(container, dateKey, compact);
      });
      it.appendChild(info); it.appendChild(del);
      list.appendChild(it);
    });
  }

  // add form placeholder (hidden by default)
  const formWrap = document.createElement('div'); formWrap.className = 'add-form-wrap';
  list.appendChild(formWrap);
  container.appendChild(list);
}

function createAddForm(dateKey, container, onSaved){
  // returns the form element
  const form = document.createElement('div'); form.className = 'add-form';
  const sel = document.createElement('select');
  generateTimes(0,24,30).forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; sel.appendChild(o); });
  const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'Compromisso...';
  const save = document.createElement('button'); save.className = 'save-btn'; save.textContent = 'Salvar';
  const cancel = document.createElement('button'); cancel.className = 'cancel-btn'; cancel.textContent = 'Cancelar';

  save.addEventListener('click', (e)=>{
    e.stopPropagation();
    const time = sel.value; const text = input.value.trim();
    if (!text){ alert('Escreva o compromisso antes de salvar.'); return; }
    setEvent(dateKey, time, text);
    if (typeof onSaved === 'function') onSaved();
  });
  cancel.addEventListener('click', (e)=>{ e.stopPropagation(); form.remove(); });

  form.appendChild(sel); form.appendChild(input); form.appendChild(save); form.appendChild(cancel);
  return form;
}

function renderDayCard(date, container){
  const key = dateToKey(date);
  const card = document.createElement('article');
  card.className = 'day-card';

  const head = document.createElement('div'); head.className='head';
  const dateLabel = document.createElement('div'); dateLabel.className='date'; dateLabel.textContent = formatHeader(date);
  const info = document.createElement('div'); info.className='info';
  const events = loadEvents()[key] || {};
  const count = Object.keys(events).length;
  info.textContent = (count>0) ? `${count} compromisso(s)` : '';

  const addBtn = document.createElement('button'); addBtn.className = 'btn'; addBtn.textContent = 'Adicionar';
  addBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    // toggle form
    const slots = card.querySelector('.slots');
    let wrap = slots.querySelector('.add-form-wrap');
    if (!wrap) {
      wrap = document.createElement('div'); wrap.className = 'add-form-wrap'; slots.appendChild(wrap);
    }
    if (wrap.firstChild) { wrap.firstChild.remove(); return; }
    const f = createAddForm(key, slots, ()=>{
      // on saved
      renderEventsList(slots, key, true);
      const updatedCount = Object.keys(loadEvents()[key] || {}).length;
      info.textContent = updatedCount ? `${updatedCount} compromisso(s)` : '';
      f.remove();
    });
    wrap.appendChild(f);
  });

  head.appendChild(dateLabel); head.appendChild(info); head.appendChild(addBtn);
  card.appendChild(head);

  const slots = document.createElement('div'); slots.className='slots';
  // show only scheduled events in compact form
  renderEventsList(slots, key, true);
  card.appendChild(slots);

  // open detail when clicking card but NOT when clicking inputs/buttons
  card.addEventListener('click', (e)=>{
    const tag = e.target.tagName.toLowerCase();
    if (['input','button','time'].includes(tag)) return; // ignore
    location.href = `day.html?date=${key}`;
  });

  container.appendChild(card);
}

function renderWeekGrid(offsetWeeks = 0){
  const container = document.getElementById('daysContainer');
  container.innerHTML = '';
  const days = getCurrentWeekDays(offsetWeeks);
  days.forEach(d=>renderDayCard(d, container));
  const weekLabel = document.getElementById('weekLabel');
  if (weekLabel) weekLabel.textContent = formatWeekRange(offsetWeeks);
  if (document.getElementById('notesPanel')) renderNotesPanel(offsetWeeks);
}

// --- init for index ---
(function initIndex(){
  const params = new URLSearchParams(location.search);
  let weekOffset = parseInt(params.get('week')||'0',10) || 0;
  renderWeekGrid(weekOffset);

  const todayBtn = document.getElementById('todayBtn');
  if (todayBtn) todayBtn.addEventListener('click', ()=> {
    history.replaceState(null,'', location.pathname);
    renderWeekGrid(0);
  });

  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn){
    exportBtn.addEventListener('click', ()=>{
      const payload = { events: loadEvents(), notes: loadWeekNotes() };
      downloadJSON(payload, `agenda-export-${new Date().toISOString().slice(0,10)}.json`);
    });
  }

  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  if (importBtn && importFile){
    importBtn.addEventListener('click', ()=> importFile.click());
    importFile.addEventListener('change', (e)=>{
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt){
        try{
          const data = JSON.parse(evt.target.result);
          if (!data || typeof data !== 'object') throw new Error('Arquivo inválido');
          showImportPreview(data, evt.target.result);
        }catch(err){
          alert('Erro ao ler arquivo: ' + err.message);
        } finally {
          importFile.value = '';
        }
      };
      reader.readAsText(file);
    });
  }

  // import preview helpers
  function getCurrentWeekOffset(){
    const params = new URLSearchParams(location.search);
    return parseInt(params.get('week')||'0',10) || 0;
  }

  function showImportPreview(data, raw){
    const modal = document.getElementById('importPreviewModal');
    const content = document.getElementById('importPreviewContent');
    if (!modal || !content){ alert('Pré-visualização indisponível'); performImport(data, confirm('Mesclar? OK=Mesclar, Cancel=Substituir.')); return; }
    content.textContent = JSON.stringify(data, null, 2);
    modal.setAttribute('aria-hidden','false');

    document.getElementById('mergeImportBtn').onclick = (e)=>{ e.stopPropagation(); closeImportPreview(); performImport(data, true); };
    document.getElementById('replaceImportBtn').onclick = (e)=>{ e.stopPropagation(); closeImportPreview(); performImport(data, false); };
    document.getElementById('cancelImportBtn').onclick = (e)=>{ e.stopPropagation(); closeImportPreview(); };
    document.getElementById('closePreviewBtn').onclick = (e)=>{ e.stopPropagation(); closeImportPreview(); };
  }

  function closeImportPreview(){ const modal = document.getElementById('importPreviewModal'); if (modal) modal.setAttribute('aria-hidden','true'); }

  function performImport(data, merge){
    try{
      if (merge){
        const current = loadEvents();
        const importedEvents = data.events || {};
        Object.keys(importedEvents).forEach(dk => {
          current[dk] = current[dk] || {};
          Object.assign(current[dk], importedEvents[dk]);
        });
        saveEvents(current);
        const currentNotes = loadWeekNotes();
        const importedNotes = data.notes || {};
        Object.keys(importedNotes).forEach(k => { currentNotes[k] = importedNotes[k]; });
        saveWeekNotes(currentNotes);
      } else {
        if (data.events) saveEvents(data.events); else localStorage.removeItem('agendaEvents');
        if (data.notes) saveWeekNotes(data.notes); else localStorage.removeItem('agendaNotes');
      }
      alert('Importação concluída.');
      // refresh view
      const off = getCurrentWeekOffset();
      renderWeekGrid(off);
      if (document.getElementById('notesPanel')) renderNotesPanel(off);
    }catch(err){ alert('Erro ao importar: ' + err.message); }
  }

  const nextBtn = document.getElementById('nextWeekBtn');
  const prevBtn = document.getElementById('prevWeekBtn');
  if (nextBtn){
    nextBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const current = getCurrentWeekOffset();
      const newOffset = current + 1;
      const href = `index.html?week=${newOffset}`;
      window.open(href, '_blank');
    });
  }
  if (prevBtn){
    prevBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const current = getCurrentWeekOffset();
      const newOffset = current - 1;
      const href = `index.html?week=${newOffset}`;
      window.open(href, '_blank');
    });
  }
})();
// --- day detail page ---
function renderDayDetail(container, dateKey){
  container.innerHTML = '';
  const title = document.createElement('h2'); title.textContent = `Compromissos de ${dateKey}`;
  const addBtn = document.createElement('button'); addBtn.className = 'btn'; addBtn.textContent = 'Adicionar';

  const listWrap = document.createElement('div'); listWrap.className = 'day-events-wrap';
  renderEventsList(listWrap, dateKey, false);

  addBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    // append a form below the button
    // remove previous form if exists
    const existing = listWrap.querySelector('.add-form');
    if (existing) { existing.remove(); return; }
    const f = createAddForm(dateKey, listWrap, ()=>{
      renderEventsList(listWrap, dateKey, false);
      f.remove();
    });
    listWrap.prepend(f);
  });

  container.appendChild(title);
  container.appendChild(addBtn);
  container.appendChild(listWrap);
}


// Expor funções usadas por day.html inline script
window.renderDayDetail = renderDayDetail;
window.formatHeader = formatHeader;
