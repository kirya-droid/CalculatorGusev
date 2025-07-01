/* ------------------------------------------------------------------
   Glass-calculator + Bitrix24 integration
------------------------------------------------------------------ */

/* ---------- справочники ------------------------------------------------ */

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

const DENSITY = {                 // кг/м³
  '70-300 мм': 1400,
  '70-150 мм': 1450,
  '20-70 мм' : 1500,
  '10-50 мм' : 1500,
  '2-10 мм'  : 1600
};

/* ---------- утилиты ---------------------------------------------------- */

const $   = id => document.getElementById(id);
const fmt = n  => n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');   // 1 234 567
const rusLabel = raw => CAT_LABEL[raw.toLowerCase()] || raw;

function fillSelect(sel, keys, placeholder, captionFn = x=>x) {
  sel.innerHTML = `<option disabled selected>${placeholder}</option>`;
  keys.forEach(k=>{
     const o=document.createElement('option');
     o.value=k; o.textContent=captionFn(k); sel.append(o);
  });
}

function buildTree(arr){
  const m=new Map();
  for(const p of arr){
    if(!m.has(p.category)) m.set(p.category,new Map());
    const mm=m.get(p.category);
    if(!mm.has(p.name)) mm.set(p.name,[]);
    mm.get(p.name).push(p);
  }
  return m;
}

/* ---------- основной код калькулятора ---------------------------------- */

let leadComment = '';                             // что уйдёт в B24
const PLACEHOLDER_IMG = 'img/placeholder.jpg';    // добавьте любую картинку

async function main(){
  const data = await fetch('products.json').then(r=>r.json());
  const tree = buildTree(data);

  /* DOM-элементы */
  const catSel=$('categorySelect'), matSel=$('materialSelect'),
        fracSel=$('fractionSelect');
  const lenI=$('lengthInput'), widI=$('widthInput'), heiI=$('heightInput');
  const colorInfo=$('colorInfo'), result=$('result'), img=$('preview');

  /* категории русским языком */
  fillSelect(catSel, [...tree.keys()], '— категория —', rusLabel);

  /* дефолтное изображение */
  img.src = PLACEHOLDER_IMG;
  img.alt = 'Выберите стекло';

  /* выборы в селектах */
  catSel.addEventListener('change', ()=>{
     const mats=[...tree.get(catSel.value).keys()];
     fillSelect(matSel,mats,'— материал —'); matSel.disabled=false;
     fracSel.disabled=true; fracSel.innerHTML=''; reset();
  });

  matSel.addEventListener('change', ()=>{
     const fracs=[...new Set(tree.get(catSel.value).get(matSel.value).map(v=>v.fraction))];
     fillSelect(fracSel,fracs,'— фракция —'); fracSel.disabled=false; reset();
  });

  [fracSel,lenI,widI,heiI].forEach(el=> el.addEventListener('input', update));

  /* вспомогалки */
  function reset(){
    colorInfo.textContent = '';
    result.textContent = '';
    img.src = PLACEHOLDER_IMG;
    img.alt = 'Выберите стекло';
  }

  function update(){
    const prodList = tree.get(catSel.value)?.get(matSel.value) || [];
    const prod = prodList.find(v=>v.fraction === fracSel.value);
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
main().catch(e=>alert('Ошибка загрузки каталога: '+e));

/* ---------- Bitrix24-виджет -------------------------------------------- */

let bxForm=null;                                 // экземпляр формы

document.addEventListener('b24:form:init', e=>{
  bxForm = e.detail.object;
  console.log('Bitrix24 ready');
});

/* дождаться bxForm (max 7 c) */
function waitBx(timeout=7000){
  return new Promise((ok,fail)=>{
    if(bxForm) return ok();
    const t0=Date.now();
    const id=setInterval(()=>{
      if(bxForm){ clearInterval(id); ok(); }
      else if(Date.now()-t0>timeout){ clearInterval(id); fail(); }
    },200);
  });
}

$('ui-form').addEventListener('submit', async ev=>{
  ev.preventDefault();

  if(!leadComment){
    alert('Сначала выполните расчёт.'); return;
  }

  const name = $('fioInp').value.trim(),
        tel  = $('telInp').value.trim(),
        mail = $('mailInp').value.trim();

  if(!name || !tel){
    alert('Заполните ФИО и телефон'); return;
  }

  await waitBx().catch(()=>{alert('Bitrix-форма не загрузилась');});
  if(!bxForm) return;

  /* заполняем поля B24 по названиям */
  const map = { name, phone:tel, email:mail, text:leadComment, comment:leadComment };
  bxForm.getFields().forEach(f=>{
    const code = (f.code||f.name||'').toLowerCase();
    for(const k in map){
      if(code.includes(k) && map[k]) bxForm.setFieldValue(f.name,map[k]);
    }
    if(code.includes('agree')) bxForm.setFieldValue(f.name,'Y');
  });

  /* отправляем и очищаем форму */
  bxForm.submit();
  ev.target.reset();
  alert('Заявка отправлена!');
});
