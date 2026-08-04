# -*- coding: utf-8 -*-
"""
OniVerse GSC Quick Indexing
Buka browser login -> submit sitemap -> selesai
"""
import os, sys, pickle, time

try:
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
except ImportError:
    print("Install dulu: pip install google-auth-oauthlib google-api-python-client")
    sys.exit(1)

SCOPES          = ["https://www.googleapis.com/auth/webmasters"]
CREDS_FILE      = "gsc_credentials.json"
TOKEN_FILE      = "gsc_token.pickle"
SITE_URL        = "sc-domain:oniverse.sbs"
SITEMAP_URL     = "https://oniverse.sbs/sitemap.xml"

def auth():
    creds = None
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "rb") as f:
            creds = pickle.load(f)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            print("\n[AUTH] Browser akan terbuka - login Google kamu lalu izinkan akses\n")
            flow = InstalledAppFlow.from_client_secrets_file(CREDS_FILE, SCOPES)
            # Print URL - user opens in browser manually
            flow.redirect_uri = "urn:ietf:wg:oauth:2.0:oob"
            auth_url, _ = flow.authorization_url(prompt="consent")
            print("\n" + "="*60)
            print("BUKA URL INI DI BROWSER KAMU:")
            print("="*60)
            print(auth_url)
            print("="*60)
            print("\nSetelah login & izinkan, copy kode yang muncul lalu paste di sini:")
            code = input("Paste kode di sini: ").strip()
            flow.fetch_token(code=code)
            creds = flow.credentials
        with open(TOKEN_FILE, "wb") as f:
            pickle.dump(creds, f)
        print("[AUTH] Login berhasil, token tersimpan!\n")
    return creds

def main():
    print("=" * 50)
    print("  OniVerse GSC Sitemap Indexing Tool")
    print("=" * 50)

    if not os.path.exists(CREDS_FILE):
        print(f"ERROR: File '{CREDS_FILE}' tidak ditemukan di {os.getcwd()}")
        sys.exit(1)

    creds   = auth()
    service = build("searchconsole", "v1", credentials=creds)

    # 1. Cek sitemap existing
    print("[1/3] Mengambil daftar sitemap lama...")
    try:
        result   = service.sitemaps().list(siteUrl=SITE_URL).execute()
        existing = result.get("sitemap", [])
        print(f"      Ditemukan {len(existing)} sitemap")
        for sm in existing:
            path = sm.get("path", "")
            print(f"      Hapus: {path}")
            try:
                service.sitemaps().delete(siteUrl=SITE_URL, feedpath=path).execute()
                print(f"      OK terhapus")
            except Exception as e:
                print(f"      Gagal hapus: {e}")
    except Exception as e:
        print(f"      Error: {e}")

    # 2. Submit sitemap baru
    print(f"\n[2/3] Submit sitemap: {SITEMAP_URL}")
    try:
        service.sitemaps().submit(siteUrl=SITE_URL, feedpath=SITEMAP_URL).execute()
        print("      BERHASIL submit!")
    except HttpError as e:
        print(f"      ERROR submit: {e}")
        sys.exit(1)

    # 3. Cek status
    print("\n[3/3] Cek status...")
    time.sleep(3)
    try:
        sm = service.sitemaps().get(siteUrl=SITE_URL, feedpath=SITEMAP_URL).execute()
        print(f"      Path     : {sm.get('path')}")
        print(f"      Download : {sm.get('lastDownloadTime','belum')}")
        print(f"      Errors   : {sm.get('errors','0')}")
        for c in sm.get("contents", []):
            if c.get("type") == "web":
                print(f"      Pages    : {c.get('indexed','?')}")
    except Exception as e:
        print(f"      Error cek status: {e}")

    print("\n" + "=" * 50)
    print("  SELESAI! Sitemap sudah tersubmit ke GSC")
    print("  Cek: https://search.google.com/search-console/sitemaps")
    print("=" * 50)

if __name__ == "__main__":
    main()
