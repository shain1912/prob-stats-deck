"""S12 seaborn 슬라이드용 결과 이미지 생성 (컨셉 A 밝은 배경 / 컨셉 B 어두운 배경).

실행: python 03_deck/tools/make_seaborn.py
출력: 03_deck/assets/img/seaborn_light.png, seaborn_dark.png
슬라이드에 보이는 코드와 같은 난수·같은 호출을 사용.
"""
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns

OUT = Path(__file__).resolve().parents[1] / "assets" / "img"
OUT.mkdir(parents=True, exist_ok=True)

THEMES = {
    "light": dict(bg="#ffffff", ink="#3f3f3f", grid="#ececec", c1="#e32a2c", c2="#2b2b2b"),
    "dark": dict(bg="#0a0d3a", ink="#c9cdf5", grid="#1c2150", c1="#8891f7", c2="#35ed7e"),
}

for name, t in THEMES.items():
    # ---- 슬라이드 코드와 동일 ----
    rng = np.random.default_rng(42)
    x = rng.binomial(n=10, p=0.5, size=1000)
    z = rng.normal(loc=50, scale=15, size=1000)
    # ----------------------------
    sns.set_theme(style="whitegrid", rc={
        "figure.facecolor": t["bg"], "axes.facecolor": t["bg"], "axes.edgecolor": t["grid"],
        "grid.color": t["grid"], "text.color": t["ink"], "axes.labelcolor": t["ink"],
        "xtick.color": t["ink"], "ytick.color": t["ink"], "font.size": 12,
    })
    fig, axes = plt.subplots(1, 2, figsize=(9, 3.6), dpi=160)
    sns.histplot(x, discrete=True, stat="probability", color=t["c1"], edgecolor=t["bg"], ax=axes[0])
    axes[0].set_title("binomial(n=10, p=0.5)  ×1000", color=t["ink"])
    sns.histplot(z, kde=True, stat="density", color=t["c1"], edgecolor=t["bg"], ax=axes[1],
                 line_kws={"linewidth": 2.5})
    axes[1].lines[0].set_color(t["c2"])
    axes[1].set_title("normal(50, 15)  ×1000", color=t["ink"])
    for ax in axes:
        ax.set_ylabel("")
        sns.despine(ax=ax, left=True)
    fig.tight_layout()
    fig.savefig(OUT / f"seaborn_{name}.png", facecolor=t["bg"])
    plt.close(fig)
    print("saved", OUT / f"seaborn_{name}.png")
