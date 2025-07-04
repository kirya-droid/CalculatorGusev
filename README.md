# Калькулятор стекла

Небольшой одностраничный калькулятор для подбора декоративного стекла с сайта «Гусевское стекло». Страница работает на чистом HTML/JavaScript и загружает сведения о продукции из файла `products.json`.

## Состав проекта
- `index.html` — интерфейс с формой выбора материала, фракции и цвета.
- `script.js` — логика расчёта и загрузки данных.
- `styles.css` — минимальные стили оформления.
- `products.json` — список товаров, полученный скриптом `scrapper.py`.
- `images/` — фотографии из каталога.
- `scrapper.py` — парсер каталога gusevskoe-steklo.ru для обновления `products.json` и изображений.
- `autostart.bat` — пример запуска локального сервера для Windows.

## Запуск
Файлы необходимо открыть через HTTP, так как `script.js` загружает JSON. Проще всего воспользоваться встроенным сервером Python:

```bash
python -m http.server 8000
