import * as Y from 'yjs';
import { assertSubject } from './catalog.js';
const MAX_TEXT = 50000;
export const encode64 = bytes => { let s=''; for (const b of bytes) s+=String.fromCharCode(b); return btoa(s); };
export const decode64 = text => { if (typeof text !== 'string' || text.length > 2800000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) throw new Error('Invalid notebook data.'); return Uint8Array.from(atob(text), c=>c.charCodeAt(0)); };
export class Notebook {
  constructor(subject, id, { storage = null, channelFactory = name => typeof BroadcastChannel === 'function' ? new BroadcastChannel(name) : null } = {}) {
    this.subject = assertSubject(subject); if (!/^[a-z0-9-]{1,48}$/.test(id)) throw new Error('Notebook name: use 1–48 lowercase letters, numbers or hyphens.');
    this.id = id; this.key = `entelloq.next.notebook.v1.${subject}.${id}`; this.doc = new Y.Doc(); this.text = this.doc.getText('notes'); this.storage = storage; this.warning = storage ? '' : 'Session only. Export to keep your notebook.'; this.listeners = new Set();
    try { const saved = storage?.getItem(this.key); if (saved) this.import(JSON.parse(saved)); } catch { this.warning = 'Saved notebook could not be read. Stored data is preserved; export this session before leaving.'; this.storage = null; }
    this.undo = new Y.UndoManager(this.text, { trackedOrigins: new Set(['editor']), captureTimeout: 400 });
    this.channel = channelFactory(this.key);
    this.doc.on('update', (update, origin) => {
      try { this.storage?.setItem(this.key, JSON.stringify(this.export())); if (!this.storage) this.warning ||= 'Session only. Export to keep your notebook.'; } catch { this.warning = 'Storage unavailable. Export to keep your notebook.'; }
      if (origin !== 'remote') this.channel?.postMessage({ type:'update', update });
      for (const listener of this.listeners) listener(this.text.toString(), origin);
    });
    if (this.channel) { this.channel.onmessage = e => {
      try { if (e.data?.type === 'hello') { if (e.data.update instanceof Uint8Array && e.data.update.length <= 2000000) this.apply(e.data.update,'remote'); this.channel.postMessage({ type:'update',update:Y.encodeStateAsUpdate(this.doc) }); }
      else if (e.data?.type === 'update' && e.data.update instanceof Uint8Array && e.data.update.length <= 2000000) this.apply(e.data.update, 'remote'); }
      catch { this.warning = 'A notebook update was invalid and was ignored.'; }
    }; this.channel.postMessage({ type:'hello',update:Y.encodeStateAsUpdate(this.doc) }); }
  }
  setText(value) {
    if (typeof value !== 'string' || value.length > MAX_TEXT) throw new Error('Keep this notebook under 50,000 characters. Export an archive and start another when needed.');
    const old = this.text.toString(); let start=0, end=0;
    while (start < old.length && start < value.length && old[start] === value[start]) start++;
    while (end < old.length-start && end < value.length-start && old[old.length-1-end] === value[value.length-1-end]) end++;
    this.doc.transact(()=>{ if (old.length-start-end) this.text.delete(start,old.length-start-end); if (value.length-start-end) this.text.insert(start,value.slice(start,value.length-end)); },'editor');
  }
  export() { return { schema:'entelloq-notebook-v1', subject:this.subject, notebookId:this.id, update:encode64(Y.encodeStateAsUpdate(this.doc)) }; }
  apply(update, origin) {
    // Validate the combined state in a disposable document before mutating the live notebook.
    const probe = new Y.Doc();
    try { Y.applyUpdate(probe,Y.encodeStateAsUpdate(this.doc)); Y.applyUpdate(probe,update); if (probe.getText('notes').length > MAX_TEXT || [...probe.share.keys()].some(k=>k!=='notes')) throw new Error('Notebook update is too large or unsupported.'); }
    finally { probe.destroy(); }
    Y.applyUpdate(this.doc,update,origin);
  }
  import(data) { if (data?.schema !== 'entelloq-notebook-v1' || data.subject !== this.subject || data.notebookId !== this.id) throw new Error('Import a file for this subject and notebook name. Open the matching name first.'); this.apply(decode64(data.update),'import'); }
  subscribe(listener) { this.listeners.add(listener); return ()=>this.listeners.delete(listener); }
  selection(start,end) { return [Y.createRelativePositionFromTypeIndex(this.text,start),Y.createRelativePositionFromTypeIndex(this.text,end)]; }
  resolveSelection(relative) { return relative.map(p=>Y.createAbsolutePositionFromRelativePosition(p,this.doc)?.index ?? 0); }
  destroy() { this.channel?.close(); this.listeners.clear(); this.undo.destroy(); this.doc.destroy(); }
}
