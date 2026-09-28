/* Shot lists for the 177 s film and the 20 s silent cut. */
(function (G) {
  'use strict';
  const { shot, seg, mount } = G.PAPER;
  const S = G.SCENES;
  const DEFS = '<defs>' +
    '<filter id="ps1" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".22"/></filter>' +
    '<filter id="ps2" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".28"/></filter>' +
    '<filter id="ps3" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#000" flood-opacity=".32"/></filter></defs>';

  function captionBox(text) {
    return `<div class="cap"><span>${text}</span></div>`;
  }

  G.FILM = {
    main() {
      const L = (a, fn) => (t, lt, len) => fn(lt, t);
      shot(0, 8.0, L(0, lt => S.sOpening(lt)));
      shot(8.0, 23.0, L(0, lt => S.sEveryday(lt)));
      shot(23.0, 38.2, L(0, lt => S.sStakes(lt)));
      shot(38.2, 53.2, L(0, lt => S.sHeadfake(lt)));
      shot(53.2, 73.2, L(0, lt => S.sMeet(lt)));
      shot(73.2, 98.3, L(0, lt => S.sAssess(lt)));
      shot(98.3, 123.3, L(0, lt => S.sPlan(lt)));
      shot(123.3, 143.3, L(0, lt => S.sPractice(lt)));
      shot(143.3, 162.3, L(0, lt => S.sWebsite(lt)));
      shot(162.3, 166.9, L(0, lt => S.sOpening(lt, { resolved: true })));
      shot(166.9, 177.0, L(0, lt => S.sBrand(lt)));
      const N = G.NARRATION;
      mount({ id: 'munaza-neck-177s', duration: 177, defs: DEFS, captions: (t) => {
        for (let i = 0; i < N.length; i++) {
          const p = N[i];
          if (i === 0) continue;                 // shown as the opening masked type
          if (p.start >= 166.3) continue;       // the brand finish shows these lines on screen
          const next = N[i + 1] ? N[i + 1].start : 177;
          const end = Math.min(next - 0.05, p.end + 0.6);
          if (t >= p.start - 0.05 && t < end) return captionBox(p.text);
        }
        return '';
      } });
    },
    short() {
      const C = [
        [0.3, 3.0, 'Neck pain interrupting your day?'],
        [7.3, 11.9, 'Start with an individual assessment.'],
        [12.2, 15.9, 'A plan built around your routine.']
      ];
      // the short relies on captions only: drop scene text/labels from the long film
      const bare = fn => (t, lt) => Object.assign({}, fn(t, lt), { ui: '' });
      shot(0, 3.0, bare((t, lt) => S.sOpening(lt + 1.4)));
      shot(3.0, 7.0, (t, lt) => S.sMontage(lt));
      shot(7.0, 9.6, bare((t, lt) => S.sMeet(lt + 7.6 + 4.2)));
      shot(9.6, 12.0, bare((t, lt) => S.sAssess(lt + 10.3)));
      shot(12.0, 14.2, bare((t, lt) => S.sPlan(lt + 6.6)));
      shot(14.2, 16.0, bare((t, lt) => S.sPractice(lt + 16.2)));
      shot(16.0, 20.0, (t, lt) => S.sBrand(lt + 20, { lines: [['Book an assessment', 0, 'font:800 60px/1.1 Inter;color:#FFFFFF'], ['Munaza Physio Studio', 0, 'font:700 40px/1.2 Inter;color:#FAFAFA'], ['munazaphysio.studio', 0, 'font:800 46px/1 Inter;color:#FFFFFF;background:#E7212B;padding:18px 34px;border-radius:999px']] }));
      mount({ id: 'munaza-neck-20s', duration: 20, defs: DEFS, captions: (t) => {
        for (const [a, b, txt] of C) if (t >= a && t < b) return captionBox(txt);
        return '';
      } });
    }
  };
})(window);
