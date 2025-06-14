#!/usr/bin/env python
"""Scrape gusevskoe-steklo.ru and формирует products.json,
где каждая фракция – отдельная запись + поле category."""
from __future__ import annotations

import json
import os
import re
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

BASE_URL   = "https://gusevskoe-steklo.ru"
CATALOG    = f"{BASE_URL}/catalog/"
OUT_JSON   = "products.json"
IMG_FOLDER = "images"

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; GlassBot/1.0)"}

# slug-to-human map (если слуг встречается впервые – просто Capitalize)
SLUG_TO_CAT = {
    "erklyez": "Эрклёз",
    "smalta":  "Смальта",
    "galka":   "Галечник",
    # расширяйте по мере необходимости
}


def fetch(url: str) -> BeautifulSoup:
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "html.parser")


def clean_name(raw: str) -> tuple[str, str]:
    """Сплит «Имя (70-300 мм)» → ('Имя', '70-300 мм')."""
    m = re.match(r"\s*(.+?)\s*\(([^)]+)\)", raw)
    return (m.group(1).strip(), m.group(2).strip()) if m else (raw.strip(), "")


def extract_category(soup: BeautifulSoup, url: str) -> str:
    """Пробует взять категорию из хлебных крошек, fallback – slug."""
    li = soup.select_one('.breadcrumb li:nth-of-type(3) a')
    if li:
        return li.get_text(strip=True)

    parts = urlparse(url).path.strip("/").split("/")
    slug = parts[1] if len(parts) > 2 else ""
    return SLUG_TO_CAT.get(slug, slug.capitalize() or "Без категории")


def parse_variant_page(url: str, visited: set[str]) -> list[dict]:
    if url in visited:
        return []
    visited.add(url)

    soup = fetch(url)

    heading = soup.find("h1").get_text(strip=True)
    name, frac = clean_name(heading)
    category = extract_category(soup, url)

    price_tag = soup.select_one(".element-price span[data-price]")
    price = float(price_tag["data-price"]) if price_tag else 0.0

    article = ""
    art_tag = soup.find(string=lambda s: s and "Артикул" in s)
    if art_tag:
        article = art_tag.split(":", 1)[1].strip()

    color = ""
    for prop in soup.select(".element-prop"):
        t = prop.get_text(" ", strip=True)
        if "Цветовая гамма" in t:
            color = re.split(r"[:—]", t, 1)[-1].strip()

    img_url = ""
    img = soup.find("img", src=lambda s: s and "600_600" in s)
    if img:
        img_url = urljoin(BASE_URL, img["src"])
        save_image(img_url)

    products = [{
        "name": name,
        "category": category,
        "fraction": frac,
        "price": price,
        "color": color,
        "article": article,
        "image": f"{IMG_FOLDER}/{os.path.basename(img_url)}" if img_url else ""
    }]

    # рекурсивно пройти по другим фракциям (ссылки вида …_70_150/)
    for a in soup.select('a[href*="_"]'):
        txt = a.get_text(strip=True)
        if re.search(r"\d", txt) and ("мм" in txt or "-" in txt):
            href = urljoin(BASE_URL, a["href"])
            if urlparse(href).netloc == urlparse(BASE_URL).netloc:
                products.extend(parse_variant_page(href, visited))

    return products


def save_image(url: str) -> None:
    os.makedirs(IMG_FOLDER, exist_ok=True)
    fname = os.path.join(IMG_FOLDER, os.path.basename(url))
    if os.path.exists(fname):
        return
    r = requests.get(url, headers=HEADERS, timeout=30)
    if r.ok:
        with open(fname, "wb") as f:
            f.write(r.content)


def scrape_catalog() -> None:
    all_products: list[dict] = []
    visited_pages: set[str] = set()
    page = 1

    while True:
        url = CATALOG if page == 1 else f"{CATALOG}?PAGEN_1={page}"
        soup = fetch(url)
        cards = soup.select(".catalog-item a[href]")
        if not cards:
            break

        for link in cards:
            prod_url = urljoin(BASE_URL, link["href"])
            all_products.extend(parse_variant_page(prod_url, visited_pages))

        page += 1

    # убрать дубликаты (учитываем категорию)
    seen = set()
    unique = []
    for p in all_products:
        if not (p["name"] and p["fraction"]):
            continue
        key = (p["name"], p["fraction"], p["category"])
        if key not in seen:
            seen.add(key)
            unique.append(p)

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(unique, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(unique)} products to {OUT_JSON}")


if __name__ == "__main__":
    scrape_catalog()
