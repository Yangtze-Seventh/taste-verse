import { useEffect } from 'react';
import './lib/bootstrap.js';
import { startApp } from './lib/tasteverse.js';
import './styles/global.css';
import AISommelier from './sommelier/AISommelier.jsx';

export default function App() {
  useEffect(() => {
    // Run the original imperative app once after DOM mounts.
    if (window.__tvStarted) return;
    window.__tvStarted = true;
    startApp();
  }, []);

  return (
    <>
      {/* Login Screen — visible on cold start; hidden once user authenticates (or on resume from saved session) */}
      <div id="login-screen">
        <canvas id="login-canvas"></canvas>
        <div className="login-card-wrap">
          <div className="login-box">
            <div className="login-logo">味迹</div>
            <div className="login-logo-en">TasteVerse</div>
            <div className="login-sub">味有归处，心有所记</div>
            <div className="login-card">
              <h3 id="login-title">登录 / 注册</h3>
              <div className="input-group">
                <label>邮箱</label>
                <input type="email" id="login-email" placeholder="name@example.com" />
              </div>
              <div className="input-group" id="verify-group" style={{ display: 'none' }}>
                <label>验证码</label>
                <input type="text" id="login-code" placeholder="6 位验证码" />
                <div id="resend-row" style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text3)', textAlign: 'right' }}>
                  <span id="resend-link">重新发送</span>
                </div>
              </div>
              <button className="login-btn" id="login-btn">发送验证码</button>
              <div className="login-msg" id="login-msg"></div>
            </div>
            <div className="login-footer"></div>
          </div>
        </div>
      </div>

      <nav id="main-nav">
        <div className="logo"><div className="logo-dot"></div><span>味迹</span></div>
        <div className="tabs">
          <div className="tab active" data-view="universe-view">品鉴星图</div>
          <div className="tab" data-view="chat-view">AI 品鉴师</div>
          <div className="tab" data-view="categories-view">品类管理</div>
        </div>
        <div className="right">
          <span id="everos-status" title="EverOS 记忆服务" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text3)', marginRight: '8px', cursor: 'help' }}>
            <span id="everos-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#555' }}></span>
            <span id="everos-label">EverOS</span>
          </span>
          <button className="btn-new" id="btn-new-note">+ 新品鉴</button>
          <div className="user-badge" id="user-badge" title="点击退出登录">
            <div className="user-avatar" id="user-avatar"></div>
            <span id="user-email-display"></span>
          </div>
        </div>
      </nav>

      <div className="view active" id="universe-view">
        <div id="graph-container"></div>
        <div className="universe-overlay"><h2>我的味迹</h2><p>每一次品鉴都是一颗星，记忆编织成轨迹</p></div>
        <div className="universe-stats">
          <div className="stat"><div className="val" id="stat-total">0</div><div className="label">品鉴记录</div></div>
          <div className="stat"><div className="val" id="stat-cats">0</div><div className="label">品类</div></div>
          <div className="stat"><div className="val" id="stat-conn">0</div><div className="label">记忆关联</div></div>
        </div>
        <button className="cal-toggle" id="cal-toggle" title="品鉴日历">📅 品鉴日历</button>
        <div className="universe-legend" id="legend"></div>
        <div className="search-float">
          <span className="si">⌕</span>
          <input type="text" id="graph-search" placeholder="搜索品鉴记录..." />
          <div className="search-meta" id="search-meta">输入名称、标签或品类</div>
        </div>
        <button id="btn-recenter" style={{ position: 'absolute', bottom: '20px', right: '240px', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(12,12,22,0.8)', backdropFilter: 'blur(12px)', color: 'var(--accent)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s', animation: 'fadeUp .6s ease .7s both' }} title="回到品鉴数据中心">🎯 回到中心</button>
      </div>

      {/* Calendar Panel */}
      <div className="cal-panel" id="cal-panel">
        <button className="close" id="cal-close">✕</button>
        <div className="cal-header">
          <h3 id="cal-month-label"></h3>
          <div className="cal-nav">
            <button id="cal-prev">‹</button>
            <button id="cal-today-btn" title="回到今天" style={{ fontSize: '10px', width: 'auto', padding: '0 8px' }}>今</button>
            <button id="cal-next">›</button>
          </div>
        </div>
        <div className="cal-weekdays">
          <div className="cal-wd">日</div><div className="cal-wd">一</div><div className="cal-wd">二</div><div className="cal-wd">三</div><div className="cal-wd">四</div><div className="cal-wd">五</div><div className="cal-wd">六</div>
        </div>
        <div className="cal-grid" id="cal-grid"></div>
        <div id="cal-day-detail"></div>
        <div className="cal-mini-graph" id="cal-mini-graph" style={{ display: 'none' }}></div>
      </div>

      <div className="view" id="record-view">
        <div className="record-card">
          <h3>记录新品鉴</h3>
          <div className="input-group"><label>品类</label><select id="rec-cat"></select></div>
          <div className="input-group" id="custom-cat-group" style={{ display: 'none' }}>
            <label>品类图标 & 名称</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" id="rec-custom-icon" placeholder="🍲" style={{ width: '52px', textAlign: 'center', fontSize: '22px' }} maxLength={2} />
              <input type="text" id="rec-custom-cat" placeholder="例：火锅、精酿啤酒..." style={{ flex: 1 }} />
            </div>
          </div>
          <div className="input-group" id="parent-cat-group" style={{ display: 'none' }}>
            <label>所属大类</label>
            <select id="rec-parent-cat"></select>
          </div>
          <div className="input-group">
            <label>名称</label>
            <input type="text" id="rec-name" placeholder="例：耶加雪菲 水洗 浅焙" />
            <div className="dup-hint" id="dup-hint">
              <div className="dup-hint-title">⚠️ 发现相似品鉴记录</div>
              <div id="dup-hint-list"></div>
            </div>
          </div>
          <div className="input-group"><label>品鉴笔记</label><textarea id="rec-notes" placeholder="描述你的感受..."></textarea></div>
          <div className="input-group"><label>评分</label><div className="score-row" id="score-row"></div></div>
          <div className="input-group">
            <label>风味标签</label>
            <div className="tag-row" id="tags-row">
              <input type="text" id="tag-input" placeholder="输入标签回车" style={{ flex: 1, minWidth: '120px', padding: '6px 12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', background: 'var(--surface2)', color: 'var(--text)', fontSize: '11px', outline: 'none', fontFamily: 'inherit' }} />
            </div>
          </div>
          <div className="input-group">
            <label>价格</label>
            <div className="price-wrap">
              <div className="price-mode-toggle" id="price-mode-toggle">
                <span className="price-mode sel" data-mode="unit">单价</span>
                <span className="price-mode" data-mode="avg">人均</span>
              </div>
              <div className="price-inputs">
                <div id="price-unit-group">
                  <input type="number" id="rec-price" placeholder="0.00" min="0" step="0.01" />
                  <span className="price-unit">元</span>
                </div>
                <div id="price-avg-group" style={{ display: 'none' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="number" id="rec-price-total" placeholder="总价" min="0" step="0.01" style={{ flex: 1 }} />
                    <span style={{ color: 'var(--text3)', fontSize: '12px' }}>÷</span>
                    <input type="number" id="rec-price-people" placeholder="人数" min="1" step="1" style={{ width: '68px' }} defaultValue="2" />
                    <span className="price-unit">人</span>
                  </div>
                  <div className="price-avg-result" id="price-avg-result"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="input-group">
            <label>地点 / 门店</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" id="rec-location" placeholder="例：% Arabica 上海武康路店" style={{ flex: 1 }} />
              <button type="button" id="btn-locate" style={{ padding: '8px 12px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.05)', background: 'var(--surface2)', color: 'var(--accent)', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>📍 定位</button>
            </div>
          </div>
          <div className="input-group">
            <label>上传图片</label>
            <div style={{ position: 'relative' }}>
              <input type="file" id="rec-photo" accept="image/*" capture="environment" style={{ width: '100%', padding: '10px 14px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.05)', background: 'var(--surface2)', color: 'var(--text)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }} />
              <div id="photo-preview" style={{ display: 'none', marginTop: '8px', borderRadius: '8px', overflow: 'hidden' }}>
                <img id="photo-img" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', display: 'block' }} />
              </div>
            </div>
          </div>
          <div className="record-actions"><button className="btn-p" id="btn-save" style={{ flex: 2 }}>保存品鉴</button></div>
        </div>
      </div>

      <div className="view" id="chat-view">
        <AISommelier embedded />
      </div>

      <div className="view" id="categories-view">
        <div className="section-header"><h2>品类管理</h2><p>探索你的品鉴版图</p></div>
        <div className="cat-grid" id="cat-grid"></div>
      </div>

      <div className="cat-detail-overlay" id="cat-detail">
        <div className="cat-detail-header">
          <button className="back-btn" id="cat-back">←</button>
          <h3 id="cat-detail-title"></h3>
          <div className="cnt" id="cat-detail-cnt"></div>
        </div>
        <div className="note-list" id="cat-note-list"></div>
      </div>

      <div className="detail-panel" id="detail-panel">
        <button className="close" id="close-detail">×</button>
        <div id="detail-content"></div>
      </div>

      <div className="profile-panel" id="profile-panel">
        <button className="close" id="close-profile">×</button>
        <div id="profile-content"></div>
      </div>

      {/* Modal for edit/delete confirmations */}
      <div className="modal-overlay" id="modal-overlay">
        <div className="modal" id="modal-content"></div>
      </div>
    </>
  );
}
