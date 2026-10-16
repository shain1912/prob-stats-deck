"""manim 클립: 이항분포 B(n, 1/2) 막대가 n이 커지며 정규곡선에 겹쳐지는 장면 (R01 p.105).

LaTeX 없이 Text만 사용.
렌더 (컨셉별 배경색):
  manim -qm -o binom_light.mp4 03_deck/tools/manim_binom_to_normal.py BinomToNormal
  THEME=dark manim -qm -o binom_dark.mp4 03_deck/tools/manim_binom_to_normal.py BinomToNormal
"""
import math
import os

from manim import (config, Axes, BarChart, Create, FadeIn, FadeOut, Scene, Text, Transform,
                   VGroup, Rectangle, ReplacementTransform, UP, DOWN, LEFT, RIGHT, ORIGIN)

DARK = os.environ.get("THEME") == "dark"
BAR = "#8891F7" if DARK else "#E32A2C"
CURVE = "#35ED7E" if DARK else "#2B2B2B"
INK = "#E9EBFF" if DARK else "#3F3F3F"
AXIS = "#5B62A6" if DARK else "#9A9A9A"
FONT = "Malgun Gothic"
config.background_color = "#0A0D3A" if DARK else "#FFFFFF"


def pmf(n, k, p=0.5):
    return math.comb(n, k) * p ** k * (1 - p) ** (n - k)


class BinomToNormal(Scene):
    def bars(self, ax, n):
        """표준화 축(z) 위에 B(n, 1/2)를 밀도로 그린 막대."""
        m, s = n / 2, math.sqrt(n) / 2
        g = VGroup()
        for k in range(n + 1):
            z0, z1 = (k - 0.5 - m) / s, (k + 0.5 - m) / s
            if z1 < -4 or z0 > 4:
                continue
            h = pmf(n, k) * s  # 밀도 = 확률 / 칸 너비(1/s)
            p0, p1 = ax.c2p(max(z0, -4), 0), ax.c2p(min(z1, 4), h)
            r = Rectangle(width=abs(p1[0] - p0[0]) * 0.92, height=max(abs(p1[1] - p0[1]), 1e-3),
                          fill_color=BAR, fill_opacity=0.9, stroke_width=0)
            r.move_to([(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, 0])
            g.add(r)
        return g

    def construct(self):
        ax = Axes(x_range=[-4, 4, 1], y_range=[0, 0.5, 0.1], x_length=11, y_length=5,
                  axis_config={"color": AXIS, "include_ticks": True}, tips=False).shift(DOWN * 0.4)
        self.play(Create(ax), run_time=0.8)

        label = Text("n = 1", font=FONT, color=INK, font_size=40).to_corner(UP + LEFT)
        bars = self.bars(ax, 1)
        self.play(FadeIn(bars), FadeIn(label))
        for n in [2, 4, 8, 16, 32, 64]:
            nb = self.bars(ax, n)
            nl = Text(f"n = {n}", font=FONT, color=INK, font_size=40).to_corner(UP + LEFT)
            self.play(ReplacementTransform(bars, nb), Transform(label, nl), run_time=0.9)
            bars = nb
            self.wait(0.2)

        curve = ax.plot(lambda z: math.exp(-z * z / 2) / math.sqrt(2 * math.pi), x_range=[-4, 4],
                        color=CURVE, stroke_width=6)
        cap = Text("B(n, p) → N(np, npq)", font=FONT, color=CURVE, font_size=34).to_corner(UP + RIGHT)
        self.play(Create(curve), FadeIn(cap), run_time=1.6)
        self.wait(1.5)
