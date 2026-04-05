import os
import time
import base64
from typing import List

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By


BASE_URL = "https://cdn.nba.com/headshots/nba/latest/{size}/{player_id}.png"


def build_headshot_url(player_id: int, size: str = "520x380") -> str:
    return BASE_URL.format(size=size, player_id=player_id)


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def create_driver(headless: bool = True) -> webdriver.Chrome:
    options = Options()

    if headless:
        options.add_argument("--headless=new")

    options.add_argument("--window-size=1400,1000")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--log-level=3")

    options.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    )

    driver = webdriver.Chrome(options=options)

    driver.execute_cdp_cmd(
        "Page.addScriptToEvaluateOnNewDocument",
        {
            "source": """
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            """
        },
    )

    return driver


def save_base64_image(base64_data: str, file_path: str) -> None:
    image_data = base64.b64decode(base64_data)
    with open(file_path, "wb") as f:
        f.write(image_data)


def try_download_via_browser(driver: webdriver.Chrome, player_id: int, save_dir: str, size: str = "520x380") -> bool:
    ensure_dir(save_dir)

    url = build_headshot_url(player_id, size=size)
    file_path = os.path.join(save_dir, f"{player_id}.png")

    try:
        print(f"[浏览器访问] {url}")
        driver.get(url)
        time.sleep(3)

        current_url = driver.current_url
        page_source = driver.page_source.lower()

        if "access denied" in page_source or "forbidden" in page_source:
            print(f"[失败] {player_id} -> 页面被拦截")
            return False

        js = """
        const imgs = document.getElementsByTagName('img');
        if (imgs.length > 0) {
            const img = imgs[0];
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            return canvas.toDataURL('image/png');
        }
        return null;
        """

        data_url = driver.execute_script(js)

        if data_url and data_url.startswith("data:image/png;base64,"):
            base64_data = data_url.split(",", 1)[1]
            save_base64_image(base64_data, file_path)
            print(f"[成功] {player_id} -> {file_path}")
            return True

        png_data = driver.get_screenshot_as_png()
        if png_data and len(png_data) > 0:
            screenshot_path = os.path.join(save_dir, f"{player_id}_page.png")
            with open(screenshot_path, "wb") as f:
                f.write(png_data)
            print(f"[失败] {player_id} -> 没拿到图片元素，已保存页面截图: {screenshot_path}")
            return False

        print(f"[失败] {player_id} -> 未能提取图片")
        return False

    except Exception as e:
        print(f"[异常] {player_id} -> {e}")
        return False


def batch_download(player_ids: List[int], save_dir: str = "nba_headshots", size: str = "520x380", headless: bool = True) -> None:
    success = 0
    failed = 0

    driver = create_driver(headless=headless)

    try:
        for pid in player_ids:
            ok = try_download_via_browser(driver, pid, save_dir, size=size)
            if ok:
                success += 1
            else:
                failed += 1
            time.sleep(1.5)
    finally:
        driver.quit()

    print("\n========== 下载完成 ==========")
    print(f"成功: {success}")
    print(f"失败: {failed}")


if __name__ == "__main__":
    player_ids = [
        1629656,
        203999,
        2544,
        201939,
    ]

    batch_download(
        player_ids=player_ids,
        save_dir="nba_headshots",
        size="520x380",
        headless=False,  # 先设 False，方便你看浏览器是否被拦
    )