// ============================================
// Moving sale — main App
// ============================================
const { useState, useEffect, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showSold": true,
  "layout": "grid"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // ---- state ----
  const allItems = window.SALE_ITEMS || [];
  const db = window.db;

  const [overrides, setOverrides] = useState({});
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ms-cart') || '[]'); }
    catch { return []; }
  });
  const [interest, setInterest] = useState({});
  const [showAdmin, setShowAdmin] = useState(() => window.location.search.includes('admin'));
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [sort, setSort] = useState('featured');
  const [confirmation, setConfirmation] = useState(null);
  const [sending, setSending] = useState(false);
  const [contactInfo, setContactInfo] = useState({
    name: '', email: '', whatsapp: '', pickup: '', notes: ''
  });
  const [contactErrors, setContactErrors] = useState({});

  // Persist cart
  useEffect(() => { localStorage.setItem('ms-cart', JSON.stringify(cart)); }, [cart]);

  // Real-time Firestore listeners for shared state
  useEffect(() => {
    if (!db) return;

    const unsubInterest = db.collection('interest').onSnapshot(snapshot => {
      const data = {};
      snapshot.forEach(doc => { data[doc.id] = doc.data().entries || []; });
      setInterest(data);
    });

    const unsubOverrides = db.collection('overrides').onSnapshot(snapshot => {
      const data = {};
      snapshot.forEach(doc => { data[doc.id] = doc.data().status; });
      setOverrides(data);
    });

    return () => { unsubInterest(); unsubOverrides(); };
  }, []);

  // Merge overrides into items
  const items = useMemo(() => {
    return allItems.map(it => {
      const ov = overrides[it.id];
      return ov ? { ...it, status: ov } : it;
    });
  }, [overrides]);

  // ---- derived: categories with counts ----
  const categories = useMemo(() => {
    const map = new Map();
    items.forEach(i => {
      if (i.hidden) return;
      if (!t.showSold && i.status === 'sold') return;
      map.set(i.category, (map.get(i.category) || 0) + 1);
    });
    return [...map.entries()]
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count);
  }, [items, t.showSold]);

  // ---- filtered + sorted items ----
  const visibleItems = useMemo(() => {
    let out = items.filter(i => {
      if (i.hidden) return false;
      if (!t.showSold && i.status === 'sold') return false;
      if (activeCategory !== 'all' && i.category !== activeCategory) return false;
      return true;
    });

    const CATEGORY_ORDER = ['furniture','electronics','decor','bedding','organizers','kitchen','cleaning','others'];
    const statusScore = (i) => { if (i.status === 'available') return 0; if (i.status === 'reserved') return 1; return 2; };
    const categoryScore = (i) => { const idx = CATEGORY_ORDER.indexOf(i.category); return idx === -1 ? 99 : idx; };

    out.sort((a, b) => {
      if (sort === 'featured') {
        return statusScore(a) - statusScore(b) || categoryScore(a) - categoryScore(b) || b.finalPrice - a.finalPrice;
      }
      if (sort === 'price-asc') return a.finalPrice - b.finalPrice;
      if (sort === 'price-desc') return b.finalPrice - a.finalPrice;
      if (sort === 'discount-desc') {
        const da = parseInt((a.discount || '0').replace('%', ''), 10);
        const db = parseInt((b.discount || '0').replace('%', ''), 10);
        return db - da;
      }
      if (sort === 'name-asc') return a.name.localeCompare(b.name);
      return 0;
    });
    return out;
  }, [items, activeCategory, sort, t.showSold]);

  // ---- cart helpers ----
  const cartItems = useMemo(() => {
    return cart.map(id => items.find(i => i.id === id)).filter(Boolean);
  }, [cart, items]);
  const cartIds = useMemo(() => new Set(cart), [cart]);

  function addToCart(id) {
    setCart(c => c.includes(id) ? c : [...c, id]);
  }
  function removeFromCart(id) {
    setCart(c => c.filter(x => x !== id));
  }

  // ---- contact form ----
  function setContact(field, value) {
    setContactInfo(c => ({ ...c, [field]: value }));
    if (contactErrors[field]) {
      setContactErrors(e => ({ ...e, [field]: null }));
    }
  }
  function validate() {
    const e = {};
    if (!contactInfo.name.trim()) e.name = 'Please enter your name.';
    if (!contactInfo.email.trim() && !contactInfo.whatsapp.trim()) {
      e.email = 'Email or WhatsApp required.';
      e.whatsapp = ' ';
    } else {
      if (contactInfo.email.trim() && !/^\S+@\S+\.\S+$/.test(contactInfo.email.trim())) {
        e.email = "That email doesn't look right.";
      }
    }
    setContactErrors(e);
    return Object.keys(e).length === 0;
  }

  async function confirmReservation() {
    if (!validate()) return;
    if (sending) return;
    const total = cartItems.reduce((a, i) => a + i.finalPrice, 0);
    const originalTotal = cartItems.reduce((a, i) => a + i.originalPrice, 0);
    const payload = {
      items: cartItems,
      contact: { ...contactInfo },
      total,
      originalTotal,
      at: new Date().toISOString()
    };

    setSending(true);
    const result = await sendReservationEmail(payload);
    setSending(false);

    // Write to Firestore — mark reserved + log interest + store full reservation
    if (db) {
      const batch = db.batch();
      const entry = { name: contactInfo.name, when: new Date().toISOString() };
      cart.forEach(id => {
        batch.set(db.collection('overrides').doc(id), { status: 'reserved' });
        batch.set(
          db.collection('interest').doc(id),
          { entries: firebase.firestore.FieldValue.arrayUnion(entry) },
          { merge: true }
        );
      });
      batch.set(db.collection('reservations').doc(), {
        contact: { ...contactInfo },
        items: cartItems.map(i => ({ id: i.id, name: i.name, category: i.category, finalPrice: i.finalPrice, status: i.status })),
        total,
        originalTotal,
        at: new Date().toISOString()
      });
      await batch.commit().catch(console.error);
    }

    setConfirmation({
      ...payload,
      sent: result.ok,
      error: result.ok ? null : (result.error || (result.data && result.data.message) || null)
    });
    setCart([]);
    setDrawerOpen(false);
    setContactInfo({ name: '', email: '', whatsapp: '', pickup: '', notes: '' });
  }

  async function resetAll() {
    setCart([]);
    if (db) {
      const [interestSnap, overridesSnap] = await Promise.all([
        db.collection('interest').get(),
        db.collection('overrides').get()
      ]);
      const batch = db.batch();
      interestSnap.forEach(doc => batch.delete(doc.ref));
      overridesSnap.forEach(doc => batch.delete(doc.ref));
      await batch.commit().catch(console.error);
    }
  }

  function scrollToCatalog() {
    const catalogEl = document.querySelector('.catalog');
    if (!catalogEl) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const headerH = (document.querySelector('.header')?.offsetHeight || 0) +
                    (document.querySelector('.filters')?.offsetHeight || 0);
    const y = catalogEl.getBoundingClientRect().top + window.scrollY - headerH - 8;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }

  // ---- render ----
  const location = '12 Ware St · Cambridge, MA';
  const hasReservations = Object.keys(overrides).length > 0 || cart.length > 0 || Object.keys(interest).length > 0;

  return (
    <React.Fragment>
      <Header location={location} />
      <Hero stats={{ total: items.filter(i => i.status !== 'sold' || t.showSold).length, categories: categories.length }} />
      <Filters
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={(c) => { setActiveCategory(c); scrollToCatalog(); }}
        sort={sort}
        onSortChange={(s) => { setSort(s); scrollToCatalog(); }}
        layout={t.layout}
        onLayoutChange={v => setTweak('layout', v)}
        showSold={t.showSold}
        onShowSoldChange={v => setTweak('showSold', v)}
        hasReservations={hasReservations}
        onReset={resetAll}
        resultsCount={visibleItems.length}
      />

      <section className="catalog">
        <div className="catalog-head">
          <div className="catalog-count">
            Showing <strong>{visibleItems.length}</strong> of {items.filter(i => t.showSold || i.status !== 'sold').length} items
          </div>
        </div>

        {visibleItems.length === 0 ? (
          <div className="empty">
            <h3>Nothing in this category yet.</h3>
            <p>Try a different category or clear the filter.</p>
          </div>
        ) : (
          <div className={'grid' + (t.layout === 'list' ? ' list-view' : '')}>
            {visibleItems.map(item => (
              <ProductCard
                key={item.id}
                item={item}
                inCart={cartIds.has(item.id)}
                onAdd={() => addToCart(item.id)}
                onRemove={() => removeFromCart(item.id)}
                onSelect={() => setSelectedItemId(item.id)}
                interestCount={(interest[item.id] || []).length}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="foot">
        Moving out · Cambridge, MA · {new Date().getFullYear()}
      </footer>

      <CartDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={cartItems}
        onRemove={removeFromCart}
        onConfirm={confirmReservation}
        contactInfo={contactInfo}
        onContactChange={setContact}
        contactErrors={contactErrors}
        sending={sending}
      />

      <FloatingCart
        count={cart.length}
        total={cartItems.reduce((a, i) => a + i.finalPrice, 0)}
        onClick={() => setDrawerOpen(true)}
      />

      {confirmation && (
        <Confirmation
          data={confirmation}
          onClose={() => setConfirmation(null)}
        />
      )}

      {showAdmin && (
        <ReservationsList onClose={() => setShowAdmin(false)} />
      )}

      <ItemDetailModal
        item={selectedItemId ? items.find(i => i.id === selectedItemId) : null}
        interestList={selectedItemId ? (interest[selectedItemId] || []) : []}
        inCart={selectedItemId ? cartIds.has(selectedItemId) : false}
        onClose={() => setSelectedItemId(null)}
        onAdd={() => { if (selectedItemId) addToCart(selectedItemId); }}
        onRemove={() => { if (selectedItemId) removeFromCart(selectedItemId); }}
      />
    </React.Fragment>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
