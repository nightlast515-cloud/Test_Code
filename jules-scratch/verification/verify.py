import os
import re
from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        page = context.new_page()

        file_path = os.path.abspath('worldclock.html')
        page.goto(f'file://{file_path}')

        # --- VERIFY REDESIGN AND MODAL ---

        # 1. Wait for the initial clocks to be rendered in the new list format
        expect(page.locator('.clock-list .clock').first).to_be_visible(timeout=10000)

        # 2. Find the London clock and its holiday button.
        london_clock = page.locator('.clock[data-timezone="Europe/London"]')
        expect(london_clock).to_be_visible()
        holiday_button = london_clock.locator('.holiday-button')
        expect(holiday_button).to_be_enabled()

        # 3. Click the holiday button to reveal the modal.
        holiday_button.click()

        # 4. Expect the modal to become visible and populated.
        modal = page.locator('#holiday-modal')
        expect(modal).not_to_have_class('hidden')

        # Wait for the first 'li' element to be visible in the modal body.
        expect(modal.locator('#modal-body li').first).to_be_visible(timeout=10000)

        # 5. Take a screenshot for visual confirmation.
        page.screenshot(path='jules-scratch/verification/verification.png')

        browser.close()

if __name__ == '__main__':
    run()