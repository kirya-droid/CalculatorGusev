async function loadProducts() {
  const response = await fetch('products.json');
  return response.json();
}

function groupBy(items, key) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item[key])) map.set(item[key], []);
    map.get(item[key]).push(item);
  }
  return map;
}

function populateSelect(select, options) {
  select.innerHTML = '';
  for (const option of options) {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    select.appendChild(opt);
  }
}

function initCalculator(data) {
  const materialSelect = document.getElementById('materialSelect');
  const fractionSelect = document.getElementById('fractionSelect');
  const colorSelect = document.getElementById('colorSelect');
  const lengthInput = document.getElementById('lengthInput');
  const widthInput = document.getElementById('widthInput');
  const heightInput = document.getElementById('heightInput');
  const resultDiv = document.getElementById('result');
  const preview = document.getElementById('preview');

  const materials = groupBy(data, 'name');
  populateSelect(materialSelect, Array.from(materials.keys()));

  function updateFractions() {
    const material = materials.get(materialSelect.value) || [];
    const fractions = [...new Set(material.map(p => p.fraction))];
    populateSelect(fractionSelect, fractions);
    updateColors();
  }

  function updateColors() {
    const material = materials.get(materialSelect.value) || [];
    const colors = material.filter(p => p.fraction === fractionSelect.value)
                           .map(p => p.color);
    populateSelect(colorSelect, colors);
    updateResult();
  }

  function getDensity(frac) {
    const densities = {
      '70-300': 1400,
      '70-150': 1450,
      '20-70': 1500,
      '10-50 мм': 1500,
      '2-10 мм': 1600
    };
    return densities[frac] || 1500;
  }

  function updateResult() {
    const material = materials.get(materialSelect.value) || [];
    const product = material.find(p => p.fraction === fractionSelect.value && p.color === colorSelect.value);
    if (product) {
      const length = parseFloat(lengthInput.value) || 0;
      const width = parseFloat(widthInput.value) || 0;
      const height = parseFloat(heightInput.value) || 0;
      const volume = length * width * height;
      const weight = volume * getDensity(product.fraction);
      const cost = weight * product.price;
      resultDiv.textContent = `Нужно ${weight.toFixed(2)} кг. Цена: ${cost.toFixed(2)} руб.`;
      preview.src = product.image;
    }
  }

  materialSelect.addEventListener('change', updateFractions);
  fractionSelect.addEventListener('change', updateColors);
  colorSelect.addEventListener('change', updateResult);
  lengthInput.addEventListener('input', updateResult);
  widthInput.addEventListener('input', updateResult);
  heightInput.addEventListener('input', updateResult);

  updateFractions();
}

loadProducts().then(initCalculator);