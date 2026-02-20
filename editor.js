/**
 * Lógica del Constructor Visual de Álbumes
 */

let albumData = {
    global: { transition: 'gift', progress: true },
    screens: [
        { name: 'Pantalla de Ejemplo', opts: { emoji: '🎉', color: 'pink' }, sections: [] }
    ]
};

const screensList = document.getElementById('screens-list');
const btnAddScreen = document.getElementById('btn-add-screen');
const selectGlobalTransition = document.getElementById('global-transition');
const checkGlobalProgress = document.getElementById('global-progress');
const btnExport = document.getElementById('btn-export');

let hasInitData = false;

btnAddScreen.addEventListener('click', () => window.addScreen());

// --- 1. COMUNICACIÓN IFRAME Y CACHÉ LOCAL ---

window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'ALBUM_INIT_DATA' && !hasInitData) {
        hasInitData = true;

        // 1. Intentar cargar el caché local primero si el usuario estaba editando
        const cached = localStorage.getItem('albumBuilderDraft');
        if (cached) {
            try {
                albumData = JSON.parse(cached);
                renderSidebar();
                updatePreview(); // Obligatorio para que el iframe se actualice con lo que sacamos del caché

                // Pequeño aviso visual
                console.log("💿 Borrador restaurado automáticamente desde LocalStorage");
                return; // Terminamos aquí si cargó el caché
            } catch (e) {
                console.error("Error leyendo caché, restaurando datos de fábrica", e);
            }
        }

        // 2. Si no hay caché o hubo un error, usamos los datos limpios del index.html
        albumData = e.data.data;
        renderSidebar();
    }
});

window.updatePreview = function () {
    const frame = document.getElementById('preview-frame');
    if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ type: 'ALBUM_UPDATE_DATA', data: albumData }, '*');
    }
};

function dispatchChange() {
    renderSidebar();
    updatePreview();
    // Guardar automáticamente cada cambio en LocalStorage
    localStorage.setItem('albumBuilderDraft', JSON.stringify(albumData));
}

// Envía cambios sin reconstruir el DOM del menú lateral (evita perder el focus del input)
function softDispatch() {
    updatePreview();
    localStorage.setItem('albumBuilderDraft', JSON.stringify(albumData));
}

// --- 2. RENDERIZADO DEL PANEL IZQUIERDO (SIDEBAR) ---

