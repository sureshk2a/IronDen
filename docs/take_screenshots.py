"""
IronDen — Screenshot automation using Firefox headless (Playwright).
Captures all 9 docs/screenshots/*.png at 430 × (content height) px.
"""

import time
from pathlib import Path
from playwright.sync_api import sync_playwright, Page, BrowserContext

OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(exist_ok=True)

URL   = "http://192.168.1.14"
USER  = "sureshk2a"
PASS  = "Sureshbz@321"
W     = 430

# ── helpers ──────────────────────────────────────────────────────────────────

def shoot(page: Page, path: str) -> None:
    """Wait for network idle, then screenshot at full content height."""
    page.wait_for_load_state("networkidle", timeout=10_000)
    time.sleep(0.4)
    h = page.evaluate("() => document.documentElement.scrollHeight")
    h = max(932, h)
    page.set_viewport_size({"width": W, "height": h})
    time.sleep(0.3)
    page.screenshot(path=path)
    print(f"  ✓  {Path(path).name}  ({W}×{h})")


def login(page: Page) -> None:
    """Complete Keycloak login if redirected to the login page."""
    page.wait_for_load_state("domcontentloaded")
    if "keycloak" in page.url or "realms" in page.url or "login" in page.url.lower():
        page.fill('input[name="username"]', USER)
        page.fill('input[name="password"]', PASS)
        page.click('input[type="submit"], button[type="submit"]')
        page.wait_for_load_state("networkidle", timeout=15_000)


def goto(page: Page, path: str) -> None:
    page.goto(f"{URL}{path}", wait_until="domcontentloaded", timeout=20_000)
    # Handle Keycloak auth redirects — the SDK may trigger 1-2 flows
    for _ in range(5):
        url = page.url
        if url.startswith(URL) and "realms" not in url:
            break
        if "realms" in url or "keycloak" in url or "login" in url.lower():
            page.wait_for_load_state("domcontentloaded")
            page.fill('input[name="username"]', USER)
            page.fill('input[name="password"]', PASS)
            page.click('input[type="submit"], button[type="submit"]')
            page.wait_for_load_state("networkidle", timeout=15_000)
            time.sleep(0.3)
        else:
            time.sleep(0.5)
    page.wait_for_load_state("networkidle", timeout=10_000)


def set_theme(page: Page, theme: str) -> None:
    """Set data-theme attribute and localStorage."""
    page.evaluate(f"""() => {{
        document.documentElement.setAttribute('data-theme', '{theme}');
        localStorage.setItem('theme', '{theme}');
    }}""")
    time.sleep(0.25)


# ── main ─────────────────────────────────────────────────────────────────────

