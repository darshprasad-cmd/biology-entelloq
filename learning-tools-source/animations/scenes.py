"""Original Entelloq explanations. Geometry/Text only: no TeX installation.

All positions/timings are authored for explanation. Vector units are metres;
enzyme geometry and screen time carry no molecular scale or rate information.
"""
from manim import *
import numpy as np

BG = "#081426"
PANEL = "#122239"
INK = "#F1F6FF"
MUTED = "#ADC2D9"
BLUE = "#69AEFF"
TEAL = "#52E1C0"
GOLD = "#F2C66D"
FONT = "Segoe UI"


def label(text, size=27, color=INK, weight=NORMAL):
    return Text(text, font=FONT, font_size=size, color=color, weight=weight)


class Explanation(Scene):
    def shell(self, subject, title, kicker, accent):
        self.camera.background_color = BG
        self.add(Line([-6.35, 2.72, 0], [6.35, 2.72, 0], color="#27415F", stroke_width=1))
        self.add(label("ENTELLOQ  /  " + subject.upper(), 17, accent, BOLD).to_corner(UL, buff=.7))
        self.add(label(title, 34, weight=BOLD).move_to([-6.35, 2.2, 0], aligned_edge=LEFT))
        self.add(label(kicker, 19, MUTED).move_to([-6.35, 1.65, 0], aligned_edge=LEFT))
        self.step = label("", 25)
        self.add(label("AUTHORED EXPLANATION  ·  MANIM", 14, MUTED).move_to([-6.35, -3.55, 0], aligned_edge=LEFT))
        self.add(Line([-6.35, -3.15, 0], [6.35, -3.15, 0], color="#27415F", stroke_width=1))

    def detail(self, number, heading, lines, accent):
        block = VGroup(label(number, 18, accent, BOLD), label(heading, 30, INK, BOLD),
                       *[label(line, 23, MUTED) for line in lines]).arrange(DOWN, aligned_edge=LEFT, buff=.25)
        block.move_to([2.0, .25, 0], aligned_edge=LEFT)
        return block


class VectorAddition(Explanation):
    """A=(3,0)m and B=(0,4)m, orthogonal displacements in one plane."""
    def construct(self):
        self.shell("Physics", "Two moves. One displacement.", "Add vectors by joining head to tail.", BLUE)
        origin = np.array([-5.7, -2.35, 0.])
        scale = .65
        p = lambda x, y: origin + np.array([x * scale, y * scale, 0])
        grid = VGroup(*[Line(p(x, 0), p(x, 5), stroke_color="#20364E", stroke_width=1) for x in range(6)],
                      *[Line(p(0, y), p(5, y), stroke_color="#20364E", stroke_width=1) for y in range(6)])
        axes = VGroup(Arrow(p(0, 0), p(5.5, 0), buff=0, color=MUTED, stroke_width=2),
                      Arrow(p(0, 0), p(0, 5.3), buff=0, color=MUTED, stroke_width=2))
        names = VGroup(label("x (m)", 17, MUTED).next_to(p(5.4, 0), DOWN, buff=.15),
                       label("y (m)", 17, MUTED).next_to(p(0, 5.2), LEFT, buff=.15),
                       label("0", 16, MUTED).next_to(p(0, 0), DL, buff=.1))
        self.add(grid, axes, names)
        a = Arrow(p(0, 0), p(3, 0), buff=0, color=BLUE, stroke_width=7)
        b = Arrow(p(0, 0), p(0, 4), buff=0, color=TEAL, stroke_width=7)
        al = label("A = (3, 0) m", 21, BLUE).next_to(a, DOWN, buff=.23)
        bl = label("B = (0, 4) m", 21, TEAL).next_to(b, RIGHT, buff=.2)
        d1 = self.detail("01 / COMPONENTS", "Keep direction.", ["A moves 3 m right.", "B moves 4 m up.", "Each grid interval is 1 m."], BLUE)
        self.play(GrowArrow(a), GrowArrow(b), FadeIn(al), FadeIn(bl), FadeIn(d1), run_time=1.5)
        self.wait(3.5)  # t=5

        ghost = b.copy().set_opacity(.18)
        self.add(ghost)
        d2 = self.detail("02 / HEAD TO TAIL", "Slide, never rotate.", ["Place B at the head of A.", "Its length and direction", "stay the same."], TEAL)
        self.remove(d1)
        self.add(d2)
        self.play(b.animate.shift(RIGHT * 3 * scale), bl.animate.shift(RIGHT * 3 * scale), run_time=2)
        self.wait(3)  # t=10

        r = Arrow(p(0, 0), p(3, 4), buff=0, color=GOLD, stroke_width=7)
        rl = label("R = A + B", 23, GOLD).move_to(p(.8, 3.0))
        d3 = self.detail("03 / RESULTANT", "Start to finish.", ["R joins the original start", "to the final endpoint.", "R = (3, 4) m"], GOLD)
        self.remove(d2)
        self.add(d3)
        self.play(GrowArrow(r), FadeIn(rl), run_time=1.5)
        self.wait(4.5)  # t=16

        d4 = self.detail("04 / CHECK THE SIZE", "A 3–4–5 triangle.", ["|R| = √(3² + 4²) = 5 m", "Direction: 53.1° above +x", "Distance travelled: 7 m", "Displacement magnitude: 5 m"], GOLD)
        # Formula and angle agree with the exact endpoint geometry.
        assert np.allclose(np.array([3, 0]) + np.array([0, 4]), [3, 4])
        assert np.isclose(np.linalg.norm([3, 4]), 5)
        assert round(np.degrees(np.arctan2(4, 3)), 1) == 53.1
        self.remove(d3)
        self.add(d4)
        self.play(Indicate(r, color=GOLD, scale_factor=1.03), run_time=1)
        self.wait(5)  # t=22


