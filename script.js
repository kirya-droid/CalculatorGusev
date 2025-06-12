async function loadProducts() {
  const r = await fetch('products.json');
  return r.json();
}

// группируем по name
function groupByName(arr) {
  const map = new Map();
  for (const p of arr) {
    if (!map.has(p.name)) map.set(p.name, []);
    map.get(p.name).push(p);
  }
  return map;
}

// заполняем любой <select>
function fillSelect(sel, options, firstCaption) {
  sel.innerHTML = '';
  if (firstCaption) {
    const opt = document.createElement('option');
    opt.disabled = true;
    opt.selected = true;
    opt.textContent = firstCaption;
    sel.appendChild(opt);
  }
  for (const v of options) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    sel.appendChild(o);
  }
}

function densityByFrac(frac) {
  // простая карта плотностей; при необходимости расширяйте
  const d = {
    '70-300 мм': 1400,
    '70-150 мм': 1450,
    '20-70 мм' : 1500,
    '10-50 мм' : 1500,
    '2-10 мм'  : 1600
  };
  return d[frac] || 1500;
}

function initUI(data) {
  const materialsMap = groupByName(data);

  const materialSel = document.getElementById('materialSelect');
  const fracSel     = document.getElementById('fractionSelect');
  const colorInfo   = document.getElementById('colorInfo');
  const lInput      = document.getElementById('lengthInput');
  const wInput      = document.getElementById('widthInput');
  const hInput      = document.getElementById('heightInput');
  const resultDiv   = document.getElementById('result');
  const previewImg  = document.getElementById('preview');

  fillSelect(materialSel, Array.from(materialsMap.keys()), '— выберите —');

  function updateFractionOptions() {
    const material = materialsMap.get(materialSel.value) || [];
    const fracs = [...new Set(material.map(p => p.fraction))];
    fillSelect(fracSel, fracs, '— фракция —');
    fracSel.disabled = false;
    updateResult();
  }

  function updateResult() {
    const material = materialsMap.get(materialSel.value) || [];
    const product  = material.find(p => p.fraction === fracSel.value);
    if (!product) {
      resultDiv.textContent = '';
      previewImg.src = '';
      colorInfo.textContent = '';
      return;
    }

    // выводим цвет
    colorInfo.textContent = `Цвет: ${product.color}`;

    const len = parseFloat(lInput.value) || 0;
    const wid = parseFloat(wInput.value) || 0;
    const hei = parseFloat(hInput.value) || 0;
    const vol = len * wid * hei;                              // м³
    const density = densityByFrac(product.fraction);          // кг/м³
    const weight = vol * density;                             // кг
    const cost   = weight * product.price;                    // руб.

    resultDiv.textContent =
      `Нужно ${weight.toFixed(1)} кг × ${product.price} ₽ = ${cost.toFixed(2)} ₽`;

    previewImg.src = product.image;
    previewImg.alt = product.name;
  }

  materialSel.addEventListener('change', () => {
    updateFractionOptions();
  });
  fracSel.addEventListener('change', updateResult);
  [lInput, wInput, hInput].forEach(el => el.addEventListener('input', updateResult));
}

loadProducts().then(initUI).catch(e => {
  alert('Не удалось загрузить products.json: ' + e);
});