def run() -> None:
    with sync_playwright() as pw:
        browser = pw.firefox.launch(headless=True)
        ctx: BrowserContext = browser.new_context(
            viewport={"width": W, "height": 932},
            device_scale_factor=1,
        )
        page = ctx.new_page()

        # ── 1. Login once ────────────────────────────────────────────────────
        print("Logging in…")
        goto(page, "/dashboard")
        print("  Logged in ✓")

        # ── 2. Dashboard – dark ──────────────────────────────────────────────
        print("dashboard-dark.png")
        set_theme(page, "dark")
        shoot(page, str(OUT / "dashboard-dark.png"))

        # ── 3. Dashboard – light (stay on same page, just change theme) ──────
        print("dashboard-light.png")
        set_theme(page, "light")
        shoot(page, str(OUT / "dashboard-light.png"))

        # ── 4. Dashboard – all time ──────────────────────────────────────────
        # Keycloak SDK may have triggered background re-auth; handle it first
        print("dashboard-alltime.png")
        print(f"  URL before alltime: {page.url}")
        if "realms" in page.url or "keycloak" in page.url:
            print("  Re-login triggered by Keycloak SDK, completing…")
            page.wait_for_load_state("domcontentloaded")
            page.fill('input[name="username"]', USER)
            page.fill('input[name="password"]', PASS)
            page.click('input[type="submit"], button[type="submit"]')
            page.wait_for_load_state("networkidle", timeout=15_000)
            time.sleep(0.5)
        set_theme(page, "dark")
        page.wait_for_selector("button:has-text('All Time')", timeout=10_000)
        page.locator("button:has-text('All Time')").click()
        page.wait_for_load_state("networkidle", timeout=8_000)
        shoot(page, str(OUT / "dashboard-alltime.png"))

        # ── 5. Workout plan ──────────────────────────────────────────────────
        print("workout-plan.png")
        goto(page, "/workout")
        shoot(page, str(OUT / "workout-plan.png"))

        # ── 6. Workout expanded ──────────────────────────────────────────────
        print("workout-expanded.png")
        # Expand the first exercise card in the selected workout day
        page.locator(".ex-card-header").first.click()
        time.sleep(0.4)
        shoot(page, str(OUT / "workout-expanded.png"))

        # ── 7. Equipment page ────────────────────────────────────────────────
        print("equipment.png")
        goto(page, "/equipment")
        shoot(page, str(OUT / "equipment.png"))

        # ── 8. Equipment – AI thinking ───────────────────────────────────────
        print("equipment-ai-thinking.png")
        # Mock AI route to hang so we can screenshot the loading state
        ai_pending = []

        def hang_ai(route):
            ai_pending.append(route)   # store but don't resolve

        page.route("**/api/ai/workout-swap", hang_ai)

        # Remove any Barbell already in the list
        barbell = page.locator(".equipment-item").filter(has_text="Barbell")
        for _ in range(barbell.count()):
            barbell.locator(".equipment-del").first.click()
            time.sleep(0.4)

        # Type in the add-equipment input and click "Barbell" suggestion
        page.fill('input[placeholder*="Barbell"]', "bar")
        time.sleep(0.5)
        page.locator(".eq-suggestion-item").filter(has_text="Barbell").first.click()

        # Wait until the ai-thinking dots appear
        page.wait_for_selector(".ai-thinking", timeout=8_000)
        time.sleep(0.4)
        shoot(page, str(OUT / "equipment-ai-thinking.png"))

        # Abort the pending request so the error handler clears swapLoading
        for r in ai_pending:
            try:
                r.abort()
            except Exception:
                pass
        page.unroute("**/api/ai/workout-swap")
        time.sleep(0.5)

        # ── 9. Equipment – AI swap modal ─────────────────────────────────────
        print("equipment-ai-swap.png")
        goto(page, "/equipment")

        # Remove Barbell if it was added in the previous step
        barbell = page.locator(".equipment-item").filter(has_text="Barbell")
        if barbell.count() > 0:
            barbell.locator(".equipment-del").click()
            time.sleep(0.5)

        # Mock AI route to return immediately with a swap suggestion
        page.route(
            "**/api/ai/workout-swap",
            lambda route: route.fulfill(
                status=200,
                content_type="application/json",
                body='{"swaps":[{"day_number":1,"day_name":"Mon \u2014 Push: Chest / Shoulders / Triceps",'
                     '"remove_exercise":"DB Chest Fly",'
                     '"reason":"Barbell Bench Press builds far more chest mass with heavier compound loading.",'
                     '"add_exercise":{"name":"Barbell Bench Press","target":"Chest",'
                     '"sets_default":4,"reps_min":6,"reps_max":8,"is_time_based":false,'
                     '"rest_seconds":90,"weight_start":"Start at 40 kg","weight_step":"+2.5 kg per 2 weeks",'
                     '"tip":"Tuck elbows 45\u00b0, full range of motion.","met_value":5.0,'
                     '"required_equipment":["barbell"],"exercise_type":"strength"}}]}',
            ),
        )

        page.fill('input[placeholder*="Barbell"]', "bar")
        time.sleep(0.5)
        page.locator(".eq-suggestion-item").filter(has_text="Barbell").first.click()
        page.wait_for_selector(".swap-modal-overlay", timeout=8_000)
        time.sleep(0.3)
        shoot(page, str(OUT / "equipment-ai-swap.png"))

        page.unroute("**/api/ai/workout-swap")

        # ── 10. Profile ──────────────────────────────────────────────────────
        print("profile.png")
        goto(page, "/profile")
        shoot(page, str(OUT / "profile.png"))

        browser.close()
        print("\nAll screenshots saved to", OUT)


if __name__ == "__main__":
    run()
