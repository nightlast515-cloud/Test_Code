import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            # 1. Launch the page
            await page.goto('http://localhost:8000', timeout=15000)

            # 2. Enter Planning Mode
            await page.locator('#plan-meeting-btn').click()

            # 3. Select cities
            await page.locator('.clock-item[data-timezone="America/New_York"] .select-checkbox').check()
            await page.locator('.clock-item[data-timezone="Europe/London"] .select-checkbox').check()
            await page.locator('.clock-item[data-timezone="Asia/Tokyo"] .select-checkbox').check()

            # 4. Wait for the timeline to render
            await expect(page.locator('.timeline-table')).to_be_visible(timeout=15000) # Increased timeout for 7-day render

            # 5. Verify that there are overlapping hours
            await expect(page.locator('.hour-cell.overlap').first).to_be_visible(timeout=10000)

            # 6. Verify that there is a conflict (holiday)
            await expect(page.locator('.hour-cell.conflict').first).to_be_visible(timeout=10000)

            # 7. Take a screenshot
            await page.screenshot(path='jules-scratch/verification/scheduler.png')

            print("Scheduler verification script completed successfully!")

        except Exception as e:
            print(f"An error occurred during verification: {e}")
            await page.screenshot(path='jules-scratch/verification/error.png')

        finally:
            await browser.close()

if __name__ == '__main__':
    asyncio.run(main())