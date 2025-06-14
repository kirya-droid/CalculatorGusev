/* ---------- справочники -------------------------------------------------- */

/* slug → подпись по-русски */
const CAT_LABEL = {
  erklyez:              'Эрклёз',
  obrabotannyy_erklyez: 'Обработанный эрклёз',
  shcheben:             'Щебень',
  shariki:              'Шарики',
  glyby:                'Глыбы',
  bloki:                'Блоки',
  kvartsevoe_steklo:    'Кварцевое стекло',
  khrustal:             'Хрусталь'
};

/* плотность (кг/м³) по основным фракциям */
const DENSITY = {
  '70-300 мм': 1400,
  '70-150 мм': 1450,
  '20-70 мм' : 1500,
  '10-50 мм' : 1500,
  '2-10 мм'  : 1600
};

/* ---------- утилиты ------------------------------------------------------ */

const $ = id => document.getElementById(id);

/* формат числа: 1885000 → '1 885 000' */
const fmt = n => n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); // неразр. пробел

/* русская подпись категории */
const rusLabel = raw => {
  const key = raw.toLowerCase().replace(/\/$/, '');
  return CAT_LABEL[key] || raw;
};

/* заполняет <select> */
function fillSelect(sel, keys, placeholder, captionFn = x => x) {
  sel.innerHTML = `<option disabled selected>${placeholder}</option>`;
  keys.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = captionFn(k);
    sel.appendChild(opt);
  });
}

/* строим дерево: category → material → [variants] */
function buildTree(arr) {
  const tree = new Map();
  for (const p of arr) {
    if (!tree.has(p.category)) tree.set(p.category, new Map());
    const m = tree.get(p.category);
    if (!m.has(p.name)) m.set(p.name, []);
    m.get(p.name).push(p);
  }
  return tree;
}

/* ---------- основной код ------------------------------------------------- */

async function main() {
  /* --- загрузка данных --- */
  const data = await fetch('products.json').then(r => r.json());
  const tree = buildTree(data);

  /* --- элементы DOM --- */
  const catSel = $('categorySelect');
  const matSel = $('materialSelect');
  const fracSel = $('fractionSelect');
  const lenI = $('lengthInput'), widI = $('widthInput'), heiI = $('heightInput');
  const colorInfo = $('colorInfo'), result = $('result'), img = $('preview');

  /* --- наполнить категории --- */
  fillSelect(catSel, [...tree.keys()], '— категория —', rusLabel);

  /* выбор категории */
  catSel.addEventListener('change', () => {
    const mats = [...tree.get(catSel.value).keys()];
    fillSelect(matSel, mats, '— материал —');
    matSel.disabled = false;
    fracSel.disabled = true;
    fracSel.innerHTML = '';
    reset();
  });

  /* выбор материала */
  matSel.addEventListener('change', () => {
    const variants = tree.get(catSel.value).get(matSel.value);
    const fracs = [...new Set(variants.map(v => v.fraction))];
    fillSelect(fracSel, fracs, '— фракция —');
    fracSel.disabled = false;
    reset();
  });

  /* пересчитываем при любом изменении */
  [fracSel, lenI, widI, heiI].forEach(el => el.addEventListener('input', update));

  /* --- функции --- */
  function reset() {
    colorInfo.textContent = '';
    result.textContent = '';
    img.src = '';
  }

  function update() {
    const variants = tree.get(catSel.value)?.get(matSel.value) || [];
    const prod = variants.find(v => v.fraction === fracSel.value);
    if (!prod) { reset(); return; }

    colorInfo.textContent = `Цвет: ${prod.color}`;

    const vol =
      (parseFloat(lenI.value) || 0) *
      (parseFloat(widI.value) || 0) *
      (parseFloat(heiI.value) || 0);

    const weight = vol * (DENSITY[prod.fraction] || 1500);  // кг
    const cost   = weight * prod.price;                     // ₽

    result.textContent =
      `Нужно ${fmt(weight)} кг × ${prod.price} ₽ = ${fmt(cost)} ₽`;

    img.src = prod.image;
    img.alt = prod.name;
  }
}

/* --- запуск --- */
main().catch(err => alert('Ошибка загрузки каталога: ' + err));
