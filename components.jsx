// ============================================
// Moving sale — reusable components
// ============================================

const { useState, useEffect, useMemo, useRef } = React;

// ---- helpers ----
function money(n) {
  if (n == null || isNaN(n)) return '';
  return '$' + n.toFixed(2).replace(/\.00$/, '');
}
function categoryLabel(c) {
  return c.charAt(0).toUpperCase() + c.slice(1);
}
function statusLabel(s) {
  if (s === 'available now') return 'Available now';
  if (s === 'available after Jun 15') return 'After Jun 15';
  if (s === 'reserved') return 'Reserved';
  if (s === 'sold') return 'Sold';
  return s;
}
function statusClass(s) {
  if (s === 'available now') return 'now';
  if (s === 'available after Jun 15') return 'later';
  if (s === 'reserved') return 'reserved';
  if (s === 'sold') return 'sold';
  return '';
}

// Privacy-formatted name: "Sarah Bennett" → "Sarah B.", "Madonna" → "Madonna"
function publicName(fullName) {
  if (!fullName) return 'Anonymous';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return parts[0] + ' ' + parts[1][0].toUpperCase() + '.';
}

// Friendly relative-time formatter
function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.round(hr / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w} wk ago`;
  return new Date(iso).toLocaleDateString();
}

// ============================================
// Email send via FormSubmit (no backend / no signup)
// First request from this URL triggers an activation email
// to the primary recipient — they click the link, and after
// that every submission is delivered automatically.
// ============================================
const SELLER_EMAILS = ['guilhermerosso.m@gmail.com', 'maylanaspricigo@gmail.com'];

async function sendReservationEmail(payload) {
  const [primary, ...rest] = SELLER_EMAILS;
  const body = {
    _subject: `Moving sale reservation — ${payload.contact.name}`,
    _cc: rest.join(','),
    _replyto: payload.contact.email || '',
    _template: 'table',
    _captcha: 'false',
    Name: payload.contact.name,
    Email: payload.contact.email || '—',
    WhatsApp: payload.contact.whatsapp || '—',
    Pickup_preference: payload.contact.pickup || '—',
    Notes: payload.contact.notes || '—',
    Items: payload.items.map((i) =>
    `• ${i.name} (${i.category}) — ${money(i.finalPrice)} · ${statusLabel(i.status)}`
    ).join('\n'),
    Item_count: payload.items.length,
    Total: money(payload.total),
    Original_total: money(payload.originalTotal),
    Savings: money(payload.originalTotal - payload.total),
    Submitted_at: new Date().toLocaleString()
  };
  try {
    const res = await fetch(
      'https://formsubmit.co/ajax/' + encodeURIComponent(primary),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && (data.success === 'true' || data.success === true || !data.message);
    return { ok, data };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}

// ============================================
// Header
// ============================================
function Header({ location }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand">
          <span className="brand-mark">moving sale</span>
        </div>
      </div>
    </header>);

}

// ============================================
// Floating reservation button
// ============================================
function FloatingCart({ count, total, onClick }) {
  const visible = count > 0;
  return (
    <button
      className={'floating-cart' + (visible ? ' visible' : '')}
      onClick={onClick}
      aria-label={`Open reservation, ${count} items, total ${money(total)}`}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}>
      
      <span className="fc-icon" aria-hidden="true">
        <svg viewBox="0 0 20 20" width="16" height="16">
          <path d="M3 4.5h2l1.5 9.5h10l1.5-7h-11" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="8" cy="17" r="1.2" fill="currentColor" />
          <circle cx="15" cy="17" r="1.2" fill="currentColor" />
        </svg>
      </span>
      <span className="fc-text">
        <span className="fc-label">Reservation</span>
        <span className="fc-meta">{count} {count === 1 ? 'item' : 'items'} · {money(total)}</span>
      </span>
      <span className="fc-arrow" aria-hidden="true">→</span>
    </button>);

}

// ============================================
// Hero
// ============================================
function Hero({ stats }) {
  return (
    <section className="hero">
      <h1 style={{ maxWidth: "767px", fontSize: "clamp(40px, 10.5vw, 98px)", lineHeight: 1 }}>
        We're moving out, <em style={{ fontSize: "inherit" }}>everything is for sale</em>
      </h1>
      <p className="hero-lede">Add items below, confirm reservation, pick it up close to Harvard Yard</p>
      <div className="hero-meta">
        <div className="hero-meta-item">
          <div className="hero-meta-label">Available</div>
          <div className="hero-meta-value"><strong>{stats.total}</strong> items across {stats.categories} categories</div>
        </div>
        <div className="hero-meta-item" style={{ padding: "18px 24px 18px 18px" }}>
          <div className="hero-meta-label">Pickup</div>
          <div className="hero-meta-value">12 Ware Street, Cambridge, MA<br /><span style={{ color: 'var(--muted)', fontSize: '13px' }}>Full address after reservation · Parking available</span></div>
        </div>
        <div className="hero-meta-item" style={{ padding: "18px 24px 18px 18px" }}>
          <div className="hero-meta-label">Payment</div>
          <div className="hero-meta-value">At pickup — <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Zelle or cash accepted</span></div>
        </div>
      </div>
    </section>);

}

// ============================================
// Filters / sort
// ============================================
function Filters({
  categories, activeCategory, onCategoryChange,
  sort, onSortChange,
  layout, onLayoutChange,
  showSold, onShowSoldChange,
  hasReservations, onReset,
  resultsCount
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  // Lock body scroll while sheet is open
  useEffect(() => {
    if (sheetOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [sheetOpen]);

  // Count "non-default" filter choices for the badge
  const activeCount =
    (activeCategory !== 'all' ? 1 : 0) +
    (sort !== 'featured' ? 1 : 0) +
    (layout !== 'grid' ? 1 : 0) +
    (!showSold ? 1 : 0);

  const sortLabel = ({
    'featured': 'Featured',
    'price-asc': 'Price: low → high',
    'price-desc': 'Price: high → low',
    'discount-desc': 'Biggest discount',
    'name-asc': 'Name: A → Z'
  })[sort] || sort;

  return (
    <div className="filters">
      <div className="filters-inner filters-desktop">
        <div className="filter-row">
          <span className="filter-label">Category</span>
          <button
            className={'chip' + (activeCategory === 'all' ? ' active' : '')}
            onClick={() => onCategoryChange('all')}>
            
            <span>All</span>
            <span className="count">{categories.reduce((a, c) => a + c.count, 0)}</span>
          </button>
          {categories.map((c) =>
          <button
            key={c.id}
            className={'chip' + (activeCategory === c.id ? ' active' : '')}
            onClick={() => onCategoryChange(c.id)}>
            
              <span>{categoryLabel(c.id)}</span>
              <span className="count">{c.count}</span>
            </button>
          )}
        </div>

        <div className="filter-row controls-row">
          <span className="filter-label">Sort</span>
          <div className="sort-select">
            <select value={sort} onChange={(e) => onSortChange(e.target.value)}>
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low → high</option>
              <option value="price-desc">Price: high → low</option>
              <option value="discount-desc">Biggest discount</option>
              <option value="name-asc">Name: A → Z</option>
            </select>
          </div>

          <span className="filter-divider" aria-hidden="true"></span>

          <span className="filter-label">Layout</span>
          <div className="seg" role="radiogroup" aria-label="Layout">
            <button
              role="radio"
              aria-checked={layout === 'grid'}
              className={'seg-btn' + (layout === 'grid' ? ' active' : '')}
              onClick={() => onLayoutChange('grid')}
              title="Grid view">
              
              <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
                <rect x="1.5" y="1.5" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <rect x="9.5" y="1.5" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <rect x="1.5" y="9.5" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <rect x="9.5" y="9.5" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              <span>Grid</span>
            </button>
            <button
              role="radio"
              aria-checked={layout === 'list'}
              className={'seg-btn' + (layout === 'list' ? ' active' : '')}
              onClick={() => onLayoutChange('list')}
              title="List view">
              
              <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
                <rect x="1.5" y="2" width="13" height="2.2" fill="currentColor" />
                <rect x="1.5" y="6.9" width="13" height="2.2" fill="currentColor" />
                <rect x="1.5" y="11.8" width="13" height="2.2" fill="currentColor" />
              </svg>
              <span>List</span>
            </button>
          </div>

          <span className="filter-divider" aria-hidden="true"></span>

          <label className="inline-toggle">
            <input
              type="checkbox"
              checked={showSold}
              onChange={(e) => onShowSoldChange(e.target.checked)} />
            
            <span className="inline-toggle-box" aria-hidden="true">
              <svg viewBox="0 0 12 12" width="9" height="9"><path d="M2 6.5L5 9.5L10.5 3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span>Show sold</span>
          </label>

          <div style={{ flex: 1 }}></div>
        </div>
      </div>

      {/* Mobile — compact bar with trigger */}
      <div className="filters-mobile-bar">
        <button className="mobile-filter-trigger" onClick={() => setSheetOpen(true)} aria-label="Open filters">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M1.5 3.5h13M3.5 8h9M6 12.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
          <span>Filters</span>
          {activeCount > 0 && <span className="mobile-filter-badge">{activeCount}</span>}
        </button>
        <div className="mobile-filter-summary">
          <span className="mobile-filter-summary-piece">
            <span className="muted">Cat:</span> {activeCategory === 'all' ? 'All' : categoryLabel(activeCategory)}
          </span>
          <span className="mobile-filter-summary-sep">·</span>
          <span className="mobile-filter-summary-piece">
            <span className="muted">Sort:</span> {sortLabel}
          </span>
        </div>
      </div>

      {sheetOpen && (
        <MobileFilterSheet
          onClose={() => setSheetOpen(false)}
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={onCategoryChange}
          sort={sort}
          onSortChange={onSortChange}
          layout={layout}
          onLayoutChange={onLayoutChange}
          showSold={showSold}
          onShowSoldChange={onShowSoldChange}
          hasReservations={hasReservations}
          onReset={onReset}
          resultsCount={resultsCount}
        />
      )}
    </div>);

}

// ============================================
// Mobile filter sheet — slides up from bottom
// ============================================
function MobileFilterSheet({
  onClose,
  categories, activeCategory, onCategoryChange,
  sort, onSortChange,
  layout, onLayoutChange,
  showSold, onShowSoldChange,
  hasReservations, onReset,
  resultsCount
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      className={'mfs-backdrop' + (mounted ? ' visible' : '')}
      onClick={onClose}
    >
      <div className={'mfs-panel' + (mounted ? ' visible' : '')} onClick={e => e.stopPropagation()}>
        <div className="mfs-handle" aria-hidden="true"></div>
        <div className="mfs-head">
          <h3>Filters & sort</h3>
          <button className="mfs-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="mfs-body">
          <section className="mfs-section">
            <h4>Category</h4>
            <div className="mfs-chips">
              <button
                className={'chip' + (activeCategory === 'all' ? ' active' : '')}
                onClick={() => onCategoryChange('all')}
              >
                <span>All</span>
                <span className="count">{categories.reduce((a, c) => a + c.count, 0)}</span>
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  className={'chip' + (activeCategory === c.id ? ' active' : '')}
                  onClick={() => onCategoryChange(c.id)}
                >
                  <span>{categoryLabel(c.id)}</span>
                  <span className="count">{c.count}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="mfs-section">
            <h4>Sort by</h4>
            <div className="mfs-options">
              {[
                ['featured', 'Featured'],
                ['price-asc', 'Price: low → high'],
                ['price-desc', 'Price: high → low'],
                ['discount-desc', 'Biggest discount'],
                ['name-asc', 'Name: A → Z']
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={'mfs-option' + (sort === value ? ' active' : '')}
                  onClick={() => onSortChange(value)}
                >
                  <span>{label}</span>
                  {sort === value && (
                    <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
                      <path d="M3 7.5L6 10.5L11 4.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section className="mfs-section">
            <h4>Layout</h4>
            <div className="seg mfs-seg" role="radiogroup">
              <button
                className={'seg-btn' + (layout === 'grid' ? ' active' : '')}
                onClick={() => onLayoutChange('grid')}
              >
                <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
                  <rect x="1.5" y="1.5" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.4"/>
                  <rect x="9.5" y="1.5" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.4"/>
                  <rect x="1.5" y="9.5" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.4"/>
                  <rect x="9.5" y="9.5" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.4"/>
                </svg>
                <span>Grid</span>
              </button>
              <button
                className={'seg-btn' + (layout === 'list' ? ' active' : '')}
                onClick={() => onLayoutChange('list')}
              >
                <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
                  <rect x="1.5" y="2" width="13" height="2.2" fill="currentColor"/>
                  <rect x="1.5" y="6.9" width="13" height="2.2" fill="currentColor"/>
                  <rect x="1.5" y="11.8" width="13" height="2.2" fill="currentColor"/>
                </svg>
                <span>List</span>
              </button>
            </div>
          </section>

          <section className="mfs-section">
            <label className="inline-toggle mfs-toggle-row">
              <input
                type="checkbox"
                checked={showSold}
                onChange={e => onShowSoldChange(e.target.checked)}
              />
              <span className="inline-toggle-box" aria-hidden="true">
                <svg viewBox="0 0 12 12" width="9" height="9"><path d="M2 6.5L5 9.5L10.5 3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <span>Show sold items</span>
            </label>
          </section>

        </div>

        <div className="mfs-foot">
          <button className="btn primary large full" onClick={onClose}>
            Show {resultsCount} {resultsCount === 1 ? 'item' : 'items'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================
// Product card
// ============================================
function ProductCard({ item, inCart, onAdd, onRemove, onSelect, interestCount }) {
  const isUnavailable = item.status === 'sold';
  const isReserved = item.status === 'reserved';
  const canReserve = !isUnavailable;

  // Discount as integer (strip the % if string)
  const discountNum = typeof item.discount === 'string' ?
  parseInt(item.discount.replace('%', ''), 10) :
  item.discount;

  return (
    <article className={'card' + (isUnavailable ? ' unavailable' : '') + (isReserved ? ' reserved' : '')}>
      <button
        type="button"
        className="card-image card-image-button"
        onClick={onSelect}
        aria-label={`View details for ${item.name}`}
      >
        {item.image ? (
          <img
            src={encodeURI(item.image)}
            alt={item.name}
            className="card-image-photo"
            loading="lazy"
          />
        ) : (
          <div className="card-image-placeholder">
            <span>{item.name}<br />photo</span>
          </div>
        )}
        <div className={'card-status-badge ' + statusClass(item.status)}>
          <span className="dot"></span>
          <span>{statusLabel(item.status)}</span>
        </div>
        {discountNum > 0 &&
          <div className="card-discount-badge">−{discountNum}%</div>
        }
        {interestCount > 0 && (
          <div className="card-interest-badge" title={`${interestCount} ${interestCount === 1 ? 'person' : 'people'} interested`}>
            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
              <path d="M6 10.5C6 10.5 1.5 7.5 1.5 4.5C1.5 3 2.5 2 4 2C4.9 2 5.6 2.5 6 3.2C6.4 2.5 7.1 2 8 2C9.5 2 10.5 3 10.5 4.5C10.5 7.5 6 10.5 6 10.5Z" fill="currentColor"/>
            </svg>
            <span>{interestCount}</span>
          </div>
        )}
      </button>
      <div className="card-body">
        <div className="card-category">
          <span>{item.category}</span>
        </div>
        <h3 className="card-name">
          <button
            type="button"
            className="card-name-text"
            onClick={onSelect}
          >
            {item.name}
          </button>
          {item.originalLink &&
          <a
            className="card-name-link"
            href={item.originalLink}
            target="_blank"
            rel="noopener noreferrer"
            title="View original product page"
            aria-label={`View original product page for ${item.name}`}
            onClick={(e) => e.stopPropagation()}>
            
              <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
                <path d="M4.5 1.5h6v6M10 2L4.5 7.5M2 4.5v6h6" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          }
        </h3>
        <div className="card-price-row">
          <span className="card-final-price">{money(item.finalPrice)}</span>
          {item.originalPrice > item.finalPrice &&
          <span className="card-original-price">{money(item.originalPrice)}</span>
          }
        </div>
        <div className="card-actions">
          {inCart ?
          <button className="btn added" onClick={onRemove}>
              <span>✓ Added</span>
            </button> :

          <button
            className="btn primary"
            onClick={onAdd}
            disabled={!canReserve}>
            
              {isUnavailable ? 'Sold' : isReserved ? 'Reserved' : 'Reserve'}
            </button>
          }
        </div>
      </div>
    </article>);

}

// ============================================
// Item detail modal
// ============================================
function ItemDetailModal({ item, interestList, inCart, onClose, onAdd, onRemove }) {
  // Close on Esc
  useEffect(() => {
    if (!item) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [item, onClose]);

  if (!item) return null;

  const isUnavailable = item.status === 'sold';
  const isReserved = item.status === 'reserved';
  const canReserve = !isUnavailable;
  const discountNum = typeof item.discount === 'string' ?
    parseInt(item.discount.replace('%', ''), 10) : item.discount;
  const savings = item.originalPrice - item.finalPrice;
  const interestCount = interestList ? interestList.length : 0;

  return (
    <div
      className="detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.name} details`}
      onClick={onClose}
    >
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="detail-grid">
          <div className="detail-image-col">
            <div className={'detail-image' + ((isUnavailable || isReserved) ? ' is-claimed' : '')}>
              {item.image ? (
                <img src={encodeURI(item.image)} alt={item.name} className="detail-image-photo" />
              ) : (
                <div className="card-image-placeholder">
                  <span>{item.name}<br />photo</span>
                </div>
              )}
              <div className={'card-status-badge ' + statusClass(item.status)}>
                <span className="dot"></span>
                <span>{statusLabel(item.status)}</span>
              </div>
              {discountNum > 0 &&
                <div className="card-discount-badge">−{discountNum}%</div>
              }
            </div>
          </div>

          <div className="detail-info-col">
            <div className="detail-category">{item.category}</div>
            <h2 className="detail-name">{item.name}</h2>

            <div className="detail-price-row">
              <span className="detail-final-price">{money(item.finalPrice)}</span>
              {item.originalPrice > item.finalPrice && (
                <>
                  <span className="detail-original-price">{money(item.originalPrice)}</span>
                  <span className="detail-savings">save {money(savings)}</span>
                </>
              )}
            </div>

            <dl className="detail-meta">
              <div className="detail-meta-row">
                <dt>Status</dt>
                <dd>{statusLabel(item.status)}</dd>
              </div>
              <div className="detail-meta-row">
                <dt>Category</dt>
                <dd style={{ textTransform: 'capitalize' }}>{item.category}</dd>
              </div>
              {item.originalLink && (
                <div className="detail-meta-row">
                  <dt>Original</dt>
                  <dd>
                    <a href={item.originalLink} target="_blank" rel="noopener noreferrer" className="detail-link">
                      View product page ↗
                    </a>
                  </dd>
                </div>
              )}
            </dl>

            <div className="detail-actions">
              {inCart ? (
                <button className="btn added large full" onClick={onRemove}>
                  ✓ In your reservation — remove
                </button>
              ) : (
                <button
                  className="btn primary large full"
                  onClick={onAdd}
                  disabled={!canReserve}
                >
                  {isUnavailable ? 'Sold' : isReserved ? 'Already reserved' : 'Add to reservation'}
                </button>
              )}
            </div>

            <div className="detail-interest">
              <h4>
                <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '6px', color: 'var(--accent)' }}>
                  <path d="M7 12.5C7 12.5 1.5 8.5 1.5 5C1.5 3 3 1.5 5 1.5C6 1.5 6.7 2 7 2.8C7.3 2 8 1.5 9 1.5C11 1.5 12.5 3 12.5 5C12.5 8.5 7 12.5 7 12.5Z" fill="currentColor"/>
                </svg>
                Interest
              </h4>
              {interestCount === 0 ? (
                <p className="detail-interest-empty">
                  No one has reserved this yet — you'd be the first.
                </p>
              ) : (
                <>
                  <p className="detail-interest-summary">
                    <strong>{interestCount}</strong> {interestCount === 1 ? 'person has' : 'people have'} reserved this item.
                    {item.status !== 'sold' && ' First come, first served — we confirm pickups in the order they were received.'}
                  </p>
                  <ul className="detail-interest-list">
                    {interestList.map((entry, i) => (
                      <li key={i}>
                        <span className="dot-bullet" aria-hidden="true"></span>
                        <span className="who">{publicName(entry.name)}</span>
                        <span className="when">{timeAgo(entry.when)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Cart drawer
// ============================================
function CartDrawer({
  open, onClose, items, onRemove,
  onConfirm, contactInfo, onContactChange,
  contactErrors, sending
}) {
  const [step, setStep] = useState('cart'); // 'cart' | 'form'

  useEffect(() => {
    if (!open) setTimeout(() => setStep('cart'), 300);
  }, [open]);

  // Lock scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';else
    document.body.style.overflow = '';
    return () => {document.body.style.overflow = '';};
  }, [open]);

  const subtotal = items.reduce((a, i) => a + i.finalPrice, 0);
  const originalSubtotal = items.reduce((a, i) => a + i.originalPrice, 0);
  const savings = originalSubtotal - subtotal;
  const empty = items.length === 0;

  return (
    <React.Fragment>
      <div
        className={'drawer-backdrop' + (open ? ' open' : '')}
        onClick={onClose}>
      </div>
      <aside
        className={'drawer' + (open ? ' open' : '')}
        aria-hidden={!open}
        aria-label="Reservation cart">
        
        <div className="drawer-head">
          <h2 className="drawer-title">
            {step === 'cart' ? 'Your reservation' : 'Your details'}
          </h2>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {step === 'cart' && empty &&
          <div className="drawer-empty">
              <div className="mark">~</div>
              <p>Nothing reserved yet. Browse the catalog and add items you'd like to take home.</p>
            </div>
          }

          {step === 'cart' && !empty && items.map((item) =>
          <div className="cart-item" key={item.id}>
              {item.image ? (
                <img src={encodeURI(item.image)} alt={item.name} className="cart-item-image cart-item-image-photo" loading="lazy" />
              ) : (
                <div className="cart-item-image"></div>
              )}
              <div className="cart-item-info">
                <h4 className="cart-item-name">{item.name}</h4>
                <div className="cart-item-meta">
                  {item.category} · {statusLabel(item.status)}
                </div>
              </div>
              <div className="cart-item-side">
                <span className="cart-item-price">{money(item.finalPrice)}</span>
                <button className="cart-item-remove" onClick={() => onRemove(item.id)}>
                  Remove
                </button>
              </div>
            </div>
          )}

          {step === 'form' &&
          <div className="drawer-form-section">
              <h3>How can we reach you?</h3>
              <p className="sub">
                We'll confirm pickup details by WhatsApp or email within a few hours.
                Nothing's reserved until we reply.
              </p>
              <div className={'field' + (contactErrors.name ? ' error' : '')}>
                <label>Your name</label>
                <input
                type="text"
                value={contactInfo.name}
                onChange={(e) => onContactChange('name', e.target.value)}
                placeholder="First and last" />
              
                {contactErrors.name && <div className="field-error">{contactErrors.name}</div>}
              </div>
              <div className={'field' + (contactErrors.email ? ' error' : '')}>
                <label>Email</label>
                <input
                type="email"
                value={contactInfo.email}
                onChange={(e) => onContactChange('email', e.target.value)}
                placeholder="you@example.com" />
              
                {contactErrors.email && <div className="field-error">{contactErrors.email}</div>}
              </div>
              <div className={'field' + (contactErrors.whatsapp ? ' error' : '')}>
                <label>WhatsApp number</label>
                <input
                type="tel"
                value={contactInfo.whatsapp}
                onChange={(e) => onContactChange('whatsapp', e.target.value)}
                placeholder="+1 555 123 4567" />
              
                <div className="field-help">With country code, please. Either WhatsApp or email is fine.</div>
                {contactErrors.whatsapp && <div className="field-error">{contactErrors.whatsapp}</div>}
              </div>
              <div className="field">
                <label>Preferred pickup window <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--muted-2)' }}>(optional)</span></label>
                <input
                type="text"
                value={contactInfo.pickup}
                onChange={(e) => onContactChange('pickup', e.target.value)}
                placeholder="e.g. weekday evenings, Saturday morning" />
              
              </div>
              <div className="field">
                <label>Notes <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--muted-2)' }}>(optional)</span></label>
                <textarea
                value={contactInfo.notes}
                onChange={(e) => onContactChange('notes', e.target.value)}
                placeholder="Questions, requests, anything else...">
              </textarea>
              </div>
            </div>
          }
        </div>

        {!empty &&
        <div className="drawer-foot">
            <div className="drawer-totals">
              {savings > 0 &&
            <div className="drawer-totals-row">
                  <span>Original total</span>
                  <span style={{ textDecoration: 'line-through' }}>{money(originalSubtotal)}</span>
                </div>
            }
              {savings > 0 &&
            <div className="drawer-totals-row">
                  <span className="savings">You save</span>
                  <span className="savings">−{money(savings)}</span>
                </div>
            }
              <div className="drawer-totals-row total">
                <span>Total</span>
                <span className="amount">{money(subtotal)}</span>
              </div>
            </div>
            {step === 'cart' ?
          <button className="btn primary large full" onClick={() => setStep('form')}>
                Continue → your details
              </button> :

          <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" onClick={() => setStep('cart')} style={{ flex: '0 0 auto' }} disabled={sending}>
                  ← Back
                </button>
                <button
              className="btn primary large"
              onClick={onConfirm}
              style={{ flex: 1 }}
              disabled={sending}>
              
                  {sending ?
              <span className="sending-state">
                      <span className="spinner" aria-hidden="true"></span>
                      Sending…
                    </span> :
              'Confirm reservation'}
                </button>
              </div>
          }
          </div>
        }
      </aside>
    </React.Fragment>);

}

// ============================================
// Confirmation overlay
// ============================================
function Confirmation({ data, onClose }) {
  if (!data) return null;
  const { items, contact, total, originalTotal, sent, error } = data;
  const savings = originalTotal - total;

  // Build a plain-text summary (used by fallback "copy" and mailto)
  const emailLines = [
  `New reservation from ${contact.name}`,
  '',
  `Contact:`,
  contact.email ? `  Email: ${contact.email}` : null,
  contact.whatsapp ? `  WhatsApp: ${contact.whatsapp}` : null,
  contact.pickup ? `  Pickup preference: ${contact.pickup}` : null,
  '',
  `Items (${items.length}):`,
  ...items.map((i) => `  • ${i.name} (${i.category}) — ${money(i.finalPrice)} · ${statusLabel(i.status)}`),
  '',
  `Subtotal: ${money(total)}`,
  savings > 0 ? `Savings vs. original: ${money(savings)}` : null,
  '',
  contact.notes ? `Notes:\n  ${contact.notes}` : null].
  filter(Boolean).join('\n');

  const fallbackMailto =
  `mailto:guilhermerosso.m@gmail.com?cc=maylanaspricigo@gmail.com` +
  `&subject=${encodeURIComponent('Moving sale reservation — ' + contact.name)}` +
  `&body=${encodeURIComponent(emailLines)}`;

  const [copied, setCopied] = useState(false);
  function copySummary() {
    navigator.clipboard.writeText(emailLines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true">
      <div className="confirm-inner">
        <div className={'confirm-mark' + (sent === false ? ' warn' : '')}>
          {sent === false ? '!' : '✓'}
        </div>
        <h2>
          {sent === false ? 'Almost there, ' : 'Thanks, '}
          {contact.name.split(' ')[0]}.
        </h2>
        <p className="lede">
          {sent === false ?
          <>
              Your reservation is saved, but we couldn't deliver the email
              automatically. Tap the button below to send it from your own
              email app — we'll reply within a few hours.
            </> :

          <>
              Your reservation is on its way. We just received an email with your
              details and will get back to you within a few hours to confirm pickup
              and share the full address.
            </>
          }
        </p>

        {sent === false &&
        <div className="confirm-banner">
            <strong>Couldn't send automatically.</strong> Use one of the buttons
            below to forward the summary manually.
            {error && <div className="banner-detail">{error}</div>}
          </div>
        }

        <div className="confirm-summary">
          <h4>Reservation summary</h4>
          {items.map((i) =>
          <div className="confirm-summary-row" key={i.id}>
              <span className="label" style={{ textTransform: 'capitalize', color: 'var(--ink)', fontFamily: 'var(--font-sans)', fontSize: '14px' }}>
                {i.name}
              </span>
              <span className="value">
                <span className="price">{money(i.finalPrice)}</span>
              </span>
            </div>
          )}
          <div className="confirm-summary-total">
            <span>Total</span>
            <span className="amt">{money(total)}</span>
          </div>
        </div>

        <div className="confirm-summary">
          <h4>Your details</h4>
          <div className="confirm-summary-row">
            <span className="label">Name</span>
            <span className="value">{contact.name}</span>
          </div>
          {contact.email &&
          <div className="confirm-summary-row">
              <span className="label">Email</span>
              <span className="value" style={{ textTransform: 'none' }}>{contact.email}</span>
            </div>
          }
          {contact.whatsapp &&
          <div className="confirm-summary-row">
              <span className="label">WhatsApp</span>
              <span className="value" style={{ textTransform: 'none' }}>{contact.whatsapp}</span>
            </div>
          }
          {contact.pickup &&
          <div className="confirm-summary-row">
              <span className="label">Pickup</span>
              <span className="value" style={{ textTransform: 'none' }}>{contact.pickup}</span>
            </div>
          }
        </div>

        {sent === false &&
        <div className="confirm-actions">
            <a className="btn primary large" href={fallbackMailto}>
              ✉ Open email app
            </a>
            <button className="btn large" onClick={copySummary}>
              {copied ? '✓ Copied' : '⎘ Copy summary'}
            </button>
          </div>
        }

        <button className="btn ghost" onClick={onClose} style={{ marginTop: 24 }}>
          ← Back to catalog
        </button>

        <p className="confirm-note">
          {sent !== false ?
          <>
              <strong>Note:</strong> This is a request, not a confirmation. Items
              are first come, first served — they're held for you once we reply.
              If you don't hear back within 24 hours, message us directly at
              <br />guilhermerosso.m@gmail.com.
            </> :

          <>
              <strong>Tip:</strong> If you'd rather, you can also reach us directly
              at maylanaspricigo@gmail.com with the summary above.
            </>
          }
        </p>
      </div>
    </div>);

}

// ---- export to window for app.jsx ----
Object.assign(window, {
  Header, Hero, Filters, ProductCard, CartDrawer, Confirmation, FloatingCart,
  ItemDetailModal,
  sendReservationEmail,
  money, categoryLabel, statusLabel, statusClass, publicName, timeAgo
});