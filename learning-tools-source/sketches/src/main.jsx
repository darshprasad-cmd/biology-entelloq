import React, {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Excalidraw,MainMenu,convertToExcalidrawElements,restoreElements,serializeAsJSON,exportToBlob,exportToSvg,CaptureUpdateAction} from '@excalidraw/excalidraw';
import fontCSS from '../font-css.json';
import {LIMITS,parseScene,validateScene,starter} from './scene.js';
const fontStyle=document.createElement('style');fontStyle.dataset.entelloqFonts='local';fontStyle.textContent=fontCSS;document.head.append(fontStyle);
const params=new URLSearchParams(location.search),subject=params.get('subject')==='biology'?'biology':'physics';
const subjectName=subject==='biology'?'Biology':'Physics',key=`entelloq:scientific-sketch:v1:${subject}`;
let storage;try{storage=window.localStorage;}catch{}
let initialStored=null;
let initial,initialMessage='Changes save in this browser. Export a scene to keep a separate copy.';
try{const saved=storage?.getItem(key)||null;initialStored=saved;initial=saved?parseScene(saved):null;}catch{initialMessage='The saved scene could not be opened. It has been left untouched; import an exported copy or begin a new drawing.';}
const savedUnreadable=!!storage&&!initial&&initialMessage.startsWith('The saved');
if(!storage)initialMessage='Browser storage is unavailable. Your drawing stays in this tab; export it before leaving.';
const needsStarter=!initial;
if(!initial)initial={elements:[],appState:{viewBackgroundColor:'#ffffff',currentItemFontFamily:5},files:{}};
const initialPromise=(async()=>{await document.fonts.load('20px Excalifont',starter(subject).filter(e=>e.type==='text').map(e=>e.text).join(' '));return {...initial,elements:needsStarter?convertToExcalidrawElements(starter(subject)):initial.elements,scrollToContent:true};})();
const timers=new Set(),urls=new Set();
function later(fn,delay){const timer=setTimeout(()=>{timers.delete(timer);fn();},delay);timers.add(timer);return timer;}
function download(name,blob){const url=URL.createObjectURL(blob);urls.add(url);const a=document.createElement('a');a.href=url;a.download=name;a.click();const timer=setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);timers.delete(timer);},3000);timers.add(timer);}
function validTheme(value){return value==='dark'?'dark':'light';}
function applyTokens(theme,tokens={}){document.documentElement.dataset.theme=theme;for(const k of ['accent','surface','text','muted','border','background'])if(typeof tokens[k]==='string'&&CSS.supports('color',tokens[k]))document.documentElement.style.setProperty(`--sketch-${k}`,tokens[k]);}
document.documentElement.dataset.subject=subject;
applyTokens(validTheme(params.get('theme')),{accent:subject==='biology'?'#087f5b':'#2556dc'});
function App(){
 const [api,setAPI]=useState(null),[theme,setTheme]=useState(validTheme(params.get('theme'))),[status,setStatus]=useState(initialMessage),[busy,setBusy]=useState(false),[canRestore,setCanRestore]=useState(false),[conflict,setConflict]=useState(savedUnreadable),[focused,setFocused]=useState(false);
 const focusButton=useRef(null);
 const latest=useRef(null),lastSaved=useRef(initialStored),pending=useRef(null),previous=useRef(null),blocked=useRef(savedUnreadable),input=useRef(null),alive=useRef(true),initialFit=useRef(false);
 const serialize=()=>{if(!api)throw new Error('The editor is still opening.');return serializeAsJSON(api.getSceneElements(),api.getAppState(),{},'local');};
 function flush(){if(!latest.current||blocked.current)return;try{if(latest.current!==lastSaved.current){if(storage && storage.getItem(key)!==lastSaved.current){blocked.current=true;setConflict(true);setStatus('Another tab updated the saved sketch. Export your draft, or choose Save this tab to replace that copy.');return;}storage?.setItem(key,latest.current);lastSaved.current=latest.current;if(alive.current)setStatus(storage?'Saved in this browser · export a scene for a backup.':'Storage unavailable · export this scene before leaving.');}}catch{if(alive.current)setStatus('This browser could not save the drawing. Export a scene before leaving.');}}
 function change(elements,appState){
  try{clearTimeout(pending.current);latest.current=null;const next=serializeAsJSON(elements,appState,{},'local');parseScene(next);latest.current=next;pending.current=setTimeout(flush,600);}catch(error){clearTimeout(pending.current);latest.current=null;setStatus(`Automatic saving paused: ${error.message} Undo the unsupported change or export the current scene for use in Excalidraw.`);}
 }
 function fitDrawing(){api?.scrollToContent(api.getSceneElements(),{fitToViewport:true,animate:false,viewportZoomFactor:.9,canvasOffsets:{top:80,bottom:64,left:16,right:16}});}
 useEffect(()=>{if(!api||initialFit.current)return;initialFit.current=true;const t=later(fitDrawing,100);return()=>clearTimeout(t);},[api]);
 useEffect(()=>{
  if(!focused)return;
  const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const escape=e=>{
   if(e.key!=='Escape'||e.defaultPrevented)return;
   const state=api?.getAppState();
   if(state?.openMenu){e.preventDefault();e.stopPropagation();api.updateScene({appState:{openMenu:null}});return;}
   // Let the editor finish text, a shape, or its own menu before leaving focus.
   if(e.target.closest?.('input,textarea,select,[contenteditable=true]')||state?.openMenu||state?.openPopup||state?.openDialog||state?.openSidebar||state?.editingTextElement||state?.editingLinearElement||state?.editingFrame||state?.newElement||state?.multiElement||state?.isResizing||state?.isRotating||state?.activeTool?.type!=='selection')return;
   e.preventDefault();e.stopPropagation();setFocused(false);focusButton.current?.focus();
  };
  document.addEventListener('keydown',escape,true);
  return()=>{document.body.style.overflow=oldOverflow;document.removeEventListener('keydown',escape,true);};
 },[focused,api]);
 useEffect(()=>{
  const message=e=>{if(e.source!==parent||parent===window||e.origin!==location.origin)return;if(['entelloq:theme','entelloq-learning:theme','entelloq-sketch:theme'].includes(e.data?.type)){const next=validTheme(e.data.theme);setTheme(next);applyTokens(next,e.data.tokens);}};
  const changed=e=>{if(e.key===key&&e.newValue!==lastSaved.current){blocked.current=true;setConflict(true);setStatus('Another tab changed this subject’s saved sketch. Your edits are safe here. Export them, or choose Save this tab to replace the browser copy.');}};
  const hide=()=>flush();
  window.EntelloqSketch={flush,destroy(){flush();root.unmount();for(const t of timers)clearTimeout(t);for(const u of urls)URL.revokeObjectURL(u);}};
  window.addEventListener('message',message);window.addEventListener('storage',changed);window.addEventListener('pagehide',hide);window.addEventListener('beforeunload',hide);
  if(parent!==window)parent.postMessage({type:'entelloq-sketch:ready',subject},location.origin);
  return()=>{alive.current=false;flush();clearTimeout(pending.current);window.removeEventListener('message',message);window.removeEventListener('storage',changed);window.removeEventListener('pagehide',hide);window.removeEventListener('beforeunload',hide);};
 },[]);
 function replace(elements,appState={},label='the new scene'){
  if(!api)return;
  if(api.getSceneElements().length&&!window.confirm(`Replace this drawing with ${label}? A copy will be available with Restore previous during this visit. Export a scene first for a permanent backup.`))return;
  previous.current=JSON.parse(serialize());setCanRestore(true);
  api.updateScene({elements:restoreElements(elements,null),appState:{...appState,selectedElementIds:{},selectedGroupIds:{}},captureUpdate:CaptureUpdateAction.IMMEDIATELY});
  api.history.clear();later(fitDrawing,50);setStatus(`${label} opened. Restore previous can recover the replaced drawing during this visit.`);
 }
 async function importFile(e){const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>LIMITS.bytes)throw new Error('Choose a scene smaller than 2 MB.');const scene=parseScene(await file.text());replace(scene.elements,scene.appState,'the imported scene');}catch(error){setStatus(`Import stopped: ${error.message}`);}}
 async function exportFile(kind){setBusy(true);try{
  const text=serialize();if(kind==='scene'){download(`${subject}-scientific-sketch.excalidraw`,new Blob([text],{type:'application/vnd.excalidraw+json'}));setStatus('Editable scene exported. It includes this drawing’s shapes, arrows and text.');return;}
  const scene=validateScene(JSON.parse(text));if(!scene.elements.length)throw new Error('Add something to the drawing first.');
  await document.fonts.ready;
  const options={elements:restoreElements(scene.elements,null),files:{},appState:{...api.getAppState(),exportBackground:true,exportWithDarkMode:false,exportEmbedScene:false},maxWidthOrHeight:2048};
  if(kind==='png'){download(`${subject}-scientific-sketch.png`,await exportToBlob({...options,mimeType:'image/png'}));}
  else {const svg=await exportToSvg({...options,skipInliningFonts:true});const style=document.createElementNS('http://www.w3.org/2000/svg','style');style.textContent=fontCSS;svg.insertBefore(style,svg.firstChild);download(`${subject}-scientific-sketch.svg`,new Blob([svg.outerHTML],{type:'image/svg+xml'}));}
  setStatus(`${kind.toUpperCase()} exported from the drawing engine. Keep an editable scene too if you want to revise it later.`);
 }catch(error){setStatus(`Export stopped: ${error.message}`);}finally{setBusy(false);}}
 function restorePrevious(){if(!previous.current)return;const recovery=previous.current;if(api.getSceneElements().length&&!confirm('Restore the previous drawing? The current drawing will become the next Restore previous copy.'))return;previous.current=JSON.parse(serialize());api.updateScene({elements:restoreElements(recovery.elements,null),appState:{...recovery.appState,selectedElementIds:{}},captureUpdate:CaptureUpdateAction.IMMEDIATELY});api.history.clear();later(fitDrawing,50);}
 function saveThisTab(){if(confirm('Replace the browser’s saved sketch with this tab’s drawing? Export either drawing first if you need both.')){try{const snapshot=serialize();parseScene(snapshot);blocked.current=false;setConflict(false);lastSaved.current=storage?.getItem(key)||null;latest.current=snapshot;flush();}catch(error){setStatus(`Cannot save this draft: ${error.message} Export it for use in Excalidraw, or undo the unsupported change.`);}}}
 const statusKind=conflict||/paused|could not|unavailable|stopped|Cannot|not be opened/i.test(status)?'warning':busy?'working':'ready';
 return <section className={`sketch-shell${focused?' has-focus':''}`} data-subject={subject}>
  <header className="sketch-header"><div><p className="sketch-kicker">{subjectName} · visual reasoning</p><h1>Draw what you mean.</h1></div><span className="sketch-pill">Local sketch</span></header>
  <p className="sketch-description">Sketch an idea, label your reasoning and keep an editable copy.</p>
  <div className="sketch-actions" role="group" aria-label="Sketch actions">
   <div className="sketch-action-group" role="group" aria-label="Start or replace a drawing">
    {subject==='physics'?<button disabled={!api} onClick={()=>replace(convertToExcalidrawElements(starter(subject)),{},'the force diagram')}>Force diagram</button>:<><button disabled={!api} onClick={()=>replace(convertToExcalidrawElements(starter(subject,'cell')),{},'the cell diagram')}>Cell diagram</button><button disabled={!api} onClick={()=>replace(convertToExcalidrawElements(starter(subject,'enzyme')),{},'the enzyme pathway')}>Enzyme pathway</button></>}
    <button disabled={!api} onClick={()=>replace([],{},'a blank canvas')}>Blank canvas</button>{canRestore&&<button onClick={restorePrevious}>Restore previous</button>}
   </div>
   <div className="sketch-action-group sketch-copy-actions" role="group" aria-label="Import or keep a copy">
    <button className="primary" disabled={!api||busy} onClick={()=>exportFile('scene')}>Export scene</button><button disabled={!api||busy} onClick={()=>input.current.click()}>Import scene</button><button disabled={!api||busy} onClick={()=>exportFile('png')}>Export PNG</button><button disabled={!api||busy} onClick={()=>exportFile('svg')}>Export SVG</button>
   </div>
   {conflict&&<button onClick={saveThisTab}>Save this tab</button>}
   <input className="sketch-file" ref={input} type="file" aria-label="Choose Excalidraw scene" accept=".excalidraw,application/vnd.excalidraw+json,application/json" onChange={importFile}/>
  </div>
  <div className={`sketch-workspace${focused?' is-focused':''}`}>
   <div className="sketch-workspace-bar"><span className="sketch-workspace-label">Your drawing <span>· {subjectName}</span></span><div className="sketch-view-actions" role="group" aria-label="Drawing view"><button disabled={!api} onClick={fitDrawing}>Fit drawing</button><button ref={focusButton} aria-pressed={focused} disabled={!api} onClick={()=>setFocused(!focused)}>{focused?'Exit focus':'Focus canvas'}</button></div></div>
   <p className="sketch-status" data-kind={statusKind} role="status" aria-live="polite" aria-atomic="true">{status}</p>
  <div className="sketch-editor" role="region" aria-label="Editable scientific drawing" aria-describedby="sketch-view-hint" onDragOverCapture={e=>e.preventDefault()} onDropCapture={async e=>{e.preventDefault();e.stopPropagation();const file=e.dataTransfer.files?.[0];if(!file){setStatus('Use Import scene to bring in an editable drawing.');return;}try{if(file.size>LIMITS.bytes)throw new Error('Choose a scene smaller than 2 MB.');const scene=parseScene(await file.text());replace(scene.elements,scene.appState,'the imported scene');}catch(error){setStatus(`Import stopped: ${error.message}`);}}}>
   <Excalidraw excalidrawAPI={setAPI} initialData={initialPromise} onChange={change} theme={theme} name={`${subject}-scientific-sketch`} langCode="en" aiEnabled={false} isCollaborating={false} autoFocus={false} handleKeyboardGlobally={false} showDeprecatedFonts={false} validateEmbeddable={false} UIOptions={{canvasActions:{clearCanvas:false,export:false,loadScene:false,saveToActiveFile:false,saveAsImage:false,toggleTheme:false},tools:{image:false}}} onLinkOpen={(element,event)=>event.preventDefault()} onPaste={()=>{setStatus('Use Import scene for a checked diagram. Text can be typed directly with the Text tool.');return false;}}>
    <MainMenu><MainMenu.Item onSelect={fitDrawing}>Fit drawing</MainMenu.Item><MainMenu.Item onSelect={()=>api.updateScene({appState:{zenModeEnabled:!api.getAppState().zenModeEnabled}})}>Toggle canvas controls</MainMenu.Item><MainMenu.Item onSelect={()=>api.updateScene({appState:{gridModeEnabled:!api.getAppState().gridModeEnabled}})}>Toggle grid</MainMenu.Item><MainMenu.DefaultItems.Help/></MainMenu>
   </Excalidraw>
  </div>
   <p className="sketch-view-hint" id="sketch-view-hint"><span>Drag with the hand tool to move. Pinch to zoom.</span><span>{focused?'Press Escape to leave focus.':'Fit drawing brings everything back into view.'}</span></p>
  </div>
  <div className="sketch-footer"><span>Diagramming with Excalidraw · no cloud sync</span><span>Illustration, not a numerical simulation</span></div>
  <details className="sketch-help"><summary>Drawing controls, saving and scientific limits</summary><p>Select a tool with the toolbar or press V (select), R (rectangle), O (ellipse), A (arrow), P (freehand), or T (text). Press Escape to return to selection. Select an element to change its style; use Ctrl/Cmd+Z to undo. The canvas supports touch, pan and zoom. The drawing area is visual; the toolbar and file controls are keyboard accessible.</p><p>Each subject has its own browser copy. It is not attached to a named notebook and does not sync to a class or another device. Export an editable .excalidraw scene to keep or share it. Imports are limited to 2 MB and 1,000 elements; attachments, links and web embeds are excluded. PNG exports are capped at 2,048 pixels on the longer side. Fonts are bundled for offline use; unsupported glyphs use system fonts.</p><p>Starter drawings are original explanatory schematics. Arrows, distances, colours and cell proportions are illustrative. Editing a drawing does not calculate a force, validate an answer, or simulate a biological process. The app’s numerical tools remain separate.</p><p>Engine: <a href="https://github.com/excalidraw/excalidraw" target="_blank" rel="noopener noreferrer">Excalidraw 0.18.1</a> · <a href="THIRD-PARTY-NOTICES.md" target="_blank" rel="noopener noreferrer">software and font licences</a></p></details>
 </section>;
}
class Boundary extends React.Component{constructor(p){super(p);this.state={failed:false};}static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className="sketch-error"><h1>The drawing editor could not open.</h1><p>Your browser’s saved scene has not been deleted. Reload the page to try again.</p></div>:this.props.children;}}
const root=createRoot(document.querySelector('#sketch-app'));root.render(<Boundary><App/></Boundary>);
window.addEventListener('pagehide',e=>{if(e.persisted)return;root.unmount();for(const t of timers)clearTimeout(t);for(const u of urls)URL.revokeObjectURL(u);});
