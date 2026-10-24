import { createEmptyCard, fsrs } from 'ts-fsrs';
import { catalog, CATALOG_VERSION, assertSubject } from './catalog.js';
const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: false });
export const REVIEW_SCHEMA = 'entelloq-review-v1';
function validTime(value) { return typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value; }
function browserLocks() { try { return globalThis.navigator?.locks || null; } catch { return null; } }
export class ReviewSession {
  constructor(subject, { storage = null, now = () => new Date(), locks = browserLocks() } = {}) {
    this.subject = assertSubject(subject); this.storage = storage; this.now = now;
    this.locks = locks; this.pending = false;
    this.key = `entelloq.next.review.v1.${subject}`; this.events = []; this.revealed = null; this.startedAt = this.now(); this.warning = storage ? '' : 'Session only: browser storage is unavailable. Export to keep your history.';
    try { const saved = storage?.getItem(this.key); if (saved) this.events = this.validate(JSON.parse(saved)); }
    catch { this.warning = 'Saved review history could not be loaded. Existing stored data has been preserved; export this session before leaving.'; this.storage = null; }
    if (this.storage && typeof this.locks?.request !== 'function') this.sessionOnly();
  }
  validate(data) {
    if (data?.schema !== REVIEW_SCHEMA || data.subject !== this.subject || data.catalogVersion !== CATALOG_VERSION || !Array.isArray(data.events) || data.events.length > 10000) throw new Error('This file is not a compatible review history for this subject.');
    const seen = new Set(); const ids = new Set(catalog[this.subject].map(x => x.id));
    return data.events.map(event => {
      if (!event || typeof event.id !== 'string' || !/^[\w-]{1,80}$/.test(event.id) || seen.has(event.id) || !ids.has(event.cardId) || ![1,2,3,4].includes(event.rating) || !validTime(event.at) || Date.parse(event.at) < Date.UTC(2000,0,1) || Date.parse(event.at) > this.now().getTime() + 300000) throw new Error('Review history contains an invalid, duplicate or future-dated attempt. Check your device clock.');
      seen.add(event.id); return { id: event.id, cardId: event.cardId, rating: event.rating, at: event.at };
    }).sort((a,b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id));
  }
  snapshot() { return { schema: REVIEW_SCHEMA, catalogVersion: CATALOG_VERSION, subject: this.subject, events: this.events }; }
  sessionOnly() { this.storage = null; this.warning = 'Session only: safe shared storage is unavailable in this browser context. Existing saved history is unchanged. Export to keep new attempts.'; }
  merge(incoming) {
    const combined = new Map(this.events.map(x => [x.id,x]));
    for (const event of incoming) { const old = combined.get(event.id); if (old && JSON.stringify(old) !== JSON.stringify(event)) throw new Error('An attempt ID conflicts with existing history.'); combined.set(event.id,event); }
    return this.validate({ ...this.snapshot(), events: [...combined.values()] });
  }
  async change(action) {
    if (this.pending) throw new Error('A review change is being saved. Please wait.');
    this.pending = true;
    const apply = () => {
      // Read, merge and write under the same origin-wide lock. Re-reading alone
      // would still lose events when two browser processes write simultaneously.
      if (this.storage) {
        try { const saved = this.storage.getItem(this.key); if (saved) this.events = this.merge(this.validate(JSON.parse(saved))); }
        catch { this.storage = null; this.warning = 'Saved review history could not be reconciled. Existing stored data has been preserved; export this session before leaving.'; }
      }
      const result = action();
      try { if (this.storage) { this.storage.setItem(this.key, JSON.stringify(this.snapshot())); this.warning = ''; } else this.warning ||= 'Session only: browser storage is unavailable. Export to keep your history.'; }
      catch { this.warning = 'Browser storage is full or blocked. Export to keep this session’s history.'; }
      return result;
    };
    try {
      if (!this.storage) return apply();
      let entered = false;
      try { return await this.locks.request(this.key, { mode:'exclusive' }, () => { entered = true; return apply(); }); }
      catch (error) {
        // Some file/opaque contexts expose locks but reject requests. Only a
        // failure before the callback permits a safe session-only retry.
        if (entered) throw error;
        this.sessionOnly(); return apply();
      }
    } finally { this.pending = false; }
  }
  state(id) {
    const attempts = this.events.filter(x => x.cardId === id);
    let card = createEmptyCard(attempts[0]?.at || this.startedAt);
    for (const attempt of attempts) card = scheduler.next(card, new Date(attempt.at), attempt.rating).card;
    return card;
  }
  queue() { const now = this.now().getTime(); return catalog[this.subject].map(item => ({ ...item, card: this.state(item.id) })).filter(x => x.card.due.getTime() <= now).sort((a,b) => a.card.due - b.card.due); }
  nextDue() { return Math.min(...catalog[this.subject].map(x => this.state(x.id).due.getTime())); }
  reveal(id) { if (!this.queue().some(x => x.id === id)) throw new Error('This prompt is not due.'); this.revealed = id; }
  async rate(id, rating) {
    if (this.revealed !== id || ![1,2,3,4].includes(rating)) throw new Error('Reveal the explanation after attempting recall, then choose a retrieval rating.');
    return this.change(() => {
      const time = this.now(); const last = this.events.filter(x => x.cardId === id).at(-1);
      if (last && time.getTime() < Date.parse(last.at)) throw new Error('Your clock is earlier than the last attempt. Correct it before reviewing.');
      if (!this.queue().some(x => x.id === id)) { this.revealed = null; throw new Error('This prompt has already been scheduled in another tab. The queue has been refreshed.'); }
      const event = { id: crypto.randomUUID(), cardId: id, rating, at: time.toISOString() };
      this.events = this.validate({ ...this.snapshot(), events:[...this.events,event] });
      this.revealed = null; return this.state(id);
    });
  }
  async import(data) {
    const incoming = this.validate(data);
    return this.change(() => { this.events = this.merge(incoming); this.revealed = null; return incoming.length; });
  }
}
