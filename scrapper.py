import json
"""Scrape gusevskoe-steklo.ru catalogue and save data to JSON."""

import json
import os
import re
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


BASE_URL = "https://gusevskoe-steklo.ru"
CATALOG_URL = f"{BASE_URL}/catalog/"
OUTPUT_JSON = "products.json"
IMAGES_DIR = "images"


def fetch_page(url: str) -> str:
    """Return HTML content of the given URL."""
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    return response.text


def parse_product_page(url: str) -> dict:
    """Extract product details from its page."""

    soup = BeautifulSoup(fetch_page(url), "html.parser")

    # name and fraction are combined in the heading
    heading = soup.find("h1").get_text(strip=True)
    name, fraction = re.match(r"(.+?)\s*\(([^)]+)\)", heading).groups()

    # price stored in data attribute
    price_tag = soup.select_one(".element-price span[data-price]")
    price = float(price_tag["data-price"]) if price_tag else 0.0

    # colour is one of the element properties
    color = ""
    for prop in soup.select(".element-prop"):
        text = prop.get_text(" ", strip=True)
        if "Цветовая гамма" in text:
            color = text.split("—")[-1].strip()
            break

    # article number
    article = ""
    art = soup.find(string=lambda s: s and "Артикул:" in s)
    if art:
        article = art.split(":", 1)[1].strip()

    # image (first large preview)
    img = soup.find("img", src=lambda s: s and "600_600" in s)
    image_url = urljoin(BASE_URL, img["src"]) if img else ""

    return {
        "name": name,
        "article": article,
        "price": price,
        "fraction": fraction,
        "color": color,
        "image": os.path.join(IMAGES_DIR, os.path.basename(image_url)),
    }, image_url

def scrape_catalog() -> None:
    """Iterate through catalogue pages and collect all products."""

    products = []
    page = 1
    while True:
        url = CATALOG_URL if page == 1 else f"{CATALOG_URL}?PAGEN_1={page}"
        soup = BeautifulSoup(fetch_page(url), "html.parser")
        cards = soup.select(".catalog-item")
        if not cards:
            break

        for card in cards:
            link = card.select_one("a[href]")
            if not link:
                continue
            product, image_url = parse_product_page(urljoin(BASE_URL, link["href"]))
            products.append(product)
            if image_url:
                download_image(image_url)

        page += 1

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)


def download_image(url):
    if not os.path.isdir(IMAGES_DIR):
        os.makedirs(IMAGES_DIR)
    filename = os.path.join(IMAGES_DIR, os.path.basename(url))
    if os.path.exists(filename):
        return
    resp = requests.get(url)
    if resp.status_code == 200:
        with open(filename, 'wb') as f:
            f.write(resp.content)


if __name__ == '__main__':
    scrape_catalog()