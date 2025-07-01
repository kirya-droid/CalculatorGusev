/* ---------- константы ---------- */

const WEBHOOK = 'https://gabrichukharchilava.bitrix24.ru/rest/12/33kovodvisef4ei9/crm.lead.add.json';
const PLACEHOLDER_IMG = 'img/placeholder.jpg';         // дефолтная картинка

const CAT_LABEL = {                                    // slug → подпись
  erklyez:              'Эрклёз',
  obrabotannyy_erklyez: 'Обработанный эрклёз',
  shcheben:             'Щебень',
  shariki:              'Шарики',
  glyby:                'Глыбы',
  bloki:                'Блоки',
  kvartsevoe_steklo:    'Кварцевое стекло',
  khrustal:             'Хрусталь'
};

const DENSITY = {                                      // кг/м³
  '70-300 мм': 1400, '70-150 мм': 1450,
  '20-70 мм' : 1500, '10-50 мм' : 1500, '2-10 мм' : 1600
};

/* ---------- утилиты ---------- */

const $  = id => document.getElementById(id);
const fmt = n => n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
const rusLabel = raw => CAT_LABEL[raw.toLowerCase()] || raw;

function fillSelect(sel, items, ph, cap=x=>x){
  sel.innerHTML = `<option disabled selected>${ph}</option>`;
  items.forEach(v=>{
    const o=document.createElement('option');
    o.value=v; o.textContent=cap(v); sel.append(o);
  });
}

function buildTree(list){
  const m=new Map();
  list.forEach(p=>{
    if(!m.has(p.category)) m.set(p.category,new Map());
    const mm=m.get(p.category);
    if(!mm.has(p.name)) mm.set(p.name,[]);
    mm.get(p.name).push(p);
  });
  return m;
}

/* ---------- калькулятор ---------- */

let leadComment='';

async function initCalc(){
  const data = await fetch('products.json').then(r=>r.json());
  const tree = buildTree(data);

  const catSel=$('categorySelect'), matSel=$('materialSelect'),
        fracSel=$('fractionSelect');
  const lenI=$('lengthInput'), widI=$('widthInput'), heiI=$('heightInput');
  const colorInfo=$('colorInfo'), result=$('result'), img=$('preview');

  fillSelect(catSel,[...tree.keys()],'— категория —',rusLabel);

  catSel.onchange = ()=>{
    const mats=[...tree.get(catSel.value).keys()];
    fillSelect(matSel,mats,'— материал —');
    matSel.disabled=false; fracSel.disabled=true; fracSel.innerHTML='';
    reset();
  };

  matSel.onchange = ()=>{
    const fr=[...new Set(tree.get(catSel.value).get(matSel.value).map(v=>v.fraction))];
    fillSelect(fracSel,fr,'— фракция —');
    fracSel.disabled=false; reset();
  };

  [fracSel,lenI,widI,heiI].forEach(el=>el.oninput = update);

  function reset(){
    colorInfo.textContent=''; result.textContent=''; img.src=PLACEHOLDER_IMG;
  }

  function update(){
    const list = tree.get(catSel.value)?.get(matSel.value) || [];
    const prod = list.find(v=>v.fraction===fracSel.value);
    if(!prod){ reset(); return; }

    colorInfo.textContent = `Цвет: ${prod.color}`;

    const vol = (+lenI.value||0)*(+widI.value||0)*(+heiI.value||0);
    const weight = vol*(DENSITY[prod.fraction]||1500);
    const cost   = weight*prod.price;

    const line = `Нужно ${fmt(weight)} кг × ${prod.price} ₽ = ${fmt(cost)} ₽`;
    result.textContent = line;

    leadComment =
      `Категория: ${rusLabel(catSel.value)}\n`+
      `Материал : ${prod.name}\n`+
      `Фракция  : ${prod.fraction}\n`+
      line;

    img.src = prod.image || PLACEHOLDER_IMG;
    img.alt = prod.name;
  }
}

/* ---------- отправка лида ---------- */

async function sendLead(name, phone, email, comment){
  const fields = {
    TITLE: 'Заявка с калькулятора',
    NAME : name,
    PHONE: [{VALUE: phone, VALUE_TYPE:'WORK'}],
    COMMENTS: comment
  };
  if(email) fields.EMAIL = [{VALUE: email, VALUE_TYPE:'WORK'}];

  const res = await fetch(WEBHOOK,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({fields})
  });
  const data = await res.json();
  if(!res.ok || data.error) throw new Error(data.error_description||'Ошибка API');
  return data.result;           // id нового лида
}

/* ---------- обработчик формы ---------- */

$('my-form').addEventListener('submit', async e=>{
  e.preventDefault();

  if(!leadComment){ alert('Сначала выполните расчёт.'); return; }

  const name = $('fioInp').value.trim(),
        tel  = $('telInp').value.trim(),
        mail = $('mailInp').value.trim();

  if(!name || !tel){ alert('Заполните ФИО и телефон'); return; }

  try{
    const id = await sendLead(name,tel,mail,leadComment);
    alert('Заявка #'+id+' успешно создана!');
    e.target.reset();
  }catch(err){
    console.error(err);
    alert('Ошибка отправки: '+err.message);
  }
});

/* ---------- старт ---------- */
initCalc().catch(err=>alert('Ошибка загрузки каталога: '+err));
