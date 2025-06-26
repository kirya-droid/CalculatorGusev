/**************************************************************************
 * Калькулятор  (сокращённая демо-логика – адаптируйте под свои данные)
 **************************************************************************/

let leadComment = '';                         // строка, которую отправим в B24

// --- простой «расчёт» ---
document.getElementById('lengthInput').addEventListener('input', recalc);
document.getElementById('widthInput' ).addEventListener('input', recalc);
document.getElementById('heightInput').addEventListener('input', recalc);

function recalc() {
  const l = +document.getElementById('lengthInput').value || 0;
  const w = +document.getElementById('widthInput' ).value || 0;
  const h = +document.getElementById('heightInput').value || 0;
  const vol   = (l * w * h).toFixed(2);
  const weight = (vol * 1500).toFixed(0);     // демо-плотность
  const cost   = (weight * 10).toFixed(0);    // демо-цена

  leadComment =
      `Объём: ${vol} м³\n` +
      `Масса: ${weight} кг\n` +
      `Стоимость: ${cost} ₽`;

  document.getElementById('result').textContent = leadComment;
}

/**************************************************************************
 * Интеграция с Bitrix24-виджетом
 **************************************************************************/

let bxForm = null;                            // экземпляр формы Bitrix

// событие bitrix-виджета
document.addEventListener('b24:form:init', (e) => {
  bxForm = e.detail.object;
  console.log('B24 готов → поля:', bxForm.getFields().map(f => f.name));
});

// helper: ждём форму максимум N мс
function waitBx(timeout = 7000) {
  return new Promise(res => {
    if (bxForm) return res();
    const t0 = Date.now();
    const id = setInterval(() => {
      if (bxForm || Date.now() - t0 > timeout) {
        clearInterval(id); res();
      }
    }, 200);
  });
}

/**************************************************************************
 * Отправка лида
 **************************************************************************/

document.getElementById('ui-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  // боремся с «форма ещё не подгрузилась»
  await waitBx();
  if (!bxForm) { alert('Ошибка: Bitrix-форма не подгрузилась'); return; }

  // данные пользователя
  const name  = document.getElementById('fioInp' ).value.trim();
  const phone = document.getElementById('telInp' ).value.trim();
  const email = document.getElementById('mailInp').value.trim();

  if (!name || !phone || !leadComment) {
    alert('Заполните ФИО, телефон и выполните расчёт'); return;
  }

  /* --- мэппинг «код_поля → значение» ---
     Откройте dev-консоль: bxForm.getFields() → смотрите name/type    */
  bxForm.setProperty('name',  name);          // текстовое поле «Имя»
  bxForm.setProperty('phone', phone);         // «Телефон»
  if (email) bxForm.setProperty('email', email);
  bxForm.setProperty('text',  leadComment);   // «Комментарий»

  // автоматическая галка согласия (если поле есть)
  const agr = bxForm.getField('agreement');
  if (agr) agr.value = true;

  bxForm.onSuccess(() => {
    alert('✅ Лид отправлен!');
    e.target.reset();
    document.getElementById('result').textContent = '';
    leadComment = '';
  });

  bxForm.onError((err) =>
    console.error('❌ B24 error:', err)
  );

  bxForm.submit();
});
