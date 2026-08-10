import json
import glob
import os

def audit():
    files = glob.glob('data/detail/*.json')
    empty_img_chaps = 0
    total_chaps = 0
    no_chap_files = 0
    comics_with_empty_chaps = []

    for f in files:
        try:
            d = json.load(open(f, encoding='utf-8'))
            chs = d.get('chapters', [])
            total_chaps += len(chs)
            if len(chs) == 0:
                no_chap_files += 1
                comics_with_empty_chaps.append(os.path.basename(f))
            else:
                for c in chs:
                    imgs = c.get('images', [])
                    if not imgs or len(imgs) == 0:
                        empty_img_chaps += 1
        except Exception as e:
            print("Error loading:", f, e)

    print("==================================================")
    print("  ONIVERSE QUALITY AUDIT RESULTS")
    print("==================================================")
    print(f"Total detail files: {len(files)}")
    print(f"Detail files with 0 chapters: {no_chap_files}")
    print(f"Total chapters across all detail files: {total_chaps}")
    print(f"Chapters without pre-cached image arrays: {empty_img_chaps}")
    if comics_with_empty_chaps:
        print("\nComics with 0 chapters:")
        for name in comics_with_empty_chaps[:20]:
            print(" -", name)

if __name__ == "__main__":
    audit()