function renderSidebar() {
    selectGlobalTransition.value = albumData.global.transition || 'gift';
    checkGlobalProgress.checked = albumData.global.progress !== false;

    screensList.innerHTML = '';

    albumData.screens.forEach((screen, sIdx) => {
        const item = document.createElement('div');
        item.className = 'screen-item';

        const header = document.createElement('div');
        header.className = 'screen-header';
        header.innerHTML = `
            <div class="screen-title" onclick="toggleScreen(${sIdx}, event)">
                <span class="screen-emoji">${screen.opts.emoji || '📄'}</span> ${screen.name || 'Sin Título'}
            </div>
            <div class="screen-actions">
                <button class="btn-icon" title="Editar" onclick="toggleScreen(${sIdx}, event)">⚙️</button>
                <button class="btn-icon danger" title="Eliminar Pantalla" onclick="deleteScreen(${sIdx}, event)">🗑️</button>
            </div>
        `;

        const body = document.createElement('div');
        body.className = 'screen-body';
        const colors = ['pink', 'yellow', 'teal', 'blue', 'green', 'purple'];
        const sm = screen.opts.music || {};

        body.innerHTML = `
            <div class="control-group">
                <label>Nombre de la Pantalla</label>
                <input type="text" value="${screen.name || ''}" onchange="updateScreenProp(${sIdx}, 'name', this.value)">
            </div>
            <div style="display: flex; gap: 10px; margin-bottom: 16px;">
                <div style="flex: 1;">
                    <label>Emoji</label>
                    <input type="text" value="${screen.opts.emoji || ''}" onchange="updateScreenOpts(${sIdx}, 'emoji', this.value)">
                </div>
                <div style="flex: 2;">
                    <label>Tema de Color</label>
                    <select onchange="updateScreenOpts(${sIdx}, 'color', this.value)">
                        ${colors.map(c => `<option value="${c}" ${screen.opts.color === c ? 'selected' : ''}>${c.toUpperCase()}</option>`).join('')}
                    </select>
                </div>
            </div>
            
            <div style="padding: 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
                 <h4 style="margin: 0 0 10px; font-size: 11px; color: #64748b; text-transform: uppercase;">🎵 Música de Fondo (para esta pantalla)</h4>
                 <div class="control-group">
                    <label>Ruta MP3 (Dejar en blanco para desactivar)</label>
                    <div class="input-with-gallery">
                        <input type="text" value="${sm.src || ''}" id="sm-m-${sIdx}" onchange="updateScreenMusic(${sIdx}, 'src', this.value)" placeholder="ej: mp3/Arena_Ardiente.mp3">
                        <button type="button" class="btn-icon" style="background:#e2e8f0;" onclick="openGallery(val => { document.getElementById('sm-m-${sIdx}').value = val; updateScreenMusic(${sIdx}, 'src', val); }, 'audios')" title="Abrir Galería">🔍</button>
                    </div>
                 </div>
                 <div style="display: flex; gap: 8px;">
                    <div class="control-group" style="flex: 1;">
                        <label>Título / Artista</label>
                        <input type="text" value="${sm.title || ''}" onchange="updateScreenMusic(${sIdx}, 'title', this.value)">
                    </div>
                    <div class="control-group" style="width: 80px;">
                        <label>Volumen</label>
                        <input type="number" step="0.1" min="0" max="1" value="${sm.volume !== undefined ? sm.volume : 0.5}" onchange="updateScreenMusic(${sIdx}, 'volume', parseFloat(this.value))">
                    </div>
                 </div>
            </div>
            
            <h4 style="margin: 20px 0 10px; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Contenido de la Pantalla</h4>
            <div id="sections-list-${sIdx}"></div>
            
            <button class="add-btn" style="margin-top: 12px; padding: 10px;" onclick="addSection(${sIdx})">
                <span>➕</span> Añadir Módulo (Foto, Música, Texto...)
            </button>
        `;

        // Drag and drop for screens
        item.setAttribute('draggable', 'true');
        item.dataset.screenIndex = sIdx;
        item.ondragstart = (e) => { e.dataTransfer.setData('sourceScreen', sIdx); e.target.style.opacity = '0.5'; };
        item.ondragend = (e) => { e.target.style.opacity = ''; document.querySelectorAll('.screen-item').forEach(el => el.style.border = ''); };
        item.ondragover = (e) => { e.preventDefault(); e.currentTarget.style.border = '2px dashed #3b82f6'; };
        item.ondragleave = (e) => { e.currentTarget.style.border = ''; };
        item.ondrop = (e) => {
            e.preventDefault();
            e.currentTarget.style.border = '';
            const fromIdx = parseInt(e.dataTransfer.getData('sourceScreen'));
            const toIdx = sIdx;
            if (fromIdx === toIdx || isNaN(fromIdx)) return;

            // Reordenar array de pantallas
            const arr = albumData.screens;
            const [movedItem] = arr.splice(fromIdx, 1);
            arr.splice(toIdx, 0, movedItem);

            dispatchChange(); // Requiere rebuild completo por el reordenamiento del DOM
        };

        item.appendChild(header);
        item.appendChild(body);
        screensList.appendChild(item);

        const secContainer = body.querySelector(`#sections-list-${sIdx}`);
        if (screen.sections) {
            screen.sections.forEach((sec, secIdx) => {
                secContainer.appendChild(renderSectionItem(sIdx, secIdx, sec));
            });
        }
    });
}

