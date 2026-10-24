export const LIMITS = {bytes:2_000_000,elements:1000,points:30000,text:100000};
const TYPES = new Set(['rectangle','ellipse','diamond','line','arrow','text','freedraw','frame']);
const FONTS = new Set([5,6,7,8]);
export function validateScene(data) {
  if (!data || data.type !== 'excalidraw' || !Array.isArray(data.elements)) throw new Error('Choose an Excalidraw scene (.excalidraw).');
  if (data.elements.length > LIMITS.elements) throw new Error('This scene exceeds the 1,000 element limit.');
  if (data.files && Object.keys(data.files).length) throw new Error('Image attachments are not supported here. Import a diagram made of shapes, arrows and text.');
  let nodes=0,points=0,chars=0;
  const walk=(v,depth=0)=>{
    if (++nodes>150000 || depth>12) throw new Error('The scene is too complex.');
    if(typeof v==='number' && (!Number.isFinite(v)||Math.abs(v)>1e15))throw new Error('The scene has invalid numbers.');
    if(typeof v==='string' && v.length>10000)throw new Error('A scene field is too long.');
    if(v && typeof v==='object') for(const [k,value]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))throw new Error('Unsupported scene field.');walk(value,depth+1);}
  };
  walk(data);
  const ids=new Set();
  const elements=data.elements.map(raw=>{
    if(!raw || !TYPES.has(raw.type))throw new Error('Only shapes, arrows, freehand lines and text are supported. Images and web embeds are excluded.');
    if(typeof raw.id!=='string'||raw.id.length>100||ids.has(raw.id))throw new Error('The scene has an invalid or repeated element ID.');
    ids.add(raw.id);
    for(const k of ['x','y','width','height'])if(!Number.isFinite(raw[k])||Math.abs(raw[k])>100000)throw new Error('Diagram coordinates must be within 100,000 canvas units.');
    if(raw.width<0||raw.height<0)throw new Error('Diagram sizes must be non-negative.');
    if(raw.link)throw new Error('Linked elements are excluded. Remove links before importing.');
    for(const color of ['strokeColor','backgroundColor'])if(raw[color] && !/^(#[0-9a-f]{3,8}|transparent|black|white)$/i.test(raw[color]))throw new Error('Unsupported drawing colour. Use a hex colour or transparent.');
    const value=structuredClone(raw);value.link=null;delete value.customData;
    if(value.points){if(!Array.isArray(value.points))throw new Error('Invalid stroke points.');points+=value.points.length;for(const p of value.points)if(!Array.isArray(p)||p.length!==2||p.some(x=>!Number.isFinite(x)||Math.abs(x)>100000))throw new Error('Invalid stroke points.');}
    if(value.type==='text'){
      if(typeof value.text!=='string')throw new Error('Text elements need a text value.');
      chars+=value.text.length;
      if(!FONTS.has(value.fontFamily))value.fontFamily=5;
      if(!Number.isFinite(value.fontSize)||value.fontSize<1||value.fontSize>500)throw new Error('Font sizes must be between 1 and 500.');
    }
    if(points>LIMITS.points||chars>LIMITS.text)throw new Error('The scene exceeds the text or stroke limit.');
    return value;
  });
  const state=data.appState||{};
  return {type:'excalidraw',version:2,source:'https://entelloq.com',elements,files:{},appState:{viewBackgroundColor:typeof state.viewBackgroundColor==='string'&&/^#[0-9a-f]{6}$/i.test(state.viewBackgroundColor)?state.viewBackgroundColor:'#ffffff',currentItemFontFamily:FONTS.has(state.currentItemFontFamily)?state.currentItemFontFamily:5}};
}
export function parseScene(text){if(new TextEncoder().encode(text).byteLength>LIMITS.bytes)throw new Error('Choose a scene smaller than 2 MB.');return validateScene(JSON.parse(text));}
const ink='#243b53',blue='#1971c2',green='#087f5b',amber='#9c6500';
const text=(id,x,y,value,size=22,color=ink)=>({id,type:'text',x,y,text:value,fontSize:size,fontFamily:5,strokeColor:color});
const arrow=(id,x,y,dx,dy,color=blue)=>({id,type:'arrow',x,y,width:Math.abs(dx),height:Math.abs(dy),points:[[0,0],[dx,dy]],strokeColor:color,strokeWidth:2,endArrowhead:'arrow'});
export function starter(subject,kind=subject==='biology'?'cell':'forces'){
  if(subject==='physics')return [
    text('title',100,45,'Forces on a sliding block',30),text('context',100,93,'Horizontal surface · motion to the right',18),
    {id:'block',type:'rectangle',x:325,y:285,width:150,height:100,backgroundColor:'#dbeafe',fillStyle:'solid',strokeColor:blue,roundness:{type:3}},
    text('mass',379,320,'m',30),arrow('normal',400,285,0,-120,green),text('normal-label',415,172,'N',26,green),
    arrow('weight',400,385,0,120,green),text('weight-label',417,470,'mg',26,green),
    arrow('applied',475,335,180,0,blue),text('applied-label',570,294,'F applied',22,blue),
    arrow('friction',325,335,-110,0,amber),text('friction-label',190,294,'friction f',22,amber),
    text('assumption',100,555,'No vertical acceleration: N = mg',21),
    text('reason',100,590,'Net horizontal force: F applied − f = ma',21),
    text('boundary',100,635,'Qualitative arrows; lengths are not a force scale.\nEdit the forces to explain a different situation.',17,'#516170')
  ];
  if(kind==='enzyme')return [
    text('title',80,50,'How an enzyme is reused',30),text('context',80,100,'A simplified catalytic cycle',19),
    {id:'es-reactants',type:'rectangle',x:80,y:220,width:180,height:110,strokeColor:green,backgroundColor:'#d3f9d8',fillStyle:'solid',roundness:{type:3}},
    text('reactants-label',117,257,'E + S',30,green),arrow('bind',265,250,145,0,green),arrow('unbind',410,290,-145,0,green),
    {id:'es',type:'rectangle',x:420,y:220,width:140,height:110,strokeColor:amber,backgroundColor:'#fff3bf',fillStyle:'solid',roundness:{type:3}},text('es-label',461,257,'ES',30,amber),
    arrow('catalysis',570,270,140,0,green),{id:'products',type:'rectangle',x:720,y:220,width:180,height:110,strokeColor:green,backgroundColor:'#d3f9d8',fillStyle:'solid',roundness:{type:3}},text('products-label',755,257,'E + P',30,green),
    text('binding-label',275,190,'binding',19),text('catalysis-label',578,225,'catalysis',19),
    text('key',80,415,'E: enzyme   S: substrate   ES: complex   P: product',22),
    text('boundary',80,468,'Conceptual mechanism, not a molecular structure or rate calculation.\nThe enzyme is regenerated; the substrate becomes product.\nUse Enzyme dynamics for the separate numerical model.',19,'#516170')
  ];
  return [
    text('title',90,45,'A cell, organised',30),text('context',90,92,'Simplified animal cell · schematic, not to scale',18),
    {id:'cell',type:'ellipse',x:160,y:180,width:460,height:330,strokeColor:green,backgroundColor:'#ebfbee',fillStyle:'solid',strokeWidth:3},
    {id:'nucleus',type:'ellipse',x:315,y:270,width:130,height:120,strokeColor:blue,backgroundColor:'#dbeafe',fillStyle:'solid'},text('nucleus-label',335,315,'nucleus',21,blue),
    {id:'mitochondrion',type:'ellipse',x:490,y:355,width:88,height:42,angle:-.5,strokeColor:amber,backgroundColor:'#fff3bf',fillStyle:'solid'},
    {id:'mito-fold',type:'line',x:509,y:365,width:44,height:22,points:[[0,10],[8,0],[16,18],[24,3],[32,15],[44,4]],strokeColor:amber},
    text('membrane-label',650,190,'cell membrane',22,green),arrow('membrane-arrow',640,220,-75,30,green),
    text('mito-label',650,370,'mitochondrion',22,amber),arrow('mito-arrow',642,400,-62,-14,amber),
    text('cytoplasm-label',220,423,'cytoplasm',22,green),
    text('challenge',90,565,'Explain how these structures help the cell function.',22),
    text('boundary',90,610,'Only selected structures are shown. Colours are explanatory.\nAn animal cell has no cell wall or chloroplasts.',18,'#516170')
  ];
}
