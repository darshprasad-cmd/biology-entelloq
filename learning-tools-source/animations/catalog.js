/* Original educational content. Timings correspond to scenes.py, 22 seconds. */
'use strict';
window.EntelloqAnimationCatalog = {
  physics: {
    title: 'Two moves. One displacement.',
    summary: 'Build a resultant vector, then see why distance and displacement differ.',
    scope: 'Two perpendicular displacements in a flat Cartesian plane. Components and lengths are in metres; both axes use the same scale. The example is exact apart from the direction rounded to 53.1°. The animation illustrates geometry, not measured motion.',
    steps: [
      { time: 0, title: 'Components', caption: 'A moves 3 m right. B moves 4 m up.', text: 'Displacement A is 3 metres in the positive x direction: A = (3, 0) m. Displacement B is 4 metres in the positive y direction: B = (0, 4) m. Each grid interval is 1 metre.', alt: 'Blue A points three grid intervals right; teal B points four intervals up from the same origin.' },
      { time: 5, title: 'Head to tail', caption: 'Slide B to the head of A without changing its direction.', text: 'Move the tail of B to the head of A, without rotating or resizing it. Translating a free displacement vector preserves its magnitude and direction.', alt: 'B has moved right to begin at the tip of A. It still points four metres upward.' },
      { time: 10, title: 'The resultant', caption: 'R connects the original start to the endpoint: (3, 4) m.', text: 'The resultant R joins the original start to the final endpoint. Add components: R = A + B = (3 + 0, 0 + 4) m = (3, 4) m.', alt: 'A gold resultant arrow connects the origin to the endpoint at x = 3 m and y = 4 m.' },
      { time: 16, title: 'Magnitude and direction', caption: 'Distance travelled: 7 m. Displacement: 5 m, at 53.1° above +x.', text: 'Because the components are perpendicular, the magnitude is square root of (3 squared plus 4 squared), which is 5 metres. The direction is arctan(4/3), about 53.1 degrees above positive x. Travelling along A then B covers 7 metres, while the displacement magnitude is 5 metres.', alt: 'The completed 3–4–5 triangle contrasts 7 metres of travelled distance with 5 metres of displacement.' }
    ]
  },
  biology: {
    title: 'An enzyme can act again.',
    summary: 'Follow a substrate from binding to release, and keep track of the enzyme.',
    scope: 'A generic one-substrate, one-product catalytic scheme: E + S ⇌ ES → E + P. Shapes and screen durations are symbolic, not atomic geometry, experimental footage, an energy profile or reaction-rate data. The arrow to product is a simplified forward step; not every enzyme has this mechanism.',
    steps: [
      { time: 0, title: 'Binding', caption: 'S binds reversibly at the enzyme’s active site.', text: 'E represents an enzyme and S represents a substrate. The substrate associates with the enzyme at its active site. Binding can be reversible, as the double arrow in E + S ⇌ ES indicates.', alt: 'A gold diamond labelled S approaches and binds in a pocket in the teal enzyme E.' },
      { time: 5, title: 'The ES complex', caption: 'Together they form the enzyme–substrate complex, ES.', text: 'Together they form the enzyme–substrate complex, ES. The active site helps position the substrate for catalysis. The symbols show a relationship; their outlines are not molecular structures.', alt: 'S sits in the active site and the bound pair is labelled ES complex.' },
      { time: 10, title: 'Catalysis', caption: 'Catalysis lowers the activation barrier as S becomes P.', text: 'The enzyme facilitates conversion of substrate S into product P by lowering the activation-energy barrier. The diamond changing into a circle is only a symbol for chemical change. Screen time does not determine a reaction rate.', alt: 'The gold S symbol changes into a blue P symbol while it is associated with the enzyme.' },
      { time: 16, title: 'Release and reuse', caption: 'Product leaves. The enzyme remains available for another cycle.', text: 'Product P is released. Enzyme E remains and is available for another catalytic cycle: it is not consumed by this cycle. This chosen schematic converts one substrate molecule to one product molecule; other enzyme mechanisms can differ.', alt: 'Blue product P leaves the active site; the teal enzyme remains available.' }
    ]
  }
};