function renderSectionItem(sIdx, secIdx, sec) {
    const sItem = document.createElement('div');
    sItem.className = 'section-item';
    sItem.style.display = 'block';

    // Drag and drop for sections (modules)
    sItem.setAttribute('draggable', 'true');
    sItem.ondragstart = (e) => {
        e.dataTransfer.setData('sourceSection', secIdx);
        e.dataTransfer.setData('sourceScreenParent', sIdx);
        e.target.style.opacity = '0.5';
    };
    sItem.ondragend = (e) => { e.target.style.opacity = ''; document.querySelectorAll('.section-item').forEach(el => el.style.border = ''); };
    sItem.ondragover = (e) => { e.preventDefault(); e.currentTarget.style.border = '2px dashed #f59e0b'; };
    sItem.ondragleave = (e) => { e.currentTarget.style.border = ''; };
    sItem.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation(); // Avoid triggering screen drop if nested
        e.currentTarget.style.border = '';
        const fromSecIdx = parseInt(e.dataTransfer.getData('sourceSection'));
        const fromScreenIdx = parseInt(e.dataTransfer.getData('sourceScreenParent'));
        const toSecIdx = secIdx;

        // Allow dropping only within the same screen for now
        if (fromScreenIdx !== sIdx || fromSecIdx === toSecIdx || isNaN(fromSecIdx)) return;

        // Reordenar array de secciones
        const arr = albumData.screens[sIdx].sections;
        const [movedItem] = arr.splice(fromSecIdx, 1);
        arr.splice(toSecIdx, 0, movedItem);

        dispatchChange();
    };

    sItem.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size: 14px; cursor: grab; color: #cbd5e1;">☰</span>
                <span class="section-type">${sec.type}</span>
                <span style="color:#64748b; font-size:12px;">Haz clic para editar ⬇️</span>
            </div>
            <button class="btn-icon danger" style="width:24px;height:24px;font-size:10px;" onclick="deleteSection(${sIdx}, ${secIdx}, event)">❌</button>
        </div>
        <div style="display:none; margin-top:12px; border-top:1px dashed #cbd5e1; padding-top:10px;">
            ${getSectionForm(sIdx, secIdx, sec)}
        </div>
    `;
    return sItem;
}

// --- 3. GENERADOR DE FORMULARIOS POR TIPO DE SECCIÓN ---
function getSectionForm(sIdx, secIdx, sec) {
    let html = '';
    const d = sec.data || {};

    if (['foto', 'video', 'gif'].includes(sec.type)) {
        const typeTab = sec.type === 'video' ? 'videos' : 'images';
        html += `<div class="control-group"><label>URL Archivo (Ruta/Src)</label>
                 <div class="input-with-gallery">
                    <input type="text" value="${sec.src || ''}" id="sc-s-${sIdx}-${secIdx}" onchange="updateSectionSrc(${sIdx},${secIdx},this.value)">
                    <button type="button" class="btn-icon" style="background:#e2e8f0;" onclick="openGallery(val => { document.getElementById('sc-s-${sIdx}-${secIdx}').value = val; updateSectionSrc(${sIdx},${secIdx},val); }, '${typeTab}')" title="Abrir Galería">🔍</button>
                 </div></div>`;
    }
    if (sec.type === 'collage') {
        const srcs = sec.src || [];
        html += `<label>Rutas de Imágenes</label>`;
        srcs.forEach((url, i) => {
            html += `
            <div class="control-group" style="display:flex; gap:8px;">
               <input type="text" value="${url}" id="col-${sIdx}-${secIdx}-${i}" placeholder="Ej: fotos/carpeta/foto1.png" onchange="updateSectionSrcArray(${sIdx},${secIdx},${i},this.value)" style="flex:1;">
               <button type="button" class="btn-icon" style="background:#e2e8f0;" onclick="openGallery(val => { document.getElementById('col-${sIdx}-${secIdx}-${i}').value = val; updateSectionSrcArray(${sIdx},${secIdx},${i},val); }, 'images')" title="Abrir Galería">🔍</button>
               <button class="btn-icon danger" style="padding:0; width:36px; height:36px; border-radius:4px; font-size:12px;" onclick="removeCollageImage(${sIdx}, ${secIdx}, ${i})">❌</button>
            </div>`;
        });
        html += `<button class="btn-icon" style="width:100%; margin-bottom:10px; background:#e2e8f0; border-radius:4px" onclick="addCollageImage(${sIdx},${secIdx})">➕ Añadir Imagen al Collage</button>`;

        const layouts = ['3t', '3l', '4', '5m', 'scatter', 'carousel'];
        html += `<div class="control-group"><label>Diseño del Collage</label>
        <select onchange="updateSectionData(${sIdx},${secIdx},'layout',this.value)">
           ${layouts.map(a => `<option value="${a}" ${d.layout === a ? 'selected' : ''}>${a}</option>`).join('')}
        </select></div>`;
    }

    if (['foto', 'video', 'gif', 'collage'].includes(sec.type)) {
        html += `<div class="control-group"><label>Texto Principal</label><input type="text" value="${d.texto || ''}" onchange="updateSectionData(${sIdx},${secIdx},'texto',this.value)" placeholder="Opcional..."></div>`;
    }
    if (['foto', 'collage'].includes(sec.type)) {
        html += `<div class="control-group"><label>Subtexto</label><input type="text" value="${d.subtexto || ''}" onchange="updateSectionData(${sIdx},${secIdx},'subtexto',this.value)" placeholder="Opcional..."></div>`;
    }

    if (sec.type === 'mensaje') {
        html += `<div class="control-group"><label>Emoji Decorativo</label><input type="text" value="${d.emoji || ''}" onchange="updateSectionData(${sIdx},${secIdx},'emoji',this.value)"></div>`;
        html += `<div class="control-group"><label>Texto del Mensaje</label><textarea style="width:100%;height:80px;padding:8px" onchange="updateSectionData(${sIdx},${secIdx},'texto',this.value)">${d.texto || ''}</textarea></div>`;
        html += `<div class="control-group"><label>Firma</label><input type="text" value="${d.firma || ''}" onchange="updateSectionData(${sIdx},${secIdx},'firma',this.value)"></div>`;
    }

    if (sec.type === 'musica') {
        html += `<div class="control-group"><label>Ruta del Archivo (.mp3)</label>
                 <div class="input-with-gallery">
                    <input type="text" value="${d.src || ''}" id="sc-m-${sIdx}-${secIdx}" onchange="updateSectionData(${sIdx},${secIdx},'src',this.value)">
                    <button type="button" class="btn-icon" style="background:#e2e8f0;" onclick="openGallery(val => { document.getElementById('sc-m-${sIdx}-${secIdx}').value = val; updateSectionData(${sIdx},${secIdx},'src',val); }, 'audios')" title="Abrir Galería">🔍</button>
                 </div></div>`;
        html += `<div class="control-group"><label>Título</label><input type="text" value="${d.title || ''}" onchange="updateSectionData(${sIdx},${secIdx},'title',this.value)"></div>`;
        html += `<div class="control-group"><label>Artista / Subtítulo</label><input type="text" value="${d.artist || ''}" onchange="updateSectionData(${sIdx},${secIdx},'artist',this.value)"></div>`;
    }

    // JSON Avanzado para arrays u objetos grandes
    if (['inicio', 'cierre', 'deseos', 'estadisticas'].includes(sec.type)) {
        const payload = Array.isArray(sec.data) ? sec.data : d;
        html += `<div class="control-group">
            <label style="color:#d97706">✏️ Datos Avanzados (Formato JSON estricto)</label>
            <textarea style="width:100%;height:150px;font-family:monospace;font-size:11px;padding:8px" onchange="updateSectionDataJSON(${sIdx},${secIdx},this.value)">${JSON.stringify(payload, null, 2)}</textarea>
        </div>`;
    } else {
        const anims = ['pop', 'zoom', 'flip', 'elastic', 'fade-blur', 'stagger', 'scatter'];
        html += `<div class="control-group"><label>Animación al Entrar</label>
        <select onchange="updateSectionData(${sIdx},${secIdx},'animacion',this.value)">
           <option value="">Ninguna</option>
           ${anims.map(a => `<option value="${a}" ${d.animacion === a ? 'selected' : ''}>${a}</option>`).join('')}
        </select></div>`;
    }

    return html;
}

// --- 4. ACCIONES Y EVENTOS ---
window.updateScreenMusic = (sIdx, prop, val) => {
    if (!albumData.screens[sIdx].opts) albumData.screens[sIdx].opts = {};
    if (!albumData.screens[sIdx].opts.music) albumData.screens[sIdx].opts.music = {};

    albumData.screens[sIdx].opts.music[prop] = val;

    // Si la ruta está vacía, desactivamos la música para esta pantalla
    if (prop === 'src' && (!val || !val.trim())) {
        delete albumData.screens[sIdx].opts.music;
    }
    softDispatch();
};

selectGlobalTransition.addEventListener('change', e => { albumData.global.transition = e.target.value; updatePreview(); });
checkGlobalProgress.addEventListener('change', e => { albumData.global.progress = e.target.checked; updatePreview(); });

window.toggleScreen = (i, e) => {
    e.stopPropagation();
    const items = document.querySelectorAll('.screen-item');
    const wasOpen = items[i].classList.contains('open');

    // Comportamiento de acordeón: cerramos todos y abrimos el seleccionado
    items.forEach(it => it.classList.remove('open'));
    if (!wasOpen) items[i].classList.add('open');

    // Avisar al iframe que cambie a esta página
    const frame = document.getElementById('preview-frame');
    if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ type: 'ALBUM_GOTO_SCREEN', index: i }, '*');
    }
};

window.updateScreenProp = (i, prop, val) => { albumData.screens[i][prop] = val; softDispatch(); };
window.updateScreenOpts = (i, prop, val) => { if (!albumData.screens[i].opts) albumData.screens[i].opts = {}; albumData.screens[i].opts[prop] = val; softDispatch(); };

// Setters de Secciones
window.updateSectionData = (sIdx, secIdx, prop, val) => {
    if (!albumData.screens[sIdx].sections[secIdx].data) albumData.screens[sIdx].sections[secIdx].data = {};
    albumData.screens[sIdx].sections[secIdx].data[prop] = val;
    softDispatch();
};
window.updateSectionDataJSON = (sIdx, secIdx, val) => {
    try {
        albumData.screens[sIdx].sections[secIdx].data = JSON.parse(val);
        softDispatch();
    } catch (e) {
        alert("JSON Inválido. Asegúrate de usar comillas dobles en las claves.");
    }
};
window.updateSectionSrc = (sIdx, secIdx, val) => { albumData.screens[sIdx].sections[secIdx].src = val; softDispatch(); };
window.updateSectionSrcArray = (sIdx, secIdx, i, val) => { albumData.screens[sIdx].sections[secIdx].src[i] = val; softDispatch(); };

window.reRenderSectionForm = (sIdx, secIdx) => {
    const screens = document.querySelectorAll('.screen-item');
    if (screens[sIdx]) {
        const sectionsList = screens[sIdx].querySelector(`#sections-list-${sIdx}`);
        if (sectionsList) {
            const sectionItems = sectionsList.querySelectorAll('.section-item');
            if (sectionItems[secIdx]) {
                const formContainer = sectionItems[secIdx].querySelector('div[style*="display:none"]');
                // Puede que el form esté visible o no, preservamos su estado de display
                const currentDisplay = formContainer ? formContainer.style.display : 'none';

                const sec = albumData.screens[sIdx].sections[secIdx];
                const newItem = renderSectionItem(sIdx, secIdx, sec);
                sectionsList.replaceChild(newItem, sectionItems[secIdx]);

                // Keep the panel open if it was open
                if (currentDisplay !== 'none') {
                    const newForm = newItem.querySelector('div[style*="display:none"]');
                    if (newForm) newForm.style.display = currentDisplay;
                }
            }
        }
    }
}