class EnzymeCycle(Explanation):
    """Generic single-substrate/single-product scheme; shapes are symbols."""
    def construct(self):
        self.shell("Biology", "An enzyme can act again.", "A schematic cycle: E + S ⇌ ES → E + P", TEAL)
        center = np.array([-3.7, -.65, 0.])
        body = RoundedRectangle(width=3.2, height=2.65, corner_radius=.9, color=TEAL, fill_color="#154C4A", fill_opacity=1, stroke_width=3).move_to(center)
        pocket = Square(side_length=1.0).rotate(PI / 4).move_to(center + UP * 1.25)
        enzyme = Difference(body, pocket, color=TEAL, fill_color="#154C4A", fill_opacity=1, stroke_width=3)
        el = label("E  enzyme", 25, TEAL, BOLD).move_to(center + DOWN * .55)
        substrate = Square(side_length=.72, color=GOLD, fill_color=GOLD, fill_opacity=1).rotate(PI / 4).move_to([-5.75, 1, 0])
        sl = label("S", 23, BG, BOLD).move_to(substrate)
        molecule = VGroup(substrate, sl)
        self.add(enzyme, el, molecule)
        d1 = self.detail("01 / ENCOUNTER", "Substrate binds.", ["S associates with", "the enzyme's active site.", "Binding can be reversible."], TEAL)
        self.add(d1)
        self.wait(1)
        self.play(molecule.animate.move_to(center + UP * 1.25), run_time=2.2)
        self.wait(1.8)  # t=5

        d2 = self.detail("02 / COMPLEX", "Together: ES.", ["The bound enzyme–substrate", "complex enables catalysis.", "This is a symbolic shape," ,"not a molecular structure."], TEAL)
        es = label("ES complex", 24, TEAL, BOLD).move_to([-3.7, -2.55, 0])
        self.remove(d1)
        self.add(d2)
        self.play(FadeIn(es), run_time=1)
        self.wait(4)  # t=10

        product = Circle(radius=.49, color=BLUE, fill_color=BLUE, fill_opacity=1).move_to(substrate)
        pl = label("P", 23, BG, BOLD).move_to(product)
        d3 = self.detail("03 / CATALYSIS", "S becomes P.", ["The enzyme helps the reaction", "by lowering its activation barrier.", "Screen time is illustrative;", "no reaction rate is inferred."], BLUE)
        self.remove(d2)
        self.add(d3)
        self.play(Transform(substrate, product), Transform(sl, pl), FadeOut(es), run_time=1.6)
        self.wait(4.4)  # t=16

        d4 = self.detail("04 / RELEASE", "E is available again.", ["Product P leaves the active site.", "The enzyme is not consumed", "in this catalytic cycle.", "One S → one P in this model."], TEAL)
        self.remove(d3)
        self.add(d4)
        self.play(molecule.animate.move_to([-1.55, 1, 0]), run_time=2)
        self.wait(4)  # t=22
