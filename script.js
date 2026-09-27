const state = {
  screen: 'home', // 'home' | 'exchange' | 'success' | 'toolbox'
  balance: 9691068, // Default from Toolbox screenshot
  coins: 8146530603020,
  upcomingBalance: 2000000, // Default from Toolbox screenshot
  username: '',
  selected: 0,
  profile: null,
  profileLoading: false,
  profileError: null,
  animateHome: false,
  lastDeduction: null,
  showExchangeModal: false,
  notificationTimeout: null,

  // Toolbox settings (Images 2 & 3)
  toolbox: {
    walletMode: 'coins', // 'transfer' | 'exchange' | 'coins'
    exchangeCompleteStyle: 'green', // 'green' | 'red'
    autoAtRemove: true,
    randomProfileForUnknown: true,
    confirmWithdrawalTitle: 'Transfer details',
    transferDetailsTitle: 'Transfer details',
    transferLabel: 'LIVE rewards transfer to TikTok',
    currency: 'USD', // 'USD' | 'EUR' | 'TRY' | 'GBP' | 'BRL'
    followerTextSize: 2, // 1 to 6
    paymentLoading: {
      enabled: true,
      style: 'dots', // 'classic' | 'modern' | 'ring' | 'dots' | 'squares'
      duration: 1 // in seconds
    },
    searchLoading: {
      enabled: true,
      style: 'classic',
      duration: 1
    }
  },

  transactions: [
    {
      name: "Mina Chou 💕 MRSN",
      handle: "mina.chou992",
      avatar: "https://p16-common-sign.tiktokcdn-us.com/tos-maliva-avt-0068/7339832791414161413~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=4310e976&x-expires=1790668800&x-signature=k2v8vYw244c9z7m0",
      coins: 15000,
      amount: 181.80,
      time: "Sep 27, 2026, 2:42 PM"
    },
    {
      name: "Alex D",
      handle: "raushx",
      avatar: "https://p16-common-sign.tiktokcdn-us.com/tos-alisg-avt-0068/58ac56f93934f17a4abda4f337893d26~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=9640&refresh_token=41822ca3&x-expires=1790668800&x-signature=ZCV532i7gGGiVevIiR2izTuTpSU%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast8",
      coins: 250,
      amount: 3.03,
      time: "Sep 27, 2026, 2:38 PM"
    }
  ]
};

const currencyMap = {
  USD: '$',
  EUR: '€',
  TRY: '₺',
  GBP: '£',
  BRL: 'R$'
};

const getCurSym = () => currencyMap[state.toolbox.currency] || '$';

const rate = 250 / 3.03; // coins per USD
const fmt = n => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const moneyFmt = n => `${getCurSym()}${fmt(n)}`;
const coinFmt = n => new Intl.NumberFormat('en-US').format(Math.floor(n));
const dollars = coins => coins / rate;

function numFmt(n) {
  if (n == null || isNaN(n)) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return new Intl.NumberFormat('en-US').format(n);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

function cleanHandle(raw) {
  if (!raw) return '';
  let str = String(raw).trim();
  str = str.replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/i, '');
  if (state.toolbox.autoAtRemove) {
    str = str.replace(/^@+/, '');
  }
  str = str.split('?')[0].split('/')[0].trim();
  return str;
}

const randomAvatars = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80"
];

function getRandomProfile(clean) {
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) & 0xffffff;
  }
  hash = Math.abs(hash);

  const avatar = randomAvatars[hash % randomAvatars.length];
  const followers = 15000 + (hash % 650000);
  const likes = followers * 6 + (hash % 120000);
  const nickname = clean.charAt(0).toUpperCase() + clean.slice(1);

  return {
    username: clean,
    nickname: nickname,
    avatar: avatar,
    followers: followers,
    likes: likes
  };
}

const profileCache = new Map();
let debounceTimer = null;
let currentAbortController = null;

function animateNumber({ startVal, endVal, duration, onUpdate, onDone }) {
  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = startVal - (startVal - endVal) * ease;
    onUpdate(current, progress);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      onUpdate(endVal, 1);
      if (onDone) onDone();
    }
  }
  requestAnimationFrame(step);
}

function set(s) {
  Object.assign(state, s);
  render();
}

function openExchange() {
  set({
    screen: 'exchange',
    username: '',
    selected: 0,
    profile: null,
    profileLoading: false,
    profileError: null,
    showExchangeModal: false
  });
}

function openToolbox() {
  set({ screen: 'toolbox' });
}