window.addCollageImage = (sIdx, secIdx) => {
    if (!Array.isArray(albumData.screens[sIdx].sections[secIdx].src)) albumData.screens[sIdx].sections[secIdx].src = [];
    albumData.screens[sIdx].sections[secIdx].src.push('fotos/solo/foto1.png');

    // Solo reescribimos el formulario local, no el item entero
    const curIdx = albumData.screens[sIdx].sections[secIdx].src.length - 1;
    const url = albumData.screens[sIdx].sections[secIdx].src[curIdx];

    // Instead of reRenderSectionForm, append just the input to avoid focus loss
    const screens = document.querySelectorAll('.screen-item');
    if (screens[sIdx]) {
        const sectionsList = screens[sIdx].querySelector(`#sections-list-${sIdx}`);
        if (sectionsList) {
            const sectionItems = sectionsList.querySelectorAll('.section-item');
            if (sectionItems[secIdx]) {
                const formContainer = sectionItems[secIdx].lastElementChild;
                if (formContainer) {
                    // Find the "Añadir Imagen" button to insert before it
                    const addButton = formContainer.querySelector('button[onclick*="addCollageImage"]');
                    if (addButton) {
                        const newRow = document.createElement('div');
                        newRow.className = 'control-group';
                        newRow.style.cssText = 'display:flex; gap:8px;';
                        newRow.innerHTML = `
                            <input type="text" value="${url}" id="col-${sIdx}-${secIdx}-${curIdx}" placeholder="Ej: fotos/carpeta/foto1.png" onchange="updateSectionSrcArray(${sIdx},${secIdx},${curIdx},this.value)" style="flex:1;">
                            <button type="button" class="btn-icon" style="background:#e2e8f0;" onclick="openGallery(val => { document.getElementById('col-${sIdx}-${secIdx}-${curIdx}').value = val; updateSectionSrcArray(${sIdx},${secIdx},${curIdx},val); }, 'images')" title="Abrir Galería">🔍</button>
                            <button class="btn-icon danger" style="padding:0; width:36px; height:36px; border-radius:4px; font-size:12px;" onclick="removeCollageImage(${sIdx}, ${secIdx}, ${curIdx})">❌</button>
                        `;
                        formContainer.insertBefore(newRow, addButton);
                    }
                }
            }
        }
    }
    softDispatch();
};

