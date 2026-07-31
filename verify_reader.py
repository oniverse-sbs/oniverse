import json
from playwright.sync_api import sync_playwright

def verify_live_reader():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:8080/', timeout=10000)
        page.wait_for_timeout(2000)
        
        # Click on first comic card
        print("Clicking first comic card...")
        page.click('.comic-card')
        page.wait_for_timeout(1000)
        
        # Click on first chapter
        print("Clicking first chapter...")
        page.click('.chapter-item')
        page.wait_for_timeout(4000)
        
        # Check rendered images count inside reader
        imgs = page.query_selector_all('.reader-page-img')
        print(f"✅ Rendered {len(imgs)} comic chapter page images live!")
        if imgs:
            print("First image src:", imgs[0].get_attribute('src'))
            
        browser.close()

if __name__ == '__main__':
    verify_live_reader()