function home() {
  return `
    <!-- Topbar (Image 1): < arrow opens Toolbox, LIVE rewards centered, X does nothing -->
    <header class="home-topbar">
      <button class="icon" onclick="openToolbox()" title="Settings">‹</button>
      <h2 class="home-title">LIVE rewards</h2>
      <button class="icon home-close-btn" onclick="/* do nothing as requested */" title="Close">×</button>
    </header>
    
    <section class="cards">
      <div class="card">
        <span>Available rewards</span>
        <strong id="homeCardBalance">${moneyFmt(state.balance)}</strong>
      </div>
      <div class="card">
        <span>Upcoming rewards</span>
        <strong>${moneyFmt(state.upcomingBalance)}</strong>
      </div>
    </section>
    
    <section class="balance">
      <div class="label">Available rewards</div>
      <div class="big" id="homeBigBalance">${moneyFmt(state.balance)}</div>
      <div class="conversion" id="homeBigCoins">= ${moneyFmt(state.balance)} ( <span class="coin">🪙</span> ${coinFmt(state.coins)} )</div>
    </section>
    
    <section class="actions">
      <!-- Both Exchange and Withdraw open the same Exchange page as requested -->
      <button class="btn primary" onclick="openExchange()">Exchange</button>
      <button class="btn secondary" onclick="openExchange()">Withdraw</button>
      <div class="limit">Daily withdrawal limit (Remain/Total): ${moneyFmt(1000)}/${moneyFmt(1000)}</div>
    </section>
    
    <section class="section">
      <div class="section-head">
        <h2>Transactions</h2>
        <span class="month">Sep 2026</span>
      </div>
      ${state.transactions.length ? state.transactions.map(tx => `
        <div class="tx">
          <div class="txleft">
            ${tx.avatar ? `
              <img src="${esc(tx.avatar)}" class="avatar-img" alt="${esc(tx.name)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.outerHTML='<div class=\\'avatar\\'>🪙</div>'">
            ` : `
              <div class="avatar">🪙</div>
            `}
            <div>
              <div class="txname">${esc(tx.name)}</div>
              <div class="txsub">Sent ${coinFmt(tx.coins)} Coins to @${esc(tx.handle || tx.name)}</div>
              <div class="txtime">${esc(tx.time)}</div>
            </div>
          </div>
          <div class="negative">-${moneyFmt(tx.amount)}</div>
        </div>
      `).join('') : `<div class="empty">No transactions yet.</div>`}
    </section>
  `;
}

function getFollowerFontSize() {
  const map = { 1: '13px', 2: '16px', 3: '18px', 4: '20px', 5: '22px', 6: '24px' };
  return map[state.toolbox.followerTextSize] || '16px';
}