window.removeCollageImage = (sIdx, secIdx, imageIdx) => {
    if (Array.isArray(albumData.screens[sIdx].sections[secIdx].src)) {
        albumData.screens[sIdx].sections[secIdx].src.splice(imageIdx, 1);

        // Remove the DOM element surgically
        const screens = document.querySelectorAll('.screen-item');
        if (screens[sIdx]) {
            const sectionsList = screens[sIdx].querySelector(`#sections-list-${sIdx}`);
            if (sectionsList) {
                const sectionItems = sectionsList.querySelectorAll('.section-item');
                if (sectionItems[secIdx]) {
                    const formContainer = sectionItems[secIdx].lastElementChild;
                    if (formContainer) {
                        // Find all rows, skip the actual label 
                        const rows = formContainer.querySelectorAll('div[style*="display:flex; gap:8px;"]');
                        if (rows[imageIdx]) {
                            rows[imageIdx].remove();
                            // Re-bind the IDs and onclick handlers of subsequent rows to match the new indices
                            const remainingRows = formContainer.querySelectorAll('div[style*="display:flex; gap:8px;"]');
                            remainingRows.forEach((row, newIdx) => {
                                const input = row.querySelector('input');
                                const btnDel = row.querySelector('.danger');
                                const btnGal = row.querySelector('button[title="Abrir Galería"]');

                                input.id = `col-${sIdx}-${secIdx}-${newIdx}`;
                                input.onchange = function () { updateSectionSrcArray(sIdx, secIdx, newIdx, this.value) };
                                btnDel.onclick = function () { removeCollageImage(sIdx, secIdx, newIdx) };
                                btnGal.onclick = function () { openGallery(val => { document.getElementById(`col-${sIdx}-${secIdx}-${newIdx}`).value = val; updateSectionSrcArray(sIdx, secIdx, newIdx, val); }, 'images') };
                            });
                        }
                    }
                }
            }
        }
        softDispatch();
    }
};

