#!/usr/bin/env python
"""Scrape gusevskoe-steklo.ru catalogue and save each fraction as
a separate product in products.json
"""
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


def fetch(url: str) -> BeautifulSoup:
    """GET url and return BS4 soup"""
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "html.parser")


def clean_name(raw: str) -> tuple[str, str]:
    """Split 'Рассветный оранжевый (70‑300 мм)' → ('Рассветный оранжевый', '70‑300 мм')"""
    m = re.match(r"\s*(.+?)\s*\(([^)]+)\)", raw)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return raw.strip(), ""


def parse_variant_page(url: str, visited: set[str]) -> list[dict]:
    """Parse single variant page and recursively parse its siblings (другие фракции)."""
    if url in visited:
        return []
    visited.add(url)

    soup = fetch(url)

    # ---------- общее ----------
    heading    = soup.find("h1").get_text(strip=True)
    name, frac = clean_name(heading)

    price_tag  = soup.select_one(".element-price span[data-price]")
    price      = float(price_tag["data-price"]) if price_tag else 0.0

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

    # ---------- результат текущей страницы ----------
    products = [{
        "name": name,
        "fraction": frac,
        "price": price,
        "color": color,
        "article": article,
        "image": f"{IMG_FOLDER}/{os.path.basename(img_url)}"   # вместо os.path.join
    }]

    # ---------- скачать фото один раз ----------
    if img_url:
        save_image(img_url)

    # ---------- найти кнопки других фракций ----------
    # чаще всего это <a class="size-prop ... href="/catalog/..._70_150/">
    for a in soup.select('a[href*="_"]'):  # подпись «70_150», «20_70» и т.п.
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
    visited_pages: set[str]  = set()
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

    # удалить дубликаты (name + fraction уникальны)
    seen = set()
    unique = []
    for p in all_products:
        key = (p["name"], p["fraction"])
        # Пропускаем мусорные карточки (name или fraction пустые)
        if not p["name"] or not p["fraction"]:
            continue
        if key not in seen:
            seen.add(key)
            unique.append(p)

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(unique, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(unique)} products to {OUT_JSON}")


if __name__ == "__main__":
    scrape_catalog()