function renderProfileContainer() {
  const clean = cleanHandle(state.username);
  if (!clean) return '';

  if (state.profileLoading) {
    const s = (state.toolbox.searchLoading.style || 'classic').toLowerCase();
    let spinnerHtml = '<div class="spinner"></div>';
    if (s === 'dots') spinnerHtml = '<div class="loader-dots"><span></span><span></span><span></span></div>';
    else if (s === 'ring') spinnerHtml = '<div class="loader-ring" style="width:24px;height:24px;border-width:3px;"></div>';
    else if (s === 'modern') spinnerHtml = '<div class="loader-modern" style="width:24px;height:24px;border-width:3px;"></div>';
    else if (s === 'squares') spinnerHtml = '<div class="loader-squares" style="width:22px;height:22px;"></div>';

    return `
      <div class="profile-msg loading">
        ${spinnerHtml}
        <div>Connecting to TikTok &amp; fetching profile for <strong>@${esc(clean)}</strong>...</div>
      </div>
    `;
  }

  if (state.profileError) {
    return `
      <div class="profile-msg notfound">
        <span style="font-size:24px">⚠️</span>
        <div>${esc(state.profileError)}</div>
      </div>
    `;
  }

  if (state.profile) {
    const p = state.profile;
    const chipFontSize = getFollowerFontSize();

    return `
      <div class="profile-card">
        <div class="profile-top">
          <div class="pavatar">
            ${p.avatar ? `
              <img src="${esc(p.avatar)}" alt="${esc(p.nickname || p.username)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.parentElement.innerHTML='<span style=\\'font-size:38px\\'>👤</span>'">
            ` : `
              <span style="font-size:38px">👤</span>
            `}
          </div>
          <div class="pinfo">
            <div class="pname-row">
              <span class="pname" title="${esc(p.nickname || p.username)}">${esc(p.nickname || p.username)}</span>
              <svg class="pbadge" viewBox="0 0 24 24" width="22" height="22" fill="#20d5ec" title="Verified Creator"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.2 14.2l-3.5-3.5 1.4-1.4 2.1 2.1 5.9-5.9 1.4 1.4-7.3 7.3z"/></svg>
            </div>
            <div class="puser">@${esc(p.username)}</div>
            <div class="stats-chips">
              <div class="stat-pill" style="font-size:${chipFontSize}">👥 <strong>${numFmt(p.followers)}</strong> Followers</div>
              <div class="stat-pill" style="font-size:${chipFontSize}">❤️ <strong>${numFmt(p.likes)}</strong> Likes</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return '';
}

function exchange() {
  const canExchange = Boolean(state.username.trim() && state.selected > 0);
  const hasUser = Boolean(state.username.trim());

  return `
    <div class="screen">
      <header class="topbar">
        <button class="icon" onclick="set({ screen: 'home' })">‹</button>
        <h2>Exchange</h2>
        <button class="icon" onclick="alert('Enter any real TikTok creator handle (e.g. raushx, mrbeast, tiktok, iphonetrick). Profile, followers, and likes are retrieved live via API.')">?</button>
      </header>
      
      <div class="exchange">
        <div class="big" id="exchangeBalance">${moneyFmt(state.balance)}</div>
        <div class="conversion" id="exchangeCoins">= ${moneyFmt(state.balance)} ( <span class="coin">🪙</span> ${coinFmt(state.coins)} )</div>
        <div class="label" style="margin-top:24px">Available balance to exchange for Coins</div>
        
        <div class="field">
          <label>Creator username</label>
          <div class="handle">
            <b id="handleAt" style="${hasUser ? '' : 'display:none;'}">@</b>
            <input
              id="creatorInput"
              value="${esc(state.username)}"
              placeholder="@your-TikTok Handle"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              oninput="onUsernameInput(this.value)"
              onkeydown="if(event.key==='Enter'){event.preventDefault();submitImmediateLookup();}"
            >
            <button
              id="clearUsernameBtn"
              class="clear-btn ${hasUser ? '' : 'hidden'}"
              onclick="clearUsername()"
              title="Clear input"
            >×</button>
          </div>
          
          <div id="profileContainer">
            ${renderProfileContainer()}
          </div>
        </div>
        
        <div class="field">
          <label>Exchange earnings for Coins</label>
          <div class="packs">
            <button class="pack ${state.selected === 250 ? 'active' : ''}" onclick="selectPack(250)">
              <b>🪙 250</b>
              <small>${moneyFmt(3.03)}</small>
            </button>
            <button class="pack ${state.selected === 500 ? 'active' : ''}" onclick="selectPack(500)">
              <b>🪙 500</b>
              <small>${moneyFmt(6.05)}</small>
            </button>
            <button class="pack ${state.selected === 15000 ? 'active' : ''}" onclick="selectPack(15000)">
              <b>🪙 15,000</b>
              <small>${moneyFmt(181.50)}</small>
            </button>
          </div>
          
          <button class="custom ${[250, 500, 15000].includes(state.selected) || !state.selected ? '' : 'active'}" style="width:100%;" onclick="openCustom()">
            ${state.selected ? coinFmt(state.selected) + ' Coins' : 'Enter a custom number or amount'}
          </button>
          
          ${state.selected ? `<div style="text-align:left;font-size:22px;font-weight:800;margin-top:38px">${coinFmt(state.selected)} Coins (≈ ${moneyFmt(dollars(state.selected))})</div>` : ''}
          
          <div class="policy" onclick="alert('Virtual Items Policy')">Virtual Items Policy</div>
        </div>
      </div>
      
      <div class="sticky">
        <button
          id="exchangeSubmitBtn"
          class="btn primary"
          style="opacity: ${canExchange ? '1' : '0.45'}"
          onclick="doExchange()"
        >Exchange</button>
      </div>

      <!-- Confirmation Popup Modal (Image 4) -->
      ${state.showExchangeModal ? exchangeConfirmModal() : ''}
    </div>
  `;
}

function exchangeConfirmModal() {
  const clean = cleanHandle(state.username);
  const amountStr = moneyFmt(dollars(state.selected));

  return `
    <div class="confirm-modal-back" id="confirmModalBack" onclick="if(event.target===this)closeExchangeModal()">
      <div class="confirm-modal-card">
        <button class="confirm-modal-close" onclick="closeExchangeModal()">×</button>
        
        <div class="confirm-modal-icon-wrap">
          <div class="confirm-coin-badge">
            <svg class="orbit-arrow orbit-left" viewBox="0 0 24 24" width="22" height="22">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8z" fill="#20d5ec"/>
            </svg>
            <div class="confirm-coin-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff">
                <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.901 2.868 2.893 2.893 0 0 1-2.892-2.892 2.896 2.896 0 0 1 2.892-2.894c.277 0 .542.04.794.113V9.38a6.34 6.34 0 0 0-.794-.052 6.353 6.353 0 0 0-6.35 6.35 6.353 6.353 0 0 0 6.35 6.35 6.354 6.354 0 0 0 6.349-6.35V8.847a8.214 8.214 0 0 0 4.767 1.503V6.905c-.34 0-.677-.074-.995-.219z"/>
              </svg>
            </div>
            <svg class="orbit-arrow orbit-right" viewBox="0 0 24 24" width="22" height="22">
              <path d="M12 20v3l4-4-4-4v3c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8z" fill="#ff6699"/>
            </svg>
          </div>
        </div>
        
        <h3 class="confirm-modal-title">Complete exchange?</h3>
        <p class="confirm-modal-desc">
          ${amountStr} will be deducted from LIVE rewards balance and sent to @${esc(clean)}
        </p>
        
        <div class="confirm-modal-actions">
          <button class="confirm-btn-back" onclick="closeExchangeModal()">Go back</button>
          <button class="confirm-btn-exchange" onclick="confirmAndExecuteExchange()">Exchange</button>
        </div>
      </div>
    </div>
  `;
}

function selectPack(amount) {
  state.selected = (state.selected === amount) ? 0 : amount;
  render();
}

function onUsernameInput(val) {
  let processed = val;
  if (state.toolbox.autoAtRemove && processed.startsWith('@')) {
    processed = processed.replace(/^@+/, '');
    const input = document.getElementById('creatorInput');
    if (input) input.value = processed;
  }

  state.username = processed;
  const clean = cleanHandle(processed);
  const hasUser = Boolean(processed.trim());

  const handleAt = document.getElementById('handleAt');
  if (handleAt) handleAt.style.display = hasUser ? 'inline' : 'none';

  const clearBtn = document.getElementById('clearUsernameBtn');
  if (clearBtn) clearBtn.classList.toggle('hidden', !hasUser);

  updateExchangeButtonState();

  if (debounceTimer) clearTimeout(debounceTimer);
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }

  if (!clean) {
    state.profile = null;
    state.profileLoading = false;
    state.profileError = null;
    updateProfileUI();
    return;
  }

  const cacheKey = clean.toLowerCase();
  if (profileCache.has(cacheKey)) {
    const cached = profileCache.get(cacheKey);
    state.profile = cached.profile;
    state.profileError = cached.error;
    state.profileLoading = false;
    updateProfileUI();
    updateExchangeButtonState();
    return;
  }

  state.profile = null;
  state.profileLoading = true;
  state.profileError = null;
  updateProfileUI();

  const searchDelay = state.toolbox.searchLoading.enabled ? Math.min(state.toolbox.searchLoading.duration * 400, 1000) : 400;

  debounceTimer = setTimeout(() => {
    fetchProfile(clean);
  }, searchDelay);
}

function submitImmediateLookup() {
  const clean = cleanHandle(state.username);
  if (!clean) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  fetchProfile(clean);
}

async function fetchProfile(clean) {
  if (currentAbortController) currentAbortController.abort();
  currentAbortController = new AbortController();

  state.profileLoading = true;
  state.profileError = null;
  updateProfileUI();

  try {
    const url = `https://api.nftoken.info/api/tiktok/profile/${encodeURIComponent(clean)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': '*/*' },
      signal: currentAbortController.signal
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const data = await res.json();
    const currentClean = cleanHandle(state.username).toLowerCase();

    if (data.success && data.data) {
      profileCache.set(clean.toLowerCase(), { profile: data.data, error: null });
      if (currentClean === clean.toLowerCase()) {
        state.profile = data.data;
        state.profileLoading = false;
        state.profileError = null;
        updateProfileUI();
        updateExchangeButtonState();
      }
    } else {
      handleProfileNotFound(clean, data.error);
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    handleProfileNotFound(clean, null);
  }
}

function handleProfileNotFound(clean, errorMsg) {
  const currentClean = cleanHandle(state.username).toLowerCase();
  if (currentClean !== clean.toLowerCase()) return;

  if (state.toolbox.randomProfileForUnknown) {
    // When TikTok has no account for the ID, show a random picture and name instead of an error
    const randProfile = getRandomProfile(clean);
    profileCache.set(clean.toLowerCase(), { profile: randProfile, error: null });
    state.profile = randProfile;
    state.profileLoading = false;
    state.profileError = null;
    updateProfileUI();
    updateExchangeButtonState();
  } else {
    const errMsg = errorMsg || `TikTok profile "@${clean}" not found`;
    profileCache.set(clean.toLowerCase(), { profile: null, error: errMsg });
    state.profile = null;
    state.profileLoading = false;
    state.profileError = errMsg;
    updateProfileUI();
    updateExchangeButtonState();
  }
}

function updateProfileUI() {
  const container = document.getElementById('profileContainer');
  if (container) {
    container.innerHTML = renderProfileContainer();
  }
}

function updateExchangeButtonState() {
  const btn = document.getElementById('exchangeSubmitBtn');
  if (btn) {
    const isValid = Boolean(state.username.trim() && state.selected > 0);
    btn.style.opacity = isValid ? '1' : '0.45';
  }
}

function clearUsername() {
  state.username = '';
  state.profile = null;
  state.profileLoading = false;
  state.profileError = null;
  if (debounceTimer) clearTimeout(debounceTimer);
  if (currentAbortController) currentAbortController.abort();

  const input = document.getElementById('creatorInput');
  if (input) {
    input.value = '';
    input.focus();
  }
  const handleAt = document.getElementById('handleAt');
  if (handleAt) handleAt.style.display = 'none';

  const clearBtn = document.getElementById('clearUsernameBtn');
  if (clearBtn) clearBtn.classList.add('hidden');

  updateProfileUI();
  updateExchangeButtonState();
}

function customSheet() {
  return `
    <div class="sheet-back" onclick="if(event.target===this)closeCustom()">
      <div class="sheet">
        <div class="sheet-head">
          <h2>Custom</h2>
          <button onclick="closeCustom()">×</button>
        </div>
        <div class="number">
          <div class="caption">Number of Coins</div>
          <div class="number-row">
            <span>🪙</span>&nbsp;<span id="num">${coinFmt(state.selected || 0)}</span>
            <span class="all" onclick="setCustomAll()">All</span>
          </div>
          <div class="amount" id="customAmount">${moneyFmt(dollars(state.selected || 0))}</div>
          <div class="keypad">
            ${['1', '2', '3', '⌫', '4', '5', '6', '000', '7', '8', '9', '0'].map(k => `
              <button class="key" onclick="key('${k}')">${k}</button>
            `).join('')}
          </div>
          <div class="policy" onclick="alert('Virtual Items Policy')">Virtual Items Policy</div>
          <div class="total">
            <span>Total</span>
            <strong id="customTotal">${moneyFmt(dollars(state.selected || 0))}</strong>
          </div>
          <button id="customDoneBtn" class="btn primary" style="opacity: ${state.selected ? '1' : '0.45'}" onclick="closeCustom()">Done</button>
        </div>
      </div>
    </div>
  `;
}

function openCustom() {
  document.body.insertAdjacentHTML('beforeend', customSheet());
}

function closeCustom() {
  document.querySelector('.sheet-back')?.remove();
  render();
}

function updateCustomSheetUI() {
  const numEl = document.getElementById('num');
  if (numEl) numEl.textContent = coinFmt(state.selected || 0);

  const amountEl = document.getElementById('customAmount');
  if (amountEl) amountEl.textContent = moneyFmt(dollars(state.selected || 0));

  const totalEl = document.getElementById('customTotal');
  if (totalEl) totalEl.textContent = moneyFmt(dollars(state.selected || 0));

  const doneBtn = document.getElementById('customDoneBtn');
  if (doneBtn) doneBtn.style.opacity = state.selected ? '1' : '0.45';
}

function setCustomAll() {
  state.selected = state.coins;
  updateCustomSheetUI();
}

function key(k) {
  let v = String(state.selected || 0);
  if (k === '⌫') {
    v = v.slice(0, -1);
  } else if (k === '000') {
    v = (v === '0' ? '' : v) + '000';
  } else {
    v = (v === '0' ? '' : v) + k;
  }
  let n = Number(v);
  if (!Number.isFinite(n) || n < 0) n = 0;
  state.selected = Math.min(n, state.coins);
  updateCustomSheetUI();
}

function doExchange() {
  const clean = cleanHandle(state.username);
  if (!clean || !state.selected) {
    alert('Please enter a creator username and choose a coin amount.');
    return;
  }
  if (state.selected > state.coins) {
    alert('Insufficient coin balance.');
    return;
  }

  // Open Image 4 Confirmation Modal
  openExchangeModal();
}

function openExchangeModal() {
  state.showExchangeModal = true;
  render();
}

function closeExchangeModal() {
  state.showExchangeModal = false;
  render();
}

function confirmAndExecuteExchange() {
  state.showExchangeModal = false;

  const clean = cleanHandle(state.username);
  const amount = dollars(state.selected);
  const startBalance = state.balance;
  const endBalance = startBalance - amount;
  const startCoins = state.coins;
  const endCoins = startCoins - state.selected;

  // Store deduction details for home screen animation (balance is ONLY decreased visually upon returning to Home)
  state.lastDeduction = { startBalance, endBalance, startCoins, endCoins, amount };

  const recipient = state.profile || getRandomProfile(clean);

  const now = new Date();
  state.tx = {
    name: recipient.nickname || recipient.username,
    handle: recipient.username,
    avatar: recipient.avatar || '',
    coins: state.selected,
    amount,
    time: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  };

  state.transactions.unshift(state.tx);

  // If Payment Loading is enabled, show loader animation for specified duration
  if (state.toolbox.paymentLoading.enabled) {
    showLoadingOverlay('Processing exchange...', state.toolbox.paymentLoading.style, state.toolbox.paymentLoading.duration * 1000, () => {
      state.screen = 'success';
      render();
      showTopNotification();
    });
  } else {
    state.screen = 'success';
    render();
    showTopNotification();
  }
}

function showTopNotification() {
  const notif = document.getElementById('topNotification');
  if (notif) {
    notif.classList.add('show');
    if (state.notificationTimeout) clearTimeout(state.notificationTimeout);
    state.notificationTimeout = setTimeout(() => {
      notif.classList.remove('show');
    }, 4500);
  }
}

function hideTopNotification() {
  const notif = document.getElementById('topNotification');
  if (notif) {
    notif.classList.remove('show');
  }
}

function showLoadingOverlay(text, style, duration, onComplete) {
  const existing = document.getElementById('tempLoaderOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'loader-overlay';
  overlay.id = 'tempLoaderOverlay';

  let loaderHtml = '';
  const s = (style || 'dots').toLowerCase();
  if (s === 'classic') {
    loaderHtml = '<div class="loader-classic"></div>';
  } else if (s === 'modern') {
    loaderHtml = '<div class="loader-modern"></div>';
  } else if (s === 'ring') {
    loaderHtml = '<div class="loader-ring"></div>';
  } else if (s === 'squares') {
    loaderHtml = '<div class="loader-squares"></div>';
  } else {
    // dots default
    loaderHtml = '<div class="loader-dots"><span></span><span></span><span></span></div>';
  }

  overlay.innerHTML = `
    <div class="loader-card">
      ${loaderHtml}
      <div class="loader-text">${esc(text)}</div>
    </div>
  `;
  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.remove();
    if (onComplete) onComplete();
  }, duration);
}