window.addScreen = () => {
    albumData.screens.push({ name: 'Pantalla Nueva', opts: { emoji: '✨', color: 'pink' }, sections: [] });
    dispatchChange();
    setTimeout(() => { document.querySelectorAll('.screen-item')[albumData.screens.length - 1].classList.add('open'); screensList.scrollTo({ top: screensList.scrollHeight, behavior: 'smooth' }); }, 50);
};

window.deleteScreen = (i, e) => {
    e.stopPropagation();
    if (confirm('¿Eliminar esta pantalla y su contenido?')) { albumData.screens.splice(i, 1); dispatchChange(); }
};

window.deleteSection = (sIdx, secIdx, e) => {
    e.stopPropagation();
    if (confirm('¿Quitar módulo de la pantalla?')) {
        albumData.screens[sIdx].sections.splice(secIdx, 1);

        // Remove from DOM to keep state
        const sContainer = document.querySelectorAll('.screen-item')[sIdx].querySelector(`#sections-list-${sIdx}`);
        if (sContainer && sContainer.children[secIdx]) {
            sContainer.removeChild(sContainer.children[secIdx]);
            // Re-render the remaining children to fix secIdx bounds
            const items = Array.from(sContainer.children);
            sContainer.innerHTML = '';
            albumData.screens[sIdx].sections.forEach((s, idx) => {
                sContainer.appendChild(renderSectionItem(sIdx, idx, s));
            });
        }
        softDispatch();
    }
};

window.clearCacheAndRestart = () => {
    if (confirm('⚠️ ¿Estás seguro de que deseas borrar tu progreso no exportado y reiniciar el editor?\n\nEsta acción eliminará el autoguardado actual y cargará los datos de fábrica.')) {
        localStorage.removeItem('albumBuilderDraft');
        location.reload();
    }
};

// --- Inyectar Botón de Limpiar Caché en la UI principal ---
(function () {
    const parent = btnExport.parentNode;
    const btnClear = document.createElement('button');
    btnClear.className = 'add-btn';
    btnClear.style.cssText = 'background: #fef2f2; border: 1px solid #fca5a5; color: #ef4444; margin-bottom: 15px; width: 100%;';
    btnClear.innerHTML = '<span>🗑️</span> Descartar Borrador (Reiniciar)';
    btnClear.onclick = window.clearCacheAndRestart;
    parent.insertBefore(btnClear, btnExport);
})();

window.addSection = (sIdx) => {
    const tipos = ['inicio', 'foto', 'video', 'gif', 'collage', 'mensaje', 'musica', 'deseos', 'estadisticas', 'cierre'];
    const p = prompt("Elige un tipo de módulo a insertar:\n" + tipos.join(', ') + "\n\nO(p)ciones: foto, mensaje, collage, musica, video");

    if (!p || !tipos.includes(p.toLowerCase().trim())) { if (p) alert("Tipo no válido."); return; }

    const type = p.toLowerCase().trim();
    let newData = { type };

    // Default mock data so it doesn't crash the UI when inserted
    if (type === 'foto') newData = { type, src: 'fotos/solo/foto0.png', data: { texto: 'Mi Foto', animacion: 'zoom' } };
    else if (type === 'mensaje') newData = { type, data: { emoji: '💌', texto: 'Texto del mensaje...', firma: 'Firma' } };
    else if (type === 'musica') newData = { type, data: { src: 'mp3/Arena_Ardiente.mp3', title: 'Canción Nueva', volume: 0.8, loop: true } };
    else if (type === 'collage') newData = { type, src: ['fotos/solo/foto0.png', 'fotos/solo/foto1.jpeg'], data: { layout: '3t', texto: 'Nuevo Collage' } };
    else if (type === 'inicio') newData = { type, data: { foto: 'fotos/solo/foto0.png', nombre: 'Nombre', mensaje: 'Mensaje' } };
    else newData.data = {};

    if (!albumData.screens[sIdx].sections) albumData.screens[sIdx].sections = [];
    albumData.screens[sIdx].sections.push(newData);

    // Injecting the new HTML node directly to save layout context
    const secIdx = albumData.screens[sIdx].sections.length - 1;
    const secContainer = document.querySelectorAll('.screen-item')[sIdx].querySelector(`#sections-list-${sIdx}`);
    if (secContainer) {
        const newItem = renderSectionItem(sIdx, secIdx, newData);
        secContainer.appendChild(newItem);
        // Despliega automáticamente el nuevo panel
        const childForm = newItem.querySelector('div[style*="display:none"]');
        if (childForm) childForm.style.display = 'block';
    }

    softDispatch();
};

