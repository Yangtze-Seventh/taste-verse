/**
 * AISommelier — React wrapper for the AI 品鉴师 panel.
 *
 * Props:
 *   embedded (bool) — when true, hides own topbar and uses parent container for sizing.
 */
import { useEffect, useRef } from 'react';
import { startSommelier } from './sommelier-engine.js';
import './sommelier.css';

export default function AISommelier({ embedded = false }) {
  const rootRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    // In embedded mode, delay init until the container actually has dimensions
    // (the tab starts hidden with opacity:0 and may have zero rect).
    function tryStart() {
      if (startedRef.current) return;
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return; // still hidden
      // In embedded mode, wait until the parent .view has .active AND main app data is ready.
      // (.view uses opacity:0 so it has full dimensions even when hidden)
      if (embedded) {
        const viewEl = el.closest('.view');
        if (viewEl && !viewEl.classList.contains('active')) return;
        if (!window.__tvCategories) return; // main app hasn't initialized yet
      }
      startedRef.current = true;
      window.__sommelierStarted = true;
      startSommelier({
        embedded,
        container: embedded ? el : null,
      });
    }

    if (!embedded) {
      // Standalone: init immediately
      if (!window.__sommelierStarted) {
        window.__sommelierStarted = true;
        startedRef.current = true;
        startSommelier({ embedded: false, container: null });
      }
      return;
    }

    // Embedded: observe for visibility changes (tab switch adds .active to .view)
    tryStart();
    const observer = new MutationObserver(() => tryStart());
    const viewEl = rootRef.current?.closest('.view');
    if (viewEl) {
      observer.observe(viewEl, { attributes: true, attributeFilter: ['class'] });
    }
    // Also listen for resize as fallback
    const onResize = () => tryStart();
    window.addEventListener('resize', onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      window.__sommelierStarted = false;
      startedRef.current = false;
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`sommelier-root${embedded ? ' sommelier-embedded' : ''}`}
    >
      {!embedded && <div className="topbar" id="topbar"></div>}

      <div className="stage" id="sommelierStage">
        <div className="zone zone-ul" id="zoneUl">
          <canvas id="sC"></canvas>
          <div className="ul-hdr">
            星鉴 · <b>TASTVERSE</b>
          </div>
        </div>
        <div className="lgd" id="lgd"></div>

        <div className="zone zone-mid" id="zoneMid"></div>
        <canvas id="midCanvas"></canvas>
        <div className="page-scroller" id="pageScroller"></div>

        <div className="chat-wrap">
          <div className="atch" id="atch"></div>
          <div className="ciw">
            <button className="atb" id="atbBtn" title="上传图片">📎</button>
            <input className="cin" id="ci" placeholder="描述你的品鉴体验，或上传图片…" />
            <button className="sbtn" id="sb" title="发送">➤</button>
          </div>
          <input type="file" id="fileInput" accept="image/*" multiple style={{ display: 'none' }} />
        </div>

        <div className="zone zone-lr" id="zoneLr">
          <canvas id="srcCanvas"></canvas>
        </div>
        <div className="rh">溯光 · <b>PROVENANCE</b></div>
        <div className="src-tip" id="srcTip"></div>
      </div>

      <div className="page-dots" id="pageDots"></div>
      <div className="tip" id="tip"></div>
      <div className="mo" id="modal">
        <div className="mc" id="mcard"></div>
      </div>
    </div>
  );
}