function previewLoadingAnimation(style) {
  showLoadingOverlay('Previewing animation...', style, 2000, () => {});
}

function success() {
  const tx = state.tx;
  const isRedTheme = state.toolbox.exchangeCompleteStyle === 'red';

  return `
    <div class="success">
      <div class="check ${isRedTheme ? 'red-theme' : ''}">✓</div>
      <h1>Exchange completed</h1>
      <h3>You exchanged for 🪙 ${coinFmt(tx.coins)} Coins</h3>
      <div class="details">
        <div class="row">
          <span>Recipient</span>
          <span class="recipient-cell">
            ${tx.avatar ? `
              <img src="${esc(tx.avatar)}" class="recipient-thumb" alt="${esc(tx.name)}" referrerpolicy="no-referrer" onerror="this.style.display='none'">
            ` : ''}
            <span class="recipient-names">
              <strong>${esc(tx.name)}</strong>
              <small>@${esc(tx.handle)}</small>
            </span>
          </span>
        </div>
        <div class="row">
          <span>Coins Exchanged</span>
          <span>🪙 ${coinFmt(tx.coins)} Coins</span>
        </div>
        <div class="row">
          <span>Deducted Amount</span>
          <span>${moneyFmt(tx.amount)}</span>
        </div>
        <div class="row">
          <span>Time</span>
          <span>${esc(tx.time)}</span>
        </div>
        
        <!-- Start gifter level (Image 5 exact design) -->
        <div class="gifter-card">
          <div class="tiktok-tile">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#ffffff">
              <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.901 2.868 2.893 2.893 0 0 1-2.892-2.892 2.896 2.896 0 0 1 2.892-2.894c.277 0 .542.04.794.113V9.38a6.34 6.34 0 0 0-.794-.052 6.353 6.353 0 0 0-6.35 6.35 6.353 6.353 0 0 0 6.35 6.35 6.354 6.354 0 0 0 6.349-6.35V8.847a8.214 8.214 0 0 0 4.767 1.503V6.905c-.34 0-.677-.074-.995-.219z"/>
            </svg>
          </div>
          <div class="gifter-info">
            <h4>Start gifter level</h4>
            <p>Send your first Gift to begin your gifter journey and unlock more rewards as you level up.</p>
          </div>
        </div>
      </div>
      <!-- When returning to home screen, triggers decreasing red countdown animation -->
      <button class="btn green" onclick="set({ screen: 'home', animateHome: true })">← Go back</button>
    </div>
  `;
}

