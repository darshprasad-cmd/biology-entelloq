import '@kitware/vtk.js/Rendering/Profiles/Volume';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import sample from '../assets/cells3d.json';

export const metadata = {...sample, channels: sample.channels.map(({base64,...rest})=>rest)};

export function create(host, options={}) {
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2');
  if (!gl) throw new Error('This viewer requires WebGL 2. Try a browser with hardware graphics enabled.');
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  const generic = vtkGenericRenderWindow.newInstance({background:[.024,.07,.08],listenWindowResize:false});
  generic.setContainer(host);
  const renderer=generic.getRenderer(), renderWindow=generic.getRenderWindow();
  const image=vtkImageData.newInstance();
  image.setDimensions(...sample.dimensionsXYZ);
  image.setSpacing(...sample.spacingXYZ_um);
  image.setOrigin(...sample.originXYZ_um);
  const arrays = sample.channels.map(c=>vtkDataArray.newInstance({name:c.name,numberOfComponents:1,values:Uint8Array.from(atob(c.base64),v=>v.charCodeAt(0))}));
  image.getPointData().setScalars(arrays[0]);
  const sliceMapper=vtkImageMapper.newInstance();
  sliceMapper.setInputData(image);
  const sliceActor=vtkImageSlice.newInstance();
  sliceActor.setMapper(sliceMapper);
  sliceActor.getProperty().setColorWindow(255);
  sliceActor.getProperty().setColorLevel(127.5);
  sliceActor.getProperty().setInterpolationTypeToLinear();
  renderer.addActor(sliceActor);
  const volumeMapper=vtkVolumeMapper.newInstance({sampleDistance:.35});
  volumeMapper.setInputData(image);
  const volumeActor=vtkVolume.newInstance();
  volumeActor.setMapper(volumeMapper);
  const color=vtkColorTransferFunction.newInstance();
  color.addRGBPoint(0,0,0,0);color.addRGBPoint(75,.04,.25,.25);color.addRGBPoint(180,.25,.8,.73);color.addRGBPoint(255,.85,1,.93);
  const opacity=vtkPiecewiseFunction.newInstance();
  volumeActor.getProperty().setRGBTransferFunction(0,color);
  volumeActor.getProperty().setScalarOpacity(0,opacity);
  volumeActor.getProperty().setScalarOpacityUnitDistance(0,1.04);
  volumeActor.getProperty().setInterpolationTypeToLinear();
  volumeActor.getProperty().setShade(false);
  renderer.addVolume(volumeActor);
  const state={axis:2,slice:30,channel:0,mode:'slice',threshold:35,...options};
  const camera=renderer.getActiveCamera();
  let disposed=false,interacting=true;
  function set(next={}, reset=false) {
    if(disposed)return;
    const oldAxis=state.axis, oldMode=state.mode;
    if (next.axis!==undefined && ![0,1,2].includes(Number(next.axis))) throw Error('Unknown dataset axis');
    if (next.channel!==undefined && ![0,1].includes(Number(next.channel))) throw Error('Unknown microscopy channel');
    Object.assign(state,next);
    state.axis=Number(state.axis);state.channel=Number(state.channel);
    state.slice=Math.max(0,Math.min(sample.dimensionsXYZ[state.axis]-1,Math.round(Number(state.slice))));
    state.threshold=Math.max(0,Math.min(200,Number(state.threshold)));
    image.getPointData().setScalars(arrays[state.channel]);
    image.modified();
    sliceMapper.setSlicingMode(state.axis);
    sliceMapper.setSlice(state.slice);
    sliceActor.setVisibility(state.mode==='slice');
    volumeActor.setVisibility(state.mode==='volume');
    opacity.removeAllPoints();opacity.addPoint(0,0);opacity.addPoint(state.threshold,0);opacity.addPoint(255,.85);
    // Disabling vtk's interactor also disables renderWindow.render(). Unbind only
    // pointer events for fixed-axis slices so slider/camera changes still render.
    const shouldInteract=state.mode==='volume';
    if(shouldInteract!==interacting){
      if(shouldInteract)generic.getInteractor().bindEvents(host);
      else generic.getInteractor().unbindEvents(host);
      interacting=shouldInteract;
    }
    if(reset||oldAxis!==state.axis||oldMode!==state.mode){
      const center=image.getCenter();
      camera.setFocalPoint(...center);
      if(state.mode==='volume'){
        camera.setParallelProjection(false);camera.setPosition(center[0]+100,center[1]-100,center[2]+85);camera.setViewUp(0,0,1);
      }else{
        camera.setParallelProjection(true);
        const pos=[...center];pos[state.axis]+=100;
        camera.setPosition(...pos);camera.setViewUp(...(state.axis===2?[0,1,0]:[0,0,1]));
      }
      renderer.resetCamera();
      if(state.mode==='slice') camera.setParallelScale(camera.getParallelScale()*1.12);
    }
    renderer.resetCameraClippingRange();renderWindow.render();
    const axisName=['X','Y','Z'][state.axis];
    const location=sample.originXYZ_um[state.axis]+state.slice*sample.spacingXYZ_um[state.axis];
    const directions=state.axis===2?'→ +X · ↑ +Y':state.axis===1?'← +X · ↑ +Z':'→ +Y · ↑ +Z';
    return {...state,location,axisName,directions,dimensions:sample.dimensionsXYZ,spacing:sample.spacingXYZ_um,engine:'vtk.js 37.4.6',sourceSha256:sample.sourceSha256};
  }
  const resize=new ResizeObserver(()=>{if(!disposed)generic.resize();});resize.observe(host);
  generic.resize();set({},true);
  return {
    set,reset:()=>set({},true),getState:()=>({...state}),
    dispose(){if(disposed)return;disposed=true;resize.disconnect();const interactor=generic.getInteractor();interactor.unbindEvents(host);generic.delete();interactor.delete();renderer.delete();renderWindow.delete();sliceActor.delete();volumeActor.delete();sliceMapper.delete();volumeMapper.delete();color.delete();opacity.delete();image.delete();arrays.forEach(a=>a.delete());host.replaceChildren();}
  };
}