// --- 5. EXPORTADOR ---
btnExport.addEventListener('click', async () => {
    btnExport.textContent = "⏳ Generando...";
    try {
        const res = await fetch('index.html');
        if (!res.ok) throw new Error("Fetch falló");

        let htmlContent = await res.text();

        // Expresión regular ajustada para coincidir exactamente con el bloque de albumData en index.html
        // Busca desde "const albumData =" hasta justo antes de "/* ── Renderizar desde JSON automatizado ── */"
        const regex = /const\s+albumData\s*=\s*\{[\s\S]*?(?=\/\*\s*──\s*Renderizar\s*desde\s*JSON)/;

        if (!regex.test(htmlContent)) {
            alert("⚠️ No se pudo procesar la plantilla. El algoritmo de exportación no encontró el bloque original de datos.");
            console.error("No regex match found for HTML export");
            return;
        }

        const jsonText = JSON.stringify(albumData, null, 2);
        htmlContent = htmlContent.replace(regex, `const albumData = ${jsonText};\n\n    `);

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mi-album-finalizado.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        alert("🔒 Tu navegador actual impide exportar archivos locales. Se recomienda usar la extensión 'Live Server' de VS Code.\n\nMientras tanto, puedes abrir la consola (F12) y copiar el objeto 'albumData' manualmente.");
        console.error("Error Exportando:", err);
    } finally {
        btnExport.textContent = "Exportar HTML";
    }
});

// --- 6. GALERÍA DE MEDIOS LOCALES (WEBKITDIRECTORY & FILESYSTEM API) ---
let galleryFiles = { images: [], videos: [], audios: [] };
let activeGalleryInput = null; // Guardará el callback para actualizar el valor cuando se seleccione un archivo
let currentGalleryTab = 'images';

const dirPicker = document.getElementById('dir-picker');
const btnImportDir = document.getElementById('btn-import-dir');
const btnRestoreDir = document.getElementById('btn-restore-dir');
const legacyPickerContainer = document.getElementById('legacy-picker-container');
const galleryModal = document.getElementById('gallery-modal');
const galleryGrid = document.getElementById('gallery-grid');
const galleryStatus = document.getElementById('gallery-status');

// Helper for IndexedDB to store Directory Handles
const idb = {
    db: null,
    async init() {
        return new Promise((resolve) => {
            const req = indexedDB.open('AlbumBuilderDB', 1);
            req.onupgradeneeded = (e) => e.target.result.createObjectStore('settings');
            req.onsuccess = (e) => { this.db = e.target.result; resolve(); };
            req.onerror = () => resolve();
        });
    },
    async set(key, val) {
        if (!this.db) return;
        return new Promise(resolve => {
            const tx = this.db.transaction('settings', 'readwrite');
            tx.objectStore('settings').put(val, key);
            tx.oncomplete = () => resolve();
        });
    },
    async get(key) {
        if (!this.db) return null;
        return new Promise(resolve => {
            const tx = this.db.transaction('settings', 'readonly');
            const req = tx.objectStore('settings').get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    }
};

async function processFileExt(file, path) {
    if (file.name.startsWith('.') || path.includes('/.')) return;
    const url = URL.createObjectURL(file);
    const item = { name: file.name, path: path, url: url, file: file };

    if (file.type.startsWith('image/')) galleryFiles.images.push(item);
    else if (file.type.startsWith('video/')) galleryFiles.videos.push(item);
    else if (file.type.startsWith('audio/')) galleryFiles.audios.push(item);
}

function finishGalleryLoad() {
    const total = galleryFiles.images.length + galleryFiles.videos.length + galleryFiles.audios.length;
    galleryStatus.textContent = `${total} archivos cargados (Fotos: ${galleryFiles.images.length}, Videos: ${galleryFiles.videos.length}, Audios: ${galleryFiles.audios.length})`;
    alert(`✅ ¡Directorio escaneado con éxito!\n\nSe encontraron ${total} archivos multimedia.\nAhora puedes usar los botones "🔍 Galería" para insertarlos visualmente.`);

    // Cambiar la visual del botón para indicar que hay algo cargado
    const labelElem = document.querySelector('.folder-picker-btn');
    if (labelElem) {
        labelElem.innerHTML = `<span>📂</span> Directorio Cargado (${total} archivos)`;
        labelElem.style.background = '#059669';
    }
}

// Fallback legacy (webkitdirectory)
dirPicker.addEventListener('change', async (e) => {
    galleryFiles = { images: [], videos: [], audios: [] };
    const files = Array.from(e.target.files);

    for (const file of files) {
        const path = file.webkitRelativePath.split('/').slice(1).join('/'); // Remover nombre de la carpeta raíz
        if (path) await processFileExt(file, path);
    }
    finishGalleryLoad();
});

// Modern File System API Recursion
async function scanDirectoryHandle(dirHandle, basePath = '') {
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
            const file = await entry.getFile();
            await processFileExt(file, basePath + entry.name);
        } else if (entry.kind === 'directory') {
            await scanDirectoryHandle(entry, basePath + entry.name + '/');
        }
    }
}

window.openGallery = (onSelectCallback, explicitType = null) => {
    activeGalleryInput = onSelectCallback;
    if (explicitType) currentGalleryTab = explicitType;
    galleryModal.classList.add('active');
    renderGalleryGrid();

    // Auto cambiar de pestaña según el tipo solicitado visualmente
    document.querySelectorAll('.gallery-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.gallery-tab[onclick*="${currentGalleryTab}"]`).classList.add('active');
};

window.closeGallery = () => {
    galleryModal.classList.remove('active');
    activeGalleryInput = null;
};

window.switchGalleryTab = (tab) => {
    currentGalleryTab = tab;
    document.querySelectorAll('.gallery-tab').forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');
    renderGalleryGrid();
};

function renderGalleryGrid() {
    galleryGrid.innerHTML = '';
    const items = galleryFiles[currentGalleryTab] || [];

    if (items.length === 0) {
        galleryGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px;">No se encontraron ${currentGalleryTab} en la carpeta importada.</div>`;
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'gallery-item';
        div.title = item.path;

        if (currentGalleryTab === 'images') {
            div.innerHTML = `<img src="${item.url}" loading="lazy"><div class="item-label">${item.name}</div>`;
        } else if (currentGalleryTab === 'videos') {
            div.innerHTML = `<video src="${item.url}" muted onmouseenter="this.play()" onmouseleave="this.pause()"></video><div class="item-label">${item.name}</div>`;
        } else {
            div.innerHTML = `<div class="audio-icon">🎵</div><div class="item-label">${item.name}</div>`;
        }

        div.onclick = () => {
            if (activeGalleryInput) {
                // Inyectamos el webkitRelativePath limpio (ej: 'fotos/solo/foto.png')
                activeGalleryInput(item.path);
                closeGallery();
            }
        };

        galleryGrid.appendChild(div);
    });
}

// --- INITIALIZATION ---
async function initFileSystem() {
    await idb.init();

    // Check if modern API is supported
    if (!window.showDirectoryPicker) {
        btnImportDir.style.display = 'none';
        legacyPickerContainer.style.display = 'inline-flex';
        return;
    }

    // Check if we have a saved handle
    const savedHandle = await idb.get('projectDir');
    if (savedHandle) {
        btnRestoreDir.style.display = 'block';
        btnRestoreDir.innerHTML = `<span>🔄</span> Restaurar Carpeta Anterior (${savedHandle.name})`;
    }

    btnImportDir.addEventListener('click', async () => {
        try {
            const dirHandle = await showDirectoryPicker();
            await idb.set('projectDir', dirHandle);

            galleryFiles = { images: [], videos: [], audios: [] };
            galleryStatus.textContent = 'Escanenado directorio...';

            await scanDirectoryHandle(dirHandle);
            finishGalleryLoad();

            btnRestoreDir.style.display = 'block';
            btnRestoreDir.innerHTML = `<span>🔄</span> Restaurar Carpeta Anterior (${dirHandle.name})`;
        } catch (e) {
            console.error(e);
        }
    });

    btnRestoreDir.addEventListener('click', async () => {
        try {
            const dirHandle = await idb.get('projectDir');
            if (!dirHandle) return;

            // Request permission again (browsers usually require this after reload)
            const perm = await dirHandle.requestPermission({ mode: 'read' });
            if (perm !== 'granted') throw new Error("Permiso denegado por el usuario.");

            galleryFiles = { images: [], videos: [], audios: [] };
            galleryStatus.textContent = 'Restaurando directorio...';

            await scanDirectoryHandle(dirHandle);
            finishGalleryLoad();

        } catch (e) {
            alert("No se pudo restaurar la carpeta (puede haber sido movida o permisos insuficientes). Elige una nueva.");
            console.error(e);
            btnRestoreDir.style.display = 'none';
            await idb.set('projectDir', null);
        }
    });
}

// Inicializar el guardado local del directorio
initFileSystem();