/* Toolbox Settings Screen (Images 2 & 3) */
function toolbox() {
  const tb = state.toolbox;

  return `
    <div class="screen toolbox-screen">
      <header class="topbar" style="background:#fff;">
        <button class="icon" onclick="set({ screen: 'home' })">‹</button>
        <h2 style="font-size:24px; font-weight:800;">Toolbox</h2>
        <button class="icon" onclick="set({ screen: 'home' })" title="Exit">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </header>

      <div class="toolbox-body">
        <!-- Available rewards -->
        <div class="toolbox-card">
          <label class="toolbox-label">Available rewards</label>
          <input type="number" step="any" class="toolbox-input" id="tbAvailableRewards" value="${state.balance}">
        </div>

        <!-- Upcoming rewards -->
        <div class="toolbox-card">
          <label class="toolbox-label">Upcoming rewards</label>
          <input type="number" step="any" class="toolbox-input" id="tbUpcomingRewards" value="${state.upcomingBalance}">
        </div>

        <!-- Wallet Mode -->
        <div class="toolbox-card">
          <div class="toolbox-label">Wallet Mode</div>
          <div class="toolbox-sub">Switch between transfer &amp; exchange panels</div>
          <div class="toolbox-btn-group">
            <button class="tb-btn ${tb.walletMode === 'transfer' ? 'active' : ''}" onclick="setToolbox('walletMode', 'transfer')">Mode 1<br><small>Transfer</small></button>
            <button class="tb-btn ${tb.walletMode === 'exchange' ? 'active' : ''}" onclick="setToolbox('walletMode', 'exchange')">Mode 2<br><small>Exchange</small></button>
            <button class="tb-btn ${tb.walletMode === 'coins' ? 'active' : ''}" onclick="setToolbox('walletMode', 'coins')">Mode 3<br><small>Coins</small></button>
          </div>
        </div>

        <!-- Mode 2 — Exchange Complete style -->
        <div class="toolbox-card">
          <div class="toolbox-label">Mode 2 — Exchange Complete style</div>
          <div class="toolbox-sub">Success screen shown after an exchange</div>
          <div class="toolbox-btn-group grid-2">
            <button class="tb-btn ${tb.exchangeCompleteStyle === 'green' ? 'active' : ''}" onclick="setToolbox('exchangeCompleteStyle', 'green')">Green (details)</button>
            <button class="tb-btn ${tb.exchangeCompleteStyle === 'red' ? 'active' : ''}" onclick="setToolbox('exchangeCompleteStyle', 'red')">Red (classic)</button>
          </div>
        </div>

        <!-- Auto @ remove & Random profile for unknown ID -->
        <div class="toolbox-card">
          <div class="toolbox-toggle-row">
            <div>
              <div class="toolbox-label">Auto @ remove</div>
              <div class="toolbox-sub" style="margin-bottom:0;">Automatically remove @ from username input</div>
            </div>
            <label class="ios-switch">
              <input type="checkbox" ${tb.autoAtRemove ? 'checked' : ''} onchange="setToolbox('autoAtRemove', this.checked)">
              <span class="ios-slider"></span>
            </label>
          </div>
          <div class="toolbox-divider"></div>
          <div class="toolbox-toggle-row">
            <div>
              <div class="toolbox-label">Random profile for unknown ID</div>
              <div class="toolbox-sub" style="margin-bottom:0;">When TikTok has no account for the ID, show a random picture and name instead of an error</div>
            </div>
            <label class="ios-switch">
              <input type="checkbox" ${tb.randomProfileForUnknown ? 'checked' : ''} onchange="setToolbox('randomProfileForUnknown', this.checked)">
              <span class="ios-slider"></span>
            </label>
          </div>
        </div>

        <!-- Confirm withdrawal details name -->
        <div class="toolbox-card">
          <div class="toolbox-field-group">
            <label class="toolbox-label">Confirm withdrawal details name</label>
            <div class="toolbox-sub">Rename the withdrawal title shown on all pages</div>
            <input type="text" class="toolbox-input" id="tbWithdrawalName" value="${esc(tb.confirmWithdrawalTitle)}">
          </div>
          <div class="toolbox-field-group">
            <label class="toolbox-label">Transfer details title</label>
            <div class="toolbox-sub">Rename "Transfer details" shown on transaction page</div>
            <input type="text" class="toolbox-input" id="tbTransferTitle" value="${esc(tb.transferDetailsTitle)}">
          </div>
          <div class="toolbox-field-group">
            <label class="toolbox-label">Transfer label</label>
            <div class="toolbox-sub">Rename "LIVE rewards transfer to TikTok"</div>
            <input type="text" class="toolbox-input" id="tbTransferLabel" value="${esc(tb.transferLabel)}">
          </div>
        </div>

        <!-- Currency -->
        <div class="toolbox-card">
          <div class="toolbox-label">Currency</div>
          <div class="toolbox-sub">Select display currency for amounts</div>
          <div class="toolbox-btn-group grid-5">
            ${['USD', 'EUR', 'TRY', 'GBP', 'BRL'].map(cur => {
              const syms = { USD: '$ USD', EUR: '€ EUR', TRY: '₺ TRY', GBP: '£ GBP', BRL: 'R$ BRL' };
              return `<button class="tb-btn ${tb.currency === cur ? 'active' : ''}" onclick="setToolbox('currency', '${cur}')">${syms[cur]}</button>`;
            }).join('')}
          </div>
        </div>

        <!-- Follower text size -->
        <div class="toolbox-card">
          <div class="toolbox-label">Follower text size</div>
          <div class="toolbox-sub">Adjust follower count font size (1-6)</div>
          <div class="toolbox-btn-group grid-6">
            ${[1, 2, 3, 4, 5, 6].map(num => `
              <button class="tb-btn ${tb.followerTextSize === num ? 'active' : ''}" onclick="setToolbox('followerTextSize', ${num})">${num}</button>
            `).join('')}
          </div>
        </div>

        <!-- Payment Loading -->
        <div class="toolbox-card">
          <div class="toolbox-toggle-row">
            <div>
              <div class="toolbox-label">Payment Loading</div>
              <div class="toolbox-sub" style="margin-bottom:0;">Animation after confirm</div>
            </div>
            <label class="ios-switch">
              <input type="checkbox" ${tb.paymentLoading.enabled ? 'checked' : ''} onchange="setToolboxPayment('enabled', this.checked)">
              <span class="ios-slider"></span>
            </label>
          </div>
          <div class="toolbox-btn-group grid-5" style="margin-top:16px;">
            ${['Classic', 'Modern', 'Ring', 'Dots', 'Squares'].map(s => `
              <button class="tb-btn ${tb.paymentLoading.style.toLowerCase() === s.toLowerCase() ? 'active' : ''}" onclick="setToolboxPayment('style', '${s.toLowerCase()}')">${s}</button>
            `).join('')}
          </div>
          <div class="toolbox-sub" style="margin-top:14px; margin-bottom:6px;">Duration</div>
          <div class="toolbox-btn-group grid-5">
            ${[1, 2, 3, 4, 5].map(d => `
              <button class="tb-btn ${tb.paymentLoading.duration === d ? 'active' : ''}" onclick="setToolboxPayment('duration', ${d})">${d}s</button>
            `).join('')}
          </div>
          <div class="tb-link" onclick="previewLoadingAnimation(state.toolbox.paymentLoading.style)">Preview animation</div>
        </div>

        <!-- Search Loading -->
        <div class="toolbox-card">
          <div class="toolbox-toggle-row">
            <div>
              <div class="toolbox-label">Search Loading</div>
              <div class="toolbox-sub" style="margin-bottom:0;">Animation when loading search results</div>
            </div>
            <label class="ios-switch">
              <input type="checkbox" ${tb.searchLoading.enabled ? 'checked' : ''} onchange="setToolboxSearch('enabled', this.checked)">
              <span class="ios-slider"></span>
            </label>
          </div>
          <div class="toolbox-btn-group grid-5" style="margin-top:16px;">
            ${['Classic', 'Modern', 'Ring', 'Dots', 'Squares'].map(s => `
              <button class="tb-btn ${tb.searchLoading.style.toLowerCase() === s.toLowerCase() ? 'active' : ''}" onclick="setToolboxSearch('style', '${s.toLowerCase()}')">${s}</button>
            `).join('')}
          </div>
          <div class="toolbox-sub" style="margin-top:14px; margin-bottom:6px;">Duration</div>
          <div class="toolbox-btn-group grid-5">
            ${[1, 2, 3, 4, 5].map(d => `
              <button class="tb-btn ${tb.searchLoading.duration === d ? 'active' : ''}" onclick="setToolboxSearch('duration', ${d})">${d}s</button>
            `).join('')}
          </div>
          <div class="tb-link" onclick="previewLoadingAnimation(state.toolbox.searchLoading.style)">Preview animation</div>
        </div>

        <!-- Save Button -->
        <div style="padding: 10px 0 30px;">
          <button class="btn primary" style="height:68px; border-radius:34px; font-size:22px;" onclick="saveToolbox()">Save</button>
        </div>
      </div>
    </div>
  `;
}

function setToolbox(key, val) {
  state.toolbox[key] = val;
  render();
}

function setToolboxPayment(key, val) {
  state.toolbox.paymentLoading[key] = val;
  render();
}

function setToolboxSearch(key, val) {
  state.toolbox.searchLoading[key] = val;
  render();
}

function saveToolbox() {
  const avail = parseFloat(document.getElementById('tbAvailableRewards')?.value);
  if (!isNaN(avail) && avail >= 0) {
    state.balance = avail;
  }
  const upcoming = parseFloat(document.getElementById('tbUpcomingRewards')?.value);
  if (!isNaN(upcoming) && upcoming >= 0) {
    state.upcomingBalance = upcoming;
  }
  const wTitle = document.getElementById('tbWithdrawalName')?.value;
  if (wTitle) state.toolbox.confirmWithdrawalTitle = wTitle;
  const tTitle = document.getElementById('tbTransferTitle')?.value;
  if (tTitle) state.toolbox.transferDetailsTitle = tTitle;
  const tLabel = document.getElementById('tbTransferLabel')?.value;
  if (tLabel) state.toolbox.transferLabel = tLabel;

  state.screen = 'home';
  render();
}

function render() {
  const root = document.getElementById('app');
  if (!root) return;

  // Render top notification banner container
  let notifEl = document.getElementById('topNotification');
  if (!notifEl) {
    notifEl = document.createElement('div');
    notifEl.className = 'top-notification';
    notifEl.id = 'topNotification';
    notifEl.onclick = hideTopNotification;
    notifEl.innerHTML = `
      <div class="top-notif-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.901 2.868 2.893 2.893 0 0 1-2.892-2.892 2.896 2.896 0 0 1 2.892-2.894c.277 0 .542.04.794.113V9.38a6.34 6.34 0 0 0-.794-.052 6.353 6.353 0 0 0-6.35 6.35 6.353 6.353 0 0 0 6.35 6.35 6.354 6.354 0 0 0 6.349-6.35V8.847a8.214 8.214 0 0 0 4.767 1.503V6.905c-.34 0-.677-.074-.995-.219z"/>
        </svg>
      </div>
      <div class="top-notif-content">
        <div class="top-notif-header">
          <span class="top-notif-title">TikTok LIVE Rewards</span>
          <span class="top-notif-time">now</span>
        </div>
        <div class="top-notif-message">Successfully sent coins to recipient</div>
      </div>
    `;
    document.body.appendChild(notifEl);
  }

  if (state.screen === 'home') {
    root.innerHTML = home();

    // Natural decrement animation on home dashboard ONLY when returning from exchange as requested
    if (state.animateHome && state.lastDeduction) {
      const { startBalance, endBalance, startCoins, endCoins } = state.lastDeduction;
      state.animateHome = false;
      state.lastDeduction = null;

      const homeBal = document.getElementById('homeBigBalance');
      const homeCardBal = document.getElementById('homeCardBalance');
      const homeCoins = document.getElementById('homeBigCoins');

      if (homeBal) {
        homeBal.style.transition = 'color 0.25s ease';
        homeBal.style.color = '#fe2c55';
        homeBal.textContent = moneyFmt(startBalance);
      }
      if (homeCardBal) {
        homeCardBal.style.transition = 'color 0.25s ease';
        homeCardBal.style.color = '#fe2c55';
        homeCardBal.textContent = moneyFmt(startBalance);
      }
      if (homeCoins) {
        homeCoins.style.transition = 'color 0.25s ease';
        homeCoins.style.color = '#fe2c55';
        homeCoins.innerHTML = `= ${moneyFmt(startBalance)} ( <span class="coin">🪙</span> ${coinFmt(startCoins)} )`;
      }

      // Smooth count-down animation
      setTimeout(() => {
        animateNumber({
          startVal: startBalance,
          endVal: endBalance,
          duration: 1300,
          onUpdate: (val, progress) => {
            const curCoins = Math.round(startCoins - (startCoins - endCoins) * progress);
            if (homeBal) homeBal.textContent = moneyFmt(val);
            if (homeCardBal) homeCardBal.textContent = moneyFmt(val);
            if (homeCoins) homeCoins.innerHTML = `= ${moneyFmt(val)} ( <span class="coin">🪙</span> ${coinFmt(curCoins)} )`;
          },
          onDone: () => {
            state.balance = endBalance;
            state.coins = endCoins;
            if (homeBal) {
              homeBal.style.color = 'var(--ink)';
              homeBal.textContent = moneyFmt(endBalance);
            }
            if (homeCardBal) {
              homeCardBal.style.color = 'var(--ink)';
              homeCardBal.textContent = moneyFmt(endBalance);
            }
            if (homeCoins) {
              homeCoins.style.color = 'var(--muted)';
              homeCoins.innerHTML = `= ${moneyFmt(endBalance)} ( <span class="coin">🪙</span> ${coinFmt(endCoins)} )`;
            }
          }
        });
      }, 200);
    }
  } else if (state.screen === 'exchange') {
    root.innerHTML = exchange();
  } else if (state.screen === 'success') {
    root.innerHTML = success();
  } else if (state.screen === 'toolbox') {
    root.innerHTML = toolbox();
  }
}

// Initial render
render();
