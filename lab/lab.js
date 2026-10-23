/* GLOBAL FUTURE LAB V6.3 — Texture bytes decoded during packaging; browser image decode not needed by renderer. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const CATEGORY={wood:'Wooden',marble:'Stone & Marble',solid:'Solid Colors',mirror:'Mirror Series',brushed:'Brushed Series',glossy:'Glossy Series',metallic:'Metallic Colors',sparkling:'Sparkling Series'};
const ORDER=Object.keys(CATEGORY);
const SCENES={

 residence:{title:'Modern Residence',subtitle:'Residential facade / Exterior',kind:'exterior',icon:'⌂',distance:29,elevation:.33,angle:.49,look:2.35,zones:['Main Facade ACP','Feature Cladding','Accent Detail'],defaults:['GA003','GA042','GA014']},
 retail:{title:'Retail Showroom',subtitle:'Showroom facade / Exterior',kind:'exterior',icon:'▣',distance:29,elevation:.29,angle:.34,look:2.35,zones:['Front Fascia ACP','Side Cladding','Feature Accent'],defaults:['GA028','GA041','GA014']},
 office:{title:'Corporate Office',subtitle:'Commercial facade / Exterior',kind:'exterior',icon:'▥',distance:35,elevation:.33,angle:.45,look:4.35,zones:['Main Facade ACP','Vertical Fins','Entrance Accent'],defaults:['GA012','GA003','GA007']},
 kitchen:{title:'Designer Kitchen',subtitle:'Kitchen set / Interior',kind:'interior',icon:'▤',distance:22,elevation:.27,angle:.23,look:2.40,zones:['Upper Cabinets','Base Cabinets','Backsplash / Top'],defaults:['GA039','GA048','GA050']},
 bedroom:{title:'Master Bedroom',subtitle:'Bedroom suite / Interior',kind:'interior',icon:'◫',distance:22.5,elevation:.26,angle:.19,look:2.38,zones:['Wardrobe Doors','Feature Wall','Headboard Accent'],defaults:['GA048','GA046','GA014']},
 reception:{title:'Customer Service',subtitle:'Reception area / Interior',kind:'interior',icon:'◈',distance:22.5,elevation:.26,angle:.26,look:2.4,zones:['Counter Front','Backdrop Wall','Feature Header'],defaults:['GA053','GA041','GA057']},
 living:{title:'Living & TV Area',subtitle:'Feature wall / Interior',kind:'interior',icon:'▧',distance:22,elevation:.26,angle:.22,look:2.4,zones:['TV Feature Wall','Console Cabinet','Accent Panel'],defaults:['GA052','GA048','GA014']},
 wardrobe:{title:'Walk-in Wardrobe',subtitle:'Wardrobe room / Interior',kind:'interior',icon:'▥',distance:22,elevation:.27,angle:.20,look:2.4,zones:['Cabinet Doors','Interior Backing','Center Island'],defaults:['GA048','GA039','GA053']},
 meeting:{title:'Executive Meeting',subtitle:'Meeting room / Interior',kind:'interior',icon:'▦',distance:22.5,elevation:.26,angle:.27,look:2.35,zones:['Main Wall ACP','Conference Table','Center Feature Panel'],defaults:['GA043','GA044','GA053']}
};
let materials=window.GFL_MATERIALS||[];let currentScene='residence',sceneFilter='all',categoryFilter='all',query='',activeZone=0,blend=1,night=false,autorotate=false,fullPresentation=false;
const zonePicks={};Object.entries(SCENES).forEach(([k,s])=>{zonePicks[k]=s.defaults.map(code=>materials.findIndex(m=>m.code===code));});
function pickForZone(z){return Math.max(0,zonePicks[currentScene][z]??0)}
const canvas=$('sceneCanvas'),viewport=$('viewport');let gl=null,program=null,vertexBuffer=null,vertices=[],vertexCount=0,bufferDirty=true,glReady=false;let textures=[],loadedTextures=[null,null,null],currentTexPaths=['','',''];let texIds=[-1,-1,-1],texReady=[0,0,0],texVersion=[0,0,0],texRequests=[0,0,0],selectionVersion=0;let fallbackReady=false,ctx2d=null,lastFallbackFrame=0;let pixelTextures=[null,null,null];let lastFallbackSignature="";let mouseDown=false,mouseButton=0,oldX=0,oldY=0,targetAngle=.49,actualAngle=.49,targetElevation=.35,actualElevation=.35,targetDistance=32,actualDistance=32;
let lastTime=performance.now(),toastId;
const VS=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;attribute vec3 aColor;attribute float aKind;uniform mat4 uVP;varying vec3 vNormal;varying vec2 vUV;varying vec3 vColor;varying float vKind;varying vec3 vWorld;void main(){vNormal=aNormal;vUV=aUV;vColor=aColor;vKind=aKind;vWorld=aPosition;gl_Position=uVP*vec4(aPosition,1.0);}`;
const FS=`precision highp float;
varying vec3 vNormal;varying vec2 vUV;varying vec3 vColor;varying float vKind;varying vec3 vWorld;
uniform sampler2D uTex0;uniform sampler2D uTex1;uniform sampler2D uTex2;
uniform vec3 uColors[3];uniform vec3 uGloss;uniform vec3 uSolidFlags;uniform vec3 uTextureReady;
uniform float uBlend;uniform float uNight;uniform float uTime;
uniform float uSceneIndex;
float penumbra(vec2 pos,vec2 center,vec2 radius){
 vec2 q=(pos-center)/radius;float dd=dot(q,q);
 return 1.-smoothstep(.16,1.6,dd);
}
float floorShadow(vec3 world,float sid){
 vec2 p=world.xz;float o=0.;
 if(sid<.5){o=.30*penumbra(p,vec2(1.2,2.5),vec2(7.7,6.1))+.18*penumbra(p,vec2(-3.4,5.7),vec2(3.4,2.1));}
 else if(sid<1.5){o=.30*penumbra(p,vec2(1.,3.5),vec2(8.1,5.6))+.14*penumbra(p,vec2(0.,6.1),vec2(7.2,2.4));}
 else if(sid<2.5){o=.32*penumbra(p,vec2(1.6,2.5),vec2(7.1,6.4));}
 else if(sid<3.5){o=.28*penumbra(p,vec2(.2,1.2),vec2(4.,1.8))+.18*penumbra(p,vec2(-1.4,-3.3),vec2(6.8,1.7));}
 else if(sid<4.5){o=.29*penumbra(p,vec2(-2.7,.5),vec2(3.9,3.7))+.19*penumbra(p,vec2(4.5,-3.1),vec2(3.7,1.5));}
 else if(sid<5.5){o=.32*penumbra(p,vec2(0.,1.2),vec2(5.5,1.95));}
 else if(sid<6.5){o=.29*penumbra(p,vec2(-2.3,3.65),vec2(4.5,2.35));}
 else if(sid<7.5){o=.27*penumbra(p,vec2(-2.5,1.9),vec2(3.8,2.1));}
 else{o=.32*penumbra(p,vec2(0.,1.35),vec2(5.7,2.45));}
 return clamp(1.-o,.48,1.);
}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 v){vec2 i=floor(v),f=fract(v);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
void main(){
 vec3 N=normalize(vNormal);vec3 L=normalize(vec3(-.46,.86,.76));vec3 fillL=normalize(vec3(.74,.35,-.5));
 float diff=max(0.,dot(N,L));float fill=max(0.,dot(N,fillL));float sky=.5+.5*N.y;
 float k=vKind;vec3 C=vColor;float gloss=.16;bool mat=false;
 if(k>.5&&k<1.5){C=mix(texture2D(uTex0,vUV).rgb,uColors[0],max(uSolidFlags.x,1.-uTextureReady.x));gloss=uGloss.x;mat=true;}
 if(k>20.5&&k<21.5){C=mix(texture2D(uTex1,vUV).rgb,uColors[1],max(uSolidFlags.y,1.-uTextureReady.y));gloss=uGloss.y;mat=true;}
 if(k>21.5&&k<22.5){C=mix(texture2D(uTex2,vUV).rgb,uColors[2],max(uSolidFlags.z,1.-uTextureReady.z));gloss=uGloss.z;mat=true;}
 vec3 V=normalize(vec3(.4,.47,1.));vec3 H=normalize(L+V);
 float spec=pow(max(0.,dot(N,H)),mix(15.,95.,gloss));
 if(mat){C=mix(vec3(.54,.54,.52),C,uBlend);C*=mix(1.,.92,gloss);C+=vec3(1.,.91,.79)*spec*gloss*.28;}
 if(k>2.5&&k<3.5){float streak=pow(max(0.,sin(vWorld.x*2.25+vWorld.y*1.08)),28.);C=mix(C,vec3(.71,.83,.86),.10+streak*.24);C+=vec3(.035,.05,.055);gloss=.88;}
 if(k>3.5&&k<4.5)C*=.92+noise(vWorld.xz*9.)*.13;
 if(k>5.5&&k<6.5)C*=.93+noise(vWorld.xz*8.)*.12;
 if(k>7.5&&k<8.5)C*=.87+noise(vWorld.xz*1.5+vWorld.xy*.4)*.28;
 if(k>9.5&&k<10.5)C*=.94+noise(vWorld.xz*5.)*.12;
 if(k>13.5&&k<14.5)C=mix(C,vec3(1.,.83,.53),.65);
 if(k>17.5&&k<18.5)C=mix(C,vec3(1.,.70,.35),.42+uNight*.52);
 if(k>18.5&&k<19.5){C=mix(C,vec3(.09,.17,.22),.19);C+=vec3(.22,.14,.06)*uNight;}
 float light=(.44+.16*sky)+diff*.56+fill*.16;
 light=mix(light,.42+.11*sky+diff*.53+fill*.11,uNight);
 float baseAO=1.0;
 baseAO-=.06*pow(1.-max(N.y,0.),1.15);
 baseAO-=.075*(1.-smoothstep(0.,1.25,vWorld.y+.18))*(1.-abs(N.y)*.25);
 if(N.y>.62&&vWorld.y<.27&&(k>4.5&&k<6.5||k>14.5&&k<17.5||k>8.5&&k<10.5))baseAO*=floorShadow(vWorld,uSceneIndex);
 if(uSceneIndex<3.0&&vWorld.z>3.65&&vWorld.y>2.2&&vWorld.y<3.1&&N.z>.65)baseAO*=.87;
 if(uSceneIndex>=3.0&&vWorld.z< -3.35&&vWorld.y<2.9&&N.z>.55)baseAO*=.91;
 if(k>13.5&&k<14.5)light=mix(light,1.62,uNight);
 if(k>17.5&&k<18.5)light=mix(light,1.2,uNight);
 if(k>18.5&&k<19.5)light=mix(light,1.22,uNight);
 vec3 col=C*(light*baseAO);
 if(k>2.5&&k<3.5)col+=vec3(.3,.39,.42)*pow(max(0.,dot(N,H)),64.)*.20;
 if(k>8.5&&k<9.5)col+=vec3(1.,.85,.54)*spec*.14;
 col=col/(col+vec3(.31));col=pow(max(col,vec3(0.)),vec3(.94));
 col=mix(col,vec3(.94,.84,.72),.018*uNight);
 gl_FragColor=vec4(col,1.);
}`;
function shader(type,src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function initGL(){try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL unavailable');program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,VS));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FS));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);vertexBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);[['aPosition',3,0],['aNormal',3,12],['aUV',2,24],['aColor',3,32],['aKind',1,44]].forEach(([name,n,offset])=>{const l=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,n,gl.FLOAT,false,12*4,offset)});for(let z=0;z<3;z++){let t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+z);gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([130,137,128,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);textures.push(t);gl.uniform1i(gl.getUniformLocation(program,'uTex'+z),z)}glReady=true;}catch(e){console.info('WebGL unavailable; using CPU 3D fallback.');try{ctx2d=canvas.getContext('2d',{alpha:true,willReadFrequently:true});if(!ctx2d)throw Error('Canvas2D unavailable');fallbackReady=true;$('fpsLabel').textContent='CRISP SOFTWARE 3D';}catch(err){console.error('3D error:',err);$('viewerError').hidden=false;}}}
const textureBytesCache=new Map();
const perZoneStatus=['','',''];
const perZoneError=[false,false,false];
function setMaterialStatus(message,isError=false,z=activeZone){
 perZoneStatus[z]=message;perZoneError[z]=!!isError;
 if(z!==activeZone)return;
 const el=$('materialStatus');if(el){el.textContent=message;el.classList.toggle('error',!!isError);}
}
function showActiveMaterialStatus(){const el=$('materialStatus');if(!el)return;el.textContent=perZoneStatus[activeZone]||'Pilih material untuk menerapkan finishing.';el.classList.toggle('error',perZoneError[activeZone]);}
function forceSoftwareRedraw(){lastFallbackSignature='';lastFallbackFrame=0;selectionVersion++;}
function materialPixels(ix){
 if(textureBytesCache.has(ix))return textureBytesCache.get(ix);
 const payload=window.GFL_PIXEL_LIBRARY&&window.GFL_PIXEL_LIBRARY[ix];
 if(!payload)throw new Error('DATA TEKSTUR TIDAK TERSEDIA: '+materials[ix].name);
 // Not an image URL. Payload contains all 65,536 palette indices + 256xRGB palette directly in source.
 const paletteString=atob(payload.p),indexString=atob(payload.i);
 if(paletteString.length!==768||indexString.length!==65536)throw Error('DATA TEKSTUR TIDAK LENGKAP');
 const rgba=new Uint8Array(256*256*4);
 for(let k=0;k<65536;k++){
  let pos=indexString.charCodeAt(k)*3,j=k*4;
  rgba[j]=paletteString.charCodeAt(pos);rgba[j+1]=paletteString.charCodeAt(pos+1);rgba[j+2]=paletteString.charCodeAt(pos+2);rgba[j+3]=255;
 }
 textureBytesCache.set(ix,rgba);
 return rgba;
}
function uploadTextureBytes(z,rgba){
 gl.activeTexture(gl.TEXTURE0+z);gl.bindTexture(gl.TEXTURE_2D,textures[z]);
 gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,256,256,0,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.generateMipmap(gl.TEXTURE_2D);
 const e=gl.getError();if(e!==gl.NO_ERROR)throw new Error('GPU error '+e);
}
function loadTexture(z){
 if(!glReady&&!fallbackReady)return;
 const ix=pickForZone(z),m=materials[ix];
 ++texRequests[z];texIds[z]=ix;texReady[z]=0;texVersion[z]++;
 pixelTextures[z]=null;forceSoftwareRedraw();
 if(m.category==='solid'){
  texReady[z]=1;texVersion[z]++;setMaterialStatus('✓ '+m.name+' — seluruh bidang',false,z);forceSoftwareRedraw();return;
 }
 try{
  const rgba=materialPixels(ix);
  if(glReady)uploadTextureBytes(z,rgba);
  if(fallbackReady)pixelTextures[z]=rgba;
  texReady[z]=1;texVersion[z]++;forceSoftwareRedraw();
  setMaterialStatus('✓ '+m.name+' — tekstur aktif',false,z);
 }catch(e){
  console.error('Material pixel pipeline',m.code,e);
  setMaterialStatus('Gagal menerapkan '+m.name+': '+e.message,true,z);
 }
}
function face(a,b,c,d,n,kind,color){const data=[a,b,c,a,c,d];
const ax=Math.abs(n[0]),ay=Math.abs(n[1]),az=Math.abs(n[2]);
const mapUV=(p)=>{let u=0,v=0;if(az>=ax&&az>=ay){u=p[0]/2.4;v=p[1]/1.2;}else if(ax>=ay){u=p[2]/2.4;v=p[1]/1.2;}else{u=p[0]/1.8;v=p[2]/1.8;}return [u,v];};
for(let i=0;i<6;i++){const uv=mapUV(data[i]);vertices.push(...data[i],...n,uv[0],uv[1],...color,kind);}}
function box(x,y,z,w,h,d,kind=0,col=[.88,.88,.84]){let l=x-w/2,r=x+w/2,b=y-h/2,t=y+h/2,k=z-d/2,f=z+d/2;
face([l,b,f],[r,b,f],[r,t,f],[l,t,f],[0,0,1],kind,col);face([r,b,k],[l,b,k],[l,t,k],[r,t,k],[0,0,-1],kind,col);face([r,b,f],[r,b,k],[r,t,k],[r,t,f],[1,0,0],kind,col);face([l,b,k],[l,b,f],[l,t,f],[l,t,k],[-1,0,0],kind,col);face([l,t,f],[r,t,f],[r,t,k],[l,t,k],[0,1,0],kind,col);face([l,b,k],[r,b,k],[r,b,f],[l,b,f],[0,-1,0],kind,col);}
function quad(a,b,c,d,kind,color,n=[0,1,0]){face(a,b,c,d,n,kind,color)}
function plane(cx,y,cz,w,d,kind,color){quad([cx-w/2,y,cz-d/2],[cx-w/2,y,cz+d/2],[cx+w/2,y,cz+d/2],[cx+w/2,y,cz-d/2],kind,color,[0,1,0]);}
function facade(x,y,z,w,h,tileW=2.4,tileH=1.2,side=false){const nx=Math.max(1,Math.ceil(w/tileW)),ny=Math.max(1,Math.ceil(h/tileH)),sw=w/nx,sh=h/ny;box(x,y,z,w,h,.09,2,[.17,.22,.21]);for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++){let xx=x-w/2+(ix+.5)*sw,yy=y-h/2+(iy+.5)*sh;box(xx,yy,z+.058,sw-.029,sh-.029,.025,1,[1,1,1]);}}
function facadeSide(x,y,z,h,d,tileW=2.4,tileH=1.2){let nz=Math.ceil(d/tileW),ny=Math.ceil(h/tileH),dw=d/nz,dh=h/ny;box(x,y,z,.09,h,d,2,[.2,.24,.24]);for(let iy=0;iy<ny;iy++)for(let iz=0;iz<nz;iz++){let zz=z-d/2+(iz+.5)*dw,yy=y-h/2+(iy+.5)*dh;box(x+.066,yy,zz,.025,dh-.03,dw-.03,1,[1,1,1]);}}
function windowFront(x,y,z,w,h,cols=2,rows=1){box(x,y,z,w+.16,h+.16,.09,2,[.13,.18,.19]);box(x,y,z+.06,w,h,.03,3,[.22,.36,.40]);for(let i=1;i<cols;i++)box(x-w/2+i*w/cols,y,z+.12,.058,h,.07,2,[.15,.19,.20]);for(let i=1;i<rows;i++)box(x,y-h/2+i*h/rows,z+.12,w,.055,.07,2,[.14,.19,.20]);box(x,y+h/2-.035,z+.14,w,.03,.04,7,[.58,.6,.57]);}
function windowSide(x,y,z,h,d,rows=1){box(x,y,z,.09,h+.12,d+.12,2,[.15,.20,.21]);box(x+.07,y,z,.03,h,d,3,[.22,.39,.44]);for(let i=1;i<rows;i++)box(x+.1,y-h/2+i*h/rows,z,.08,.06,d,2,[.17,.18,.18]);}
function sphere(x,y,z,r,kind=8,col=[.29,.45,.26],lat=7,lon=10){for(let j=0;j<lat;j++){const a0=Math.PI*j/lat,a1=Math.PI*(j+1)/lat;for(let i=0;i<lon;i++){const b0=2*Math.PI*i/lon,b1=2*Math.PI*(i+1)/lon;let p=(a,b)=>[x+r*Math.sin(a)*Math.cos(b),y+r*Math.cos(a),z+r*Math.sin(a)*Math.sin(b)];let p00=p(a0,b0),p01=p(a0,b1),p10=p(a1,b0),p11=p(a1,b1);let normal=[(p00[0]-x)/r,(p00[1]-y)/r,(p00[2]-z)/r];face(p00,p01,p11,p10,normal,kind,col);}}}
function tree(x,z,s=1){box(x,.8*s,z,.18*s,1.6*s,.2*s,4,[.38,.29,.21]);sphere(x,2.0*s,z,.83*s,8,[.31,.46,.30]);sphere(x-.49*s,1.84*s,z,.56*s,8,[.34,.48,.30]);sphere(x+.52*s,1.78*s,z-.17*s,.63*s,8,[.30,.43,.28]);sphere(x,2.58*s,z-.2*s,.62*s,8,[.42,.55,.36]);}
function shrub(x,z,s=.65){sphere(x,s*.57,z,s,8,[.27,.41,.27],5,8);sphere(x+s*.46,s*.45,z+.15*s,s*.55,8,[.38,.5,.33],5,8)}
function plantBox(x,z,w=1.8,d=.55){box(x,.30,z,w,.55,d,9,[.35,.40,.37]);for(let i=0;i<5;i++)shrub(x-w*.4+i*w*.2,z,.21+.045*(i%2));}
function lamp(x,y,z){box(x,y,z,.27,.07,.22,13,[.95,.82,.53]);box(x,y+.08,z-.065,.34,.12,.28,2,[.12,.14,.14]);}
function shSide(x,y,z,h,d,c=[.32,.31,.29]){box(x,y,z,.02,h,d,19,c);}

function commonEnvironment(){plane(0,-.20,0,90,90,15,[.73,.78,.72]);plane(0,-.174,12.5,33,11,16,[.64,.66,.62]);plane(0,-.147,10.3,34,2,5,[.74,.76,.71]);plane(0,-.118,7.6,34,3.1,6,[.79,.79,.74]);plane(-10,-.1,1.0,8,15,17,[.26,.39,.26]);plane(10,-.1,1.0,8,15,17,[.32,.44,.28]);tree(-12,0.0,1.6);tree(-13,5,1.1);tree(12,-1,1.35);tree(13,4,1);shrub(-9.2,7.9,.68);shrub(9.7,8.2,.5);}
function residence(){commonEnvironment();
 box(0,2.60,-.3,11.7,5.2,8.6,0,[.87,.85,.79]); // masonry body
 box(0,5.25,-.3,12.2,.35,8.9,9,[.68,.71,.68]); // roof cornice
 box(0,5.48,-.5,12.4,.14,9.15,2,[.18,.23,.23]);box(0,5.55,4.18,12.48,.08,.12,18,[.84,.69,.46]);
 box(-2.7,3.98,4.2,6.6,3.1,2.0,0,[.74,.76,.70]);
 facade(-2.7,4.05,5.27,6.42,2.85,2.4,1.2); // focal ACP upper
 
 
 box(-2.7,5.65,4.6,6.8,.20,3.5,9,[.21,.25,.24]);
 // inset upper feature window within ACP: framing slightly higher surface
 windowFront(-3.65,4.13,5.40,2.95,1.82,2);
 // right upper glass and frame
 box(3.12,4.02,4.43,5.05,3.09,1.75,9,[.19,.22,.21]);
 windowFront(3.1,4.0,5.36,4.68,2.62,3);
 // ground floor windows & doors
 box(1.52,1.64,4.07,8.35,3.25,1.18,0,[.84,.82,.75]);
 windowFront(2.42,1.73,4.72,5.2,2.55,3);
 
 box(-3.30,1.65,4.65,1.95,2.92,.16,4,[.32,.21,.14]);
 box(-3.30,1.7,4.78,1.56,2.55,.12,9,[.16,.24,.23]);
 box(-2.73,1.65,4.9,.07,.38,.16,7,[.76,.66,.43]);
 // porch & steps
 box(-3.25,.28,5.45,4.0,.5,2.15,5,[.64,.68,.64]);
 for(let i=0;i<3;i++)box(-3.25,.08-i*.09,6.66+i*.38,4.0,.16,1.0,5,[.71,.72,.67]);
 box(2.4,.14,6.25,6.3,.23,2.72,6,[.66,.66,.61]);
 // glass balcony guard
 box(3.03,3.13,5.65,5.1,.12,.13,7,[.34,.39,.40]);
 for(let i=0;i<4;i++)box(1.15+i*1.3,2.94,5.65,.055,.43,.08,7,[.5,.55,.52]);
 // right side facade volume along x visible
 facadeSide(5.94,3.43,0.7,2.95,4.35,2.4,1.2);
 windowSide(5.99,1.83,-1.7,1.72,2.6);
 // cantilever beam & vertical wooden slats
 box(-3.55,2.87,5.35,5.5,.19,.8,9,[.30,.34,.32]);
 for(let i=0;i<6;i++)box(-5.5+i*.47,1.55,5.06,.065,2.45,.07,4,[.52,.34,.21]);
 // secondary side accent
 box(6.02,3.0,1.95,.13,2.2,2.5,1,[1,1,1]);
 // pavers, vegetation, exterior seating
 plantBox(-5.2,6.18,2.05,.7);plantBox(5.25,6.1,2.25,.65);
 box(3.9,.5,7.66,1.3,.19,.46,4,[.43,.30,.2]);box(3.45,.23,7.66,.11,.46,.11,2,[.2,.21,.19]);box(4.34,.23,7.66,.11,.46,.11,2,[.2,.21,.19]);
 lamp(-4.72,2.35,4.92);lamp(-1.92,2.35,4.91);lamp(5.28,2.34,4.85);
 // independent selectable accent and feature panels for the demo
 box(6.18,3.0,1.95,.14,2.2,2.5,21,[1,1,1]);box(-5.05,1.48,5.13,1.75,2.35,.12,22,[1,1,1]);
}
function retail(){commonEnvironment();
 box(0,2.32,-.3,13.9,4.55,8.2,0,[.83,.83,.77]);
 box(0,4.85,-.3,14.45,.45,8.75,2,[.18,.23,.24]);
 box(0,5.16,-.5,14.7,.18,8.9,9,[.39,.43,.40]);box(0,4.97,4.24,14.25,.065,.10,18,[.9,.71,.42]);
 // large signature fascia using ACP tiles
 facade(0,3.91,4.01,13.85,1.62,2.4,1.2);
 
 box(0,4.82,4.10,14.1,.13,.42,2,[.11,.17,.18]);
 // glass storefront
 windowFront(-2.9,1.92,3.97,6.2,3.55,4);
 windowFront(3.65,1.92,3.97,5.45,3.55,3);
 // door & branded central portal
 box(.52,1.76,4.11,1.63,3.15,.10,2,[.15,.19,.20]);
 box(.52,1.76,4.19,1.40,2.95,.05,3,[.21,.34,.36]);
 box(1.02,1.69,4.28,.045,.48,.11,7,[.74,.72,.59]);
 // warm shop interior behind window (visible reflection geometry)
 box(-3.1,1.85,2.85,5.5,2.5,.08,18,[.35,.25,.17]);
 for(let i=0;i<5;i++){box(-5.35+i*1.08,2.27,3.22,.17,1.55,.15,4,[.43,.30,.22]);box(-5.35+i*1.08,1.65,3.24,.80,.08,.18,18,[.58,.50,.35]);}
 // side wall with ACP
 facadeSide(6.99,2.40,-.50,4.2,5.7,2.4,1.2);
 // left / right façade columns
 box(-6.70,2.06,4.25,.44,3.58,.68,9,[.27,.30,.28]);box(6.70,2.06,4.25,.44,3.58,.68,9,[.27,.30,.28]);
 // shade awning
 box(0,3.52,4.59,13.55,.15,1.2,2,[.19,.23,.22]);
 // broad terrace and pavers
 box(0,.18,5.75,13.2,.34,3.25,5,[.68,.70,.67]);
 box(0,.05,7.65,14.2,.10,.80,5,[.76,.76,.71]);
 plane(0,-.097,9.4,12.3,1.7,6,[.68,.68,.62]);
 for(let i=0;i<3;i++){plantBox(-5.5+i*5.5,7.05,1.0,.7);}
 lamp(-5.6,3.32,4.86);lamp(0,3.32,4.86);lamp(5.6,3.32,4.86);
 box(-6.5,2.02,4.62,.36,3.42,.14,21,[1,1,1]);box(6.2,2.02,4.62,.95,3.42,.14,22,[1,1,1]);
}
function office(){commonEnvironment();
 box(0,4.68,-.65,12.1,9.35,8.6,0,[.73,.76,.72]);
 box(0,9.45,-.65,12.5,.35,9.0,9,[.23,.27,.28]);
 box(0,9.68,-.7,12.7,.12,9.2,2,[.15,.20,.21]);box(0,9.55,3.91,12.3,.055,.09,18,[.88,.69,.43]);
 // floor-height glass curtain wall with separated ACP spandrels
 box(0,4.76,3.9,12.0,9.20,.2,2,[.16,.21,.22]);
 for(let floor=0;floor<3;floor++){
   let y=1.64+floor*3.08;
   windowFront(-2.52,y,4.08,6.4,2.54,4);
   windowFront(3.4,y,4.08,3.73,2.54,2);
   if(floor<2)facade(-.35,y+1.53,4.10,10.95,.54,2.4,1.2);
 }
 // ACP as vertical corner tower and architectural ribbons
 facade(-5.38,4.68,4.19,1.05,8.88,1.2,2.4);
 facade(5.53,4.68,4.19,1.08,8.88,1.2,2.4);
 // glass lobby / entrance projection
 box(-.4,1.35,4.27,2.2,2.7,.25,2,[.13,.17,.18]);
 box(-.4,1.35,4.44,1.88,2.48,.05,3,[.27,.41,.46]);
 box(.38,1.4,4.52,.045,.63,.12,7,[.84,.76,.60]);
 box(0,3.02,4.65,5.1,.21,1.16,9,[.24,.26,.26]);
 box(-1.9,1.43,4.66,.20,2.75,.3,7,[.63,.63,.55]);box(1.5,1.43,4.66,.20,2.75,.3,7,[.63,.63,.55]);
 // side facade + blue windows
 facadeSide(6.10,6.1,-1.7,5.55,5.8,2.4,1.2);
 for(let i=0;i<3;i++)windowSide(6.16,1.72+i*2.85,1.50,1.68,2.0);
 // canopy, steps, lights, landscaping
 box(-.5,.25,5.17,4.6,.45,2.8,5,[.7,.71,.67]);
 box(-.5,.07,6.89,5.25,.18,.75,5,[.74,.74,.7]);
 box(0,.15,7.60,12.8,.26,2.25,6,[.71,.71,.65]);
 plantBox(-5.27,6.75,2.4,.7);plantBox(5.11,6.75,2.4,.7);
 lamp(-2.25,2.84,4.85);lamp(1.45,2.84,4.85);
 box(-5.39,4.68,4.30,.88,8.75,.14,21,[1,1,1]);box(5.10,4.68,4.30,1.75,8.75,.14,22,[1,1,1]);
}

function roomShell(tint=[.88,.88,.84]){
 plane(0,-.50,0,90,90,6,[.32,.35,.37]);
 box(0,-.27,0,17.75,.34,12.65,9,[.13,.15,.18]);
 box(0,-.085,0,17.47,.07,12.37,18,[.88,.80,.66]);
 box(0,-.18,0,17.2,.28,12.3,5,[.74,.72,.68]);
 
 box(0,3.3,-4.15,17.2,6.7,.24,0,tint);
 box(-8.58,3.3,0,.22,6.7,8.55,0,[.76,.77,.70]);
 box(8.56,3.3,-1.25,.20,6.7,5.4,0,[.85,.86,.81]);
 box(0,6.72,-4.15,17.2,.13,.4,9,[.52,.56,.51]);box(0,.08,-4.01,17.1,.10,.15,18,[.90,.74,.51]);
 // seamless floor for elegant material presentation
}
function rug(x,z,w,d,c=[.68,.67,.60]){box(x,.015,z,w,.035,d,10,c);}
function picture(x,y,z,w,h){box(x,y,z,w+.14,h+.14,.08,9,[.26,.31,.27]);box(x,y,z+.057,w,h,.05,0,[.69,.66,.59]);box(x-.2,y+.2,z+.09,w*.48,h*.45,.01,0,[.41,.51,.44]);}
function ceilingLight(x,z){box(x,6.15,z,.42,.32,.42,13,[.9,.77,.52]);box(x,6.42,z,.05,.5,.05,7,[.58,.55,.49]);}
function pottedPlant(x,z,scale=1){box(x,.4*scale,z,.85*scale,.77*scale,.8*scale,9,[.36,.4,.37]);box(x,.82*scale,z,.5*scale,.15*scale,.5*scale,4,[.33,.27,.21]);for(let a=0;a<5;a++)sphere(x+Math.sin(a*2.44)*.28*scale,1.45*scale+(.20*(a%2))*scale,z+Math.cos(a*2.44)*.20*scale,.44*scale,8,[.31,.45,.32],5,7);}
function cabinets(x,y,z,n,w,h,k){for(let i=0;i<n;i++){let cx=x+(i-(n-1)/2)*w;box(cx,y,z,w-.045,h,.48,k,[1,1,1]);box(cx+w*.31,y,z+.28,.04,.32,.06,7,[.49,.47,.4]);}}
function kitchen(){roomShell([.82,.84,.81]);
 // two tone backsplash and kitchen unit wall
 box(0,3.0,-3.90,11.55,1.90,.08,22,[1,1,1]);
 
 box(0,3.72,-3.68,11.4,.05,.3,9,[.25,.27,.26]);
 cabinets(-1.2,4.93,-3.67,5,2.0,1.54,1);
 cabinets(-1.2,1.27,-3.52,5,2.0,1.83,21);
 box(-1.2,2.28,-3.30,10.3,.17,1.34,5,[.84,.81,.76]);
 box(5.85,3.04,-3.41,2.5,5.92,.92,9,[.36,.39,.39]);box(5.85,3.10,-2.88,2.22,5.4,.05,3,[.63,.67,.66]);box(5.85,4.38,-2.80,1.93,.06,.10,9,[.40,.43,.43]);
 // wall hanging shelf
 box(-4.0,3.25,-3.5,1.4,.09,.4,4,[.51,.40,.29]);
 // sink and hob
 box(-3.53,2.39,-2.7,1.47,.06,.78,9,[.35,.39,.39]);box(-3.5,2.50,-2.55,.07,.35,.09,7,[.6,.63,.6]);
 box(1.6,2.39,-2.7,1.15,.05,.76,2,[.25,.29,.29]);for(let a=0;a<4;a++)box(1.0+(a%2)*.35,2.44,-2.94+Math.floor(a/2)*.30,.22,.02,.22,9,[.62,.62,.59]);
 // island: configurable front, stone top, chamfer detail
 box(.2,1.05,1.20,6.45,1.95,2.15,21,[.6,.5,.4]);box(.2,2.10,1.2,6.9,.17,2.5,22,[1,1,1]);for(let i=0;i<4;i++)box(-2.15+i*1.55,1.02,2.32,.025,1.7,.065,2,[.18,.2,.2]);
 for(let i=0;i<3;i++){const x=-1.98+i*1.88;box(x,.71,4.37,.69,.14,.61,4,[.49,.36,.25]);box(x,.38,4.31,.06,.61,.08,9,[.22,.23,.23]);box(x,.38,4.62,.06,.61,.08,9,[.22,.23,.23]);}
 ceilingLight(-2.1,.8);ceilingLight(0,.8);ceilingLight(2.1,.8);pottedPlant(-7.05,-2.7,.84);
}
function bedroom(){roomShell([.83,.81,.76]);
 // feature wall behind bed & wardrobe on right
 box(-2.5,3.5,-3.93,9.0,5.45,.18,21,[1,1,1]);for(let i=0;i<7;i++)box(-6.78+i*1.39,3.45,-3.75,.035,5.44,.07,9,[.39,.39,.37]);
 box(4.65,3.0,-3.5,6.85,5.76,.84,9,[.28,.31,.29]);for(let i=0;i<4;i++){let x=2.15+i*1.67;box(x,3.0,-2.92,1.61,5.52,.09,1,[1,1,1]);box(x+.52,3.1,-2.85,.047,.48,.1,7,[.65,.61,.51]);}
 box(-2.72,1.12,.5,6.50,1.08,6.55,4,[.54,.48,.43]);box(-2.7,1.28,.33,6.3,.48,6.2,0,[.88,.85,.8]);
 box(-2.71,1.70,.20,6.18,.26,5.9,0,[.86,.82,.77]);box(-4.0,1.92,-1.76,2.18,.22,1.20,0,[.95,.91,.86]);box(-1.5,1.92,-1.76,2.18,.22,1.2,0,[.95,.91,.86]);
 box(-2.7,2.23,-3.20,7.10,1.55,.48,22,[1,1,1]);
 box(-6.8,1.2,-1.6,1.45,1.1,1.3,4,[.48,.35,.26]);box(0.9,1.2,-1.6,1.45,1.1,1.3,4,[.48,.35,.26]);lamp(-6.8,2.07,-1.55);lamp(.9,2.07,-1.55);
 rug(-2.7,1.95,8.1,7.5,[.72,.73,.68]);pottedPlant(7.0,2.4,.95);ceilingLight(-2.4,.4);
}
function reception(){roomShell([.85,.83,.79]);
 box(0,3.24,-3.95,12.0,5.85,.16,21,[1,1,1]);
 
 for(let i=0;i<12;i++){const x=-5.4+i*.95;box(x,3.1,-3.78,.04,5.75,.06,9,[.31,.36,.33]);}
 box(0,3.37,-3.63,5.8,1.05,.10,22,[1,1,1]);
 box(0,1.31,1.20,9.6,2.47,2.05,1,[1,1,1]);box(0,2.65,1.12,10.25,.21,2.32,5,[.83,.80,.74]);box(0,1.35,2.29,8.85,.08,.12,9,[.43,.37,.3]);
 box(-3.4,3.0,-3.45,1.3,.25,.2,13,[.90,.69,.44]);box(0,3.0,-3.45,1.3,.25,.2,13,[.90,.69,.44]);box(3.4,3.0,-3.45,1.3,.25,.2,13,[.90,.69,.44]);
 box(-5.3,.54,4.1,1.8,.55,.9,4,[.46,.47,.44]);box(5.3,.54,4.1,1.8,.55,.9,4,[.46,.47,.44]);pottedPlant(-7.2,1.2,1.07);pottedPlant(7.2,1.7,.94);
 for(let i=-1;i<=1;i++){box(i*2.45,.7,-1.18,1.46,.28,1.15,4,[.62,.51,.39]);box(i*2.45,1.05,-1.65,1.46,.65,.26,4,[.62,.51,.39]);}
 for(let i=-1;i<=1;i++)ceilingLight(i*2.7,.4);
}
function living(){roomShell([.83,.82,.78]);
 box(.85,3.2,-3.9,11.8,5.86,.19,1,[1,1,1]);
 box(.9,3.30,-3.70,7.3,3.38,.13,9,[.14,.17,.18]);
 box(.9,3.3,-3.62,6.95,3.12,.055,2,[.13,.18,.21]);
 box(.85,1.1,-3.35,10.7,1.0,1.32,21,[1,1,1]);box(.85,1.67,-3.23,11.35,.14,1.75,22,[1,1,1]);
 // floor soft furnishings
 rug(-1.0,2.3,8.9,6.3,[.82,.79,.72]);
 box(-2.3,.7,3.58,6.9,1.21,2.28,4,[.65,.66,.62]);box(-2.3,1.30,4.57,7.0,1.40,.45,4,[.63,.65,.61]);
 box(-5.72,1.35,3.54,.49,1.4,2.58,4,[.62,.64,.6]);box(1.11,1.35,3.54,.49,1.4,2.58,4,[.62,.64,.6]);
 box(-1.0,.74,1.15,3.30,.32,1.75,4,[.55,.42,.32]);box(-1.0,.34,1.15,2.9,.75,1.28,9,[.29,.32,.31]);
 pottedPlant(7.0,1.5,1.1);box(-6.5,3.1,-3.74,2.0,3.6,.11,22,[1,1,1]);ceilingLight(1.0,1.2);
}
function wardrobe(){roomShell([.80,.8,.76]);
 box(0,3.2,-3.88,15.2,5.95,.40,9,[.32,.31,.30]);
 for(let i=0;i<7;i++){const x=-6.4+i*2.1;box(x,3.12,-3.55,2.04,5.73,.18,1,[1,1,1]);box(x+.70,3.0,-3.40,.036,.68,.13,7,[.70,.66,.55]);}
 box(-8.28,3.0,-.8,.45,5.96,6.3,21,[1,1,1]);box(8.20,3.0,-.8,.4,5.96,6.3,21,[1,1,1]);
 box(-2.5,1.05,1.9,6.10,1.7,2.35,22,[1,1,1]);box(-2.5,1.98,1.90,5.85,.17,2.4,5,[.79,.75,.68]);
 for(let i=0;i<3;i++)box(-4.3+i*1.8,1.04,3.04,.06,.5,.07,7,[.70,.66,.55]);
 box(5.6,2.9,1.2,2.5,4.6,.18,3,[.65,.75,.75]);box(5.6,2.9,1.31,2.61,4.73,.08,9,[.30,.27,.24]);
 rug(-2.0,1.65,9.5,6.8,[.70,.68,.62]);for(let i=-1;i<=1;i++)ceilingLight(i*2.1,-.7);pottedPlant(-7.4,2.45,.7);
}
function meeting(){roomShell([.85,.84,.81]);
 // full presentation wall and center insert so ACP coverage feels complete
 box(0,3.28,-3.92,12.8,5.7,.16,1,[1,1,1]);
 
 box(0,3.30,-3.66,6.95,3.68,.14,22,[1,1,1]);
 box(0,3.3,-3.50,4.60,2.64,.10,9,[.17,.20,.20]);
 for(let i=0;i<6;i++)box(-5.6+i*2.22,3.34,-3.66,.05,5.72,.09,9,[.24,.26,.25]);
 // conference table becomes second editable surface
 box(0,1.75,1.35,9.30,.34,3.45,21,[1,1,1]);box(-3.0,.9,1.35,1.1,1.6,2.2,9,[.31,.31,.30]);box(3.0,.9,1.35,1.1,1.6,2.2,9,[.31,.31,.30]);
 for(let i=0;i<4;i++)for(let sign of [-1,1]){let x=-3.35+i*2.2,z=1.35+sign*2.4;box(x,.75,z,1.42,.22,1.25,4,[.42,.45,.45]);box(x,1.42,z+sign*.43,1.38,1.18,.26,4,[.44,.47,.47]);box(x,.33,z,.12,.73,.13,9,[.27,.29,.28]);}
 rug(0,1.1,13.5,7.6,[.71,.72,.68]);for(let i=-1;i<=1;i++)ceilingLight(i*2.0,1.2);pottedPlant(-7.3,1.1,.88);box(0,5.95,-3.87,12.4,.06,.08,18,[.94,.74,.45]);
}

function scenePolish(){
 if(currentScene==='residence'){
  box(-2.7,2.57,5.32,6.50,.075,.14,9,[.12,.14,.15]);
  box(-2.7,5.60,5.31,6.70,.075,.18,9,[.13,.15,.16]);
  box(3.0,2.57,5.34,5.1,.055,.14,9,[.18,.20,.21]);
  for(let i=0;i<4;i++)box(-5.35+i*1.71,5.59,5.43,.06,.05,.04,18,[.91,.72,.42]);
 }else if(currentScene==='retail'){
  box(0,3.56,4.68,13.4,.095,.13,9,[.14,.15,.17]);
  box(0,3.49,4.79,13.1,.034,.06,18,[.92,.71,.39]);
  box(0,4.72,4.13,13.8,.06,.17,9,[.13,.14,.16]);
 }else if(currentScene==='office'){
  for(let i=0;i<3;i++)box(0,3.01+i*3.04,4.26,10.9,.065,.14,9,[.13,.16,.18]);
  box(0,3.04,4.85,4.75,.04,.15,18,[.87,.74,.53]);
 }else if(currentScene==='kitchen'){
  box(-1.2,4.12,-3.35,9.96,.06,.12,9,[.18,.19,.20]);
  box(-1.2,4.055,-3.26,9.7,.03,.05,18,[.91,.75,.49]);
  box(.2,.13,1.24,6.2,.17,2.08,9,[.14,.14,.15]);
  for(let i=0;i<4;i++)box(-4.2+i*2.0,1.23,-3.23,.045,.39,.09,7,[.64,.56,.44]);
 }else if(currentScene==='bedroom'){
  box(-2.7,5.97,-3.75,8.65,.055,.14,18,[.95,.75,.46]);
  box(4.65,.19,-2.89,6.85,.13,.28,9,[.16,.17,.18]);
  box(-2.7,.55,3.75,6.45,.075,.12,9,[.22,.23,.23]);
 }else if(currentScene==='reception'){
  box(0,.15,2.28,9.38,.12,.16,9,[.13,.14,.15]);
  box(0,2.56,2.24,9.45,.055,.08,18,[.92,.75,.49]);
  box(0,3.96,-3.56,5.95,.055,.13,18,[.89,.74,.48]);
 }else if(currentScene==='living'){
  box(.85,5.98,-3.69,11.38,.06,.11,18,[.91,.71,.40]);
  box(.85,.55,-2.79,10.0,.12,.21,9,[.15,.17,.18]);
  box(-2.3,.22,3.55,6.65,.075,2.10,9,[.19,.21,.23]);
 }else if(currentScene==='wardrobe'){
  box(0,6.01,-3.57,14.7,.065,.15,18,[.89,.73,.43]);
  box(0,.14,-3.49,14.5,.13,.19,9,[.13,.14,.15]);
  box(-2.5,.12,2.0,5.8,.12,2.2,9,[.14,.15,.15]);
 }else if(currentScene==='meeting'){
  box(0,.24,1.33,8.8,.16,2.6,9,[.12,.14,.15]);
  box(0,1.52,1.35,9.1,.07,3.42,9,[.14,.15,.16]);
  box(0,5.99,-3.74,12.2,.075,.16,18,[.91,.73,.42]);
 }
}
function createGeometry(){lastFallbackSignature='';lastFallbackFrame=0;vertices=[];const fn=({residence,retail,office,kitchen,bedroom,reception,living,wardrobe,meeting})[currentScene];fn();scenePolish();vertexCount=vertices.length/12;bufferDirty=true;}
function persp(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,(2*far*near)*nf,0];}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}function norm(v){const l=Math.hypot(...v)||1;return v.map(x=>x/l);}function sub(a,b){return a.map((x,i)=>x-b[i]);}
function lookAt(eye,target){const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x[0]*eye[0]-x[1]*eye[1]-x[2]*eye[2],-y[0]*eye[0]-y[1]*eye[1]-y[2]*eye[2],-z[0]*eye[0]-z[1]*eye[1]-z[2]*eye[2],1];}
function mul(A,B){let C=new Array(16).fill(0);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)C[col*4+row]+=A[k*4+row]*B[col*4+k];return C;}
function resize(){const w=Math.max(1,viewport.clientWidth),h=Math.max(1,viewport.clientHeight),dpr=fallbackReady?Math.min(1.18,Math.sqrt(1300000/(w*h))):Math.min(devicePixelRatio||1,2.0);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}if(glReady)gl.viewport(0,0,canvas.width,canvas.height);}

function softBlob(wx,wz,cx,cz,rx,rz){const dx=(wx-cx)/rx,dz=(wz-cz)/rz;const q=dx*dx+dz*dz;return Math.max(0,1-q*q);}
function smoothShadow(x,z,cx,cz,rx,rz){
 const dx=(x-cx)/rx,dz=(z-cz)/rz,r=dx*dx+dz*dz;
 if(r>=1.65)return 0;
 let a=Math.max(0,Math.min(1,(1.65-r)/1.55));return a*a*(3-2*a);
}
function floorShade(scene,x,z){
 let o=0;
 if(scene==='residence'){
  o+=.30*smoothShadow(x,z,1.2,2.5,7.7,6.1);
  o+=.18*smoothShadow(x,z,-3.4,5.7,3.4,2.1);
  o+=.16*smoothShadow(x,z,-10.1,1.2,3.2,4.4);
  o+=.13*smoothShadow(x,z,12.0,-.5,2.5,3.8);
 }else if(scene==='retail'){
  o+=.28*smoothShadow(x,z,1,3.5,8.1,5.6);
  o+=.16*smoothShadow(x,z,0,6.1,7.2,2.4);
 }else if(scene==='office'){
  o+=.32*smoothShadow(x,z,1.6,2.5,7.1,6.4);
  o+=.12*smoothShadow(x,z,0,6.1,4.8,2.4);
 }else if(scene==='kitchen'){
  o+=.28*smoothShadow(x,z,.2,1.2,4.0,1.8);
  o+=.18*smoothShadow(x,z,-1.4,-3.3,6.8,1.7);
 }else if(scene==='bedroom'){
  o+=.29*smoothShadow(x,z,-2.7,.5,3.9,3.7);
  o+=.19*smoothShadow(x,z,4.5,-3.1,3.7,1.5);
 }else if(scene==='reception'){
  o+=.32*smoothShadow(x,z,0,1.2,5.5,1.95);
  o+=.15*smoothShadow(x,z,0,-3.3,6.4,1.5);
 }else if(scene==='living'){
  o+=.29*smoothShadow(x,z,-2.3,3.65,4.5,2.35);
  o+=.18*smoothShadow(x,z,.85,-3.2,6.1,1.5);
 }else if(scene==='wardrobe'){
  o+=.27*smoothShadow(x,z,-2.5,1.9,3.8,2.1);
  o+=.21*smoothShadow(x,z,0,-3.3,7.2,1.7);
 }else if(scene==='meeting'){
  o+=.32*smoothShadow(x,z,0,1.35,5.7,2.45);
  o+=.17*smoothShadow(x,z,0,-3.3,6.9,1.8);
 }
 return Math.max(.47,1-o);
}
function sceneShadow(scene,x,y,z,nx,ny,nz,k){
 let shade=1;
 const surfaceFloor=ny>.6&&(k===5||k===6||k===15||k===16||k===17||k===9||k===10);
 if(surfaceFloor&&y<.25)shade*=floorShade(scene,x,z);
 const floorAO=1-.105*Math.max(0,1-(y+.2)*1.2);
 if(Math.abs(ny)<.5)shade*=floorAO;
 if(scene==='residence'||scene==='retail'||scene==='office'){
  if(z>3.65&&y>2.2&&y<3.1&&nz>.65)shade*=.86;
  if(z>3.7&&y>4.25&&y<5.65&&nz>.65)shade*=.92;
 }else{
  if(z<-3.35&&y<2.9&&nz>.55)shade*=.91;
  if(y<.3&&Math.abs(nx)+Math.abs(nz)>.7)shade*=.92;
 }
 return Math.max(.48,shade);
}
function renderSoftware(ts){
 if(!ctx2d)return;const w=canvas.width,h=canvas.height;if(w<1||h<1)return;
 let sky=ctx2d.createRadialGradient(w*.54,h*.28,10,w*.53,h*.42,w*.84);sky.addColorStop(0,night?'#40372f':'#62656b');sky.addColorStop(.58,night?'#242629':'#363b42');sky.addColorStop(1,night?'#101318':'#15191e');ctx2d.fillStyle=sky;ctx2d.fillRect(0,0,w,h);
 let d=SCENES[currentScene],tar=[0,d.look,0],r=actualDistance,eye=[Math.sin(actualAngle)*Math.cos(actualElevation)*r,Math.sin(actualElevation)*r+d.look,Math.cos(actualAngle)*Math.cos(actualElevation)*r];let vp=mul(persp(Math.PI/180*38,w/h,.1,170),lookAt(eye,tar));
 const project=(i)=>{const x=vertices[i],y=vertices[i+1],z=vertices[i+2],ww=vp[3]*x+vp[7]*y+vp[11]*z+vp[15];if(ww<=.1)return null;let xx=(vp[0]*x+vp[4]*y+vp[8]*z+vp[12])/ww,yy=(vp[1]*x+vp[5]*y+vp[9]*z+vp[13])/ww;return [(xx*.5+.5)*w,(-yy*.5+.5)*h,ww];};
 let image=ctx2d.getImageData(0,0,w,h),pixels=image.data,depth=new Float32Array(w*h);depth.fill(0);
 const finishColors=[0,1,2].map(z=>materials[pickForZone(z)].rgb);
 for(let i=0;i<vertices.length;i+=36){
  let a=project(i),b=project(i+12),c=project(i+24);if(!a||!b||!c)continue;
  let x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(w-1,Math.ceil(Math.max(a[0],b[0],c[0]))),y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(h-1,Math.ceil(Math.max(a[1],b[1],c[1])));
  if(x0>x1||y0>y1)continue;let den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<.00001)continue;
  let k=vertices[i+11],zone=k===1?0:k===21?1:k===22?2:-1;let col=zone>=0?finishColors[zone]:[vertices[i+8],vertices[i+9],vertices[i+10]];
  if(k===3)col=[.19,.27,.32];else if(k===14)col=[.9,.81,.6];else if(k===18)col=[.72,.49,.28];
  let nx=vertices[i+3],ny=vertices[i+4],nz=vertices[i+5],sh=Math.max(0,nx*(-.52)+ny*.89+nz*.73)/1.27;
  let brightness=(night?.54:.73)+sh*(night?.45:.43);if(k===14||k===18)brightness=night?1.48:1.14;
  let inv=1/den,b0=b[1]-c[1],b1=c[0]-b[0],c0=c[1]-a[1],c1=a[0]-c[0],ai=1/a[2],bi=1/b[2],ci=1/c[2],tex=zone>=0?pixelTextures[zone]:null;
  const cy=(vertices[i+1]+vertices[i+13]+vertices[i+25])/3,groundTri=ny>.6&&cy<.25&&(k===5||k===6||k===15||k===16||k===17||k===9||k===10);
  const cx=(vertices[i]+vertices[i+12]+vertices[i+24])/3,cz=(vertices[i+2]+vertices[i+14]+vertices[i+26])/3;
  const solidFaceShade=groundTri?1:sceneShadow(currentScene,cx,cy,cz,nx,ny,nz,k);
  for(let yy=y0;yy<=y1;yy++){let py=yy+.5;for(let xx=x0;xx<=x1;xx++){
    let px=xx+.5,t=(b0*(px-c[0])+b1*(py-c[1]))*inv;if(t<0||t>1)continue;let u=(c0*(px-c[0])+c1*(py-c[1]))*inv;if(u<0||t+u>1)continue;
    let zz=t*ai+u*bi+(1-t-u)*ci,pi=yy*w+xx;if(zz<=depth[pi])continue;depth[pi]=zz;
    let R=col[0],G=col[1],B=col[2];
    let wx=t*vertices[i]+u*vertices[i+12]+(1-t-u)*vertices[i+24],wy=t*vertices[i+1]+u*vertices[i+13]+(1-t-u)*vertices[i+25],wz=t*vertices[i+2]+u*vertices[i+14]+(1-t-u)*vertices[i+26];
    if(zone>=0&&tex&&materials[pickForZone(zone)].category!=='solid'){let texU=t*vertices[i+6]+u*vertices[i+18]+(1-t-u)*vertices[i+30],texV=t*vertices[i+7]+u*vertices[i+19]+(1-t-u)*vertices[i+31];let uu=((texU%1)+1)%1,vv=((texV%1)+1)%1;let tx=Math.max(0,Math.min(255,Math.floor(uu*255))),ty=Math.max(0,Math.min(255,Math.floor((1-vv)*255))),tp=(ty*256+tx)*4;R=tex[tp]/255;G=tex[tp+1]/255;B=tex[tp+2]/255;}
    if(zone>=0){R=R*blend+.52*(1-blend);G=G*blend+.53*(1-blend);B=B*blend+.5*(1-blend);}
    if(k===5||k===6){let grain=.945+.045*(Math.sin(wx*1.7)*Math.cos(wz*2.3));R*=grain;G*=grain;B*=grain;}
    if(k===3){let gleam=Math.pow(Math.max(0,1-Math.abs((px/w)*3-(py/h)*.72-1.15)),14)*.18;R+=gleam*.52;G+=gleam*.71;B+=gleam*.82;}
    if(k===7||k===9){let metal=Math.pow(Math.max(0,sh),5)*.14;R+=metal;G+=metal;B+=metal;}
    let shade=groundTri?floorShade(currentScene,wx,wz):solidFaceShade;
    let ao=1.0-0.07*Math.pow(1-Math.max(0,ny),1.4);
    let finalB=brightness*shade*ao;
    let p=pi*4;pixels[p]=Math.min(255,(Math.pow(Math.max(0,R*finalB),.95)/(1+.12*Math.pow(Math.max(0,R*finalB),.95)))*255);pixels[p+1]=Math.min(255,(Math.pow(Math.max(0,G*finalB),.95)/(1+.12*Math.pow(Math.max(0,G*finalB),.95)))*255);pixels[p+2]=Math.min(255,(Math.pow(Math.max(0,B*finalB),.95)/(1+.12*Math.pow(Math.max(0,B*finalB),.95)))*255);pixels[p+3]=255;
  }}
 }
 ctx2d.putImageData(image,0,0);
}
function render(ts){if(!glReady&&!fallbackReady)return;let dt=Math.min((ts-lastTime)/1000,.05);lastTime=ts;if(autorotate&&!mouseDown)targetAngle+=dt*.12;actualAngle+=(targetAngle-actualAngle)*Math.min(1,dt*7);actualElevation+=(targetElevation-actualElevation)*Math.min(1,dt*7);actualDistance+=(targetDistance-actualDistance)*Math.min(1,dt*7);resize();if(fallbackReady){const sig=[currentScene,actualAngle.toFixed(2),actualElevation.toFixed(2),actualDistance.toFixed(1),night,blend.toFixed(2),zonePicks[currentScene].join('-'),texVersion.join('-'),selectionVersion].join('~');if(ts-lastFallbackFrame>130&&(lastFallbackSignature!==sig||lastFallbackFrame===0)){lastFallbackFrame=ts;lastFallbackSignature=sig;renderSoftware(ts);}requestAnimationFrame(render);return;}gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 if(bufferDirty){gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);bufferDirty=false;}
 let d=SCENES[currentScene],tar=[0,d.look,0],r=actualDistance,eye=[Math.sin(actualAngle)*Math.cos(actualElevation)*r,Math.sin(actualElevation)*r+d.look,Math.cos(actualAngle)*Math.cos(actualElevation)*r];let vp=mul(persp(Math.PI/180*38,canvas.width/canvas.height,.1,170),lookAt(eye,tar));gl.uniformMatrix4fv(gl.getUniformLocation(program,'uVP'),false,new Float32Array(vp));
 let colorData=[],glossData=[],solidData=[];for(let z=0;z<3;z++){const m=materials[pickForZone(z)];colorData.push(...m.rgb);glossData.push(m.gloss);solidData.push(m.category==='solid'?1:0);gl.activeTexture(gl.TEXTURE0+z);gl.bindTexture(gl.TEXTURE_2D,textures[z]);}
 gl.uniform3fv(gl.getUniformLocation(program,'uColors[0]'),new Float32Array(colorData));gl.uniform3fv(gl.getUniformLocation(program,'uGloss'),new Float32Array(glossData));gl.uniform3fv(gl.getUniformLocation(program,'uSolidFlags'),new Float32Array(solidData));gl.uniform3fv(gl.getUniformLocation(program,'uTextureReady'),new Float32Array(texReady));gl.uniform1f(gl.getUniformLocation(program,'uBlend'),blend);gl.uniform1f(gl.getUniformLocation(program,'uNight'),night?1:0);gl.uniform1f(gl.getUniformLocation(program,'uSceneIndex'),Object.keys(SCENES).indexOf(currentScene));gl.uniform1f(gl.getUniformLocation(program,'uTime'),ts*.001);gl.drawArrays(gl.TRIANGLES,0,vertexCount);$('fpsLabel').textContent='INTERACTIVE 3D';requestAnimationFrame(render);
}
function toast(s){let n=$('toast');n.textContent=s;n.classList.add('visible');clearTimeout(toastId);toastId=setTimeout(()=>n.classList.remove('visible'),2900);}
function sceneList(){let html='';Object.entries(SCENES).forEach(([id,s],i)=>{if(sceneFilter!=='all'&&s.kind!==sceneFilter)return;html+=`<button class="scene-item ${id===currentScene?'active':''}" data-scene="${id}" aria-pressed="${id===currentScene}"><span class="scene-icon">${s.icon}</span><span class="scene-copy"><b>${s.title}</b><small>${s.subtitle}</small></span><small class="scene-num">${String(i+1).padStart(2,'0')}</small></button>`;});$('sceneList').innerHTML=html;$('sceneCount').textContent=Object.keys(SCENES).length+' SCENES';document.querySelectorAll('[data-scene]').forEach(b=>b.addEventListener('click',()=>activateScene(b.dataset.scene)));}
function activateScene(id){if(!SCENES[id])return;currentScene=id;activeZone=0;texIds=[-1,-1,-1];texReady=[0,0,0];pixelTextures=[null,null,null];perZoneStatus.fill('');perZoneError.fill(false);forceSoftwareRedraw();let d=SCENES[id],i=Object.keys(SCENES).indexOf(id)+1;targetAngle=d.angle;targetElevation=d.elevation;targetDistance=d.distance;$('sceneTitle').textContent=d.title.toUpperCase();$('headlineScene').innerHTML=d.title.toUpperCase().split(' ').join('<br>');$('headlineSubtitle').textContent=d.subtitle;$('sceneNumber').textContent=String(i).padStart(2,'0');$('captionTitle').textContent=d.title.toUpperCase();$('captionSubtitle').textContent=d.subtitle+' · Material study';sceneList();document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('active',b.dataset.preset===id));makeZones();createGeometry();for(let z=0;z<3;z++)loadTexture(z);}
function makeZones(){const d=SCENES[currentScene];$('zoneList').innerHTML=d.zones.map((name,i)=>`<button class="zone ${i===activeZone?'active':''}" data-zone="${i}" aria-pressed="${i===activeZone}"><small>0${i+1} / EDIT</small><b>${name}</b></button>`).join('');document.querySelectorAll('[data-zone]').forEach(b=>b.addEventListener('click',()=>{activeZone=+b.dataset.zone;makeZones();buildFinishes();showActiveMaterialStatus();}));updateChosen();}
function updateChosen(){const m=materials[pickForZone(activeZone)];$('chosenName').textContent=m.name;$('chosenCode').textContent=m.code+' · '+CATEGORY[m.category];$('chosenThumb').style.backgroundImage=`url("${m.texture}")`;}
function categories(){const all=[['all','All Finishes',materials.length],...ORDER.map(k=>[k,CATEGORY[k],materials.filter(m=>m.category===k).length])];$('categoryList').innerHTML=all.map(([k,n,c])=>`<button class="cat-chip ${k===categoryFilter?'active':''}" data-cat="${k}">${n}<span>${c}</span></button>`).join('');document.querySelectorAll('[data-cat]').forEach(b=>b.addEventListener('click',()=>{categoryFilter=b.dataset.cat;categories();buildFinishes();}));}
function buildFinishes(){const match=materials.filter(m=>(categoryFilter==='all'||m.category===categoryFilter)&&(!query||[m.name,m.code,CATEGORY[m.category]].join(' ').toLowerCase().includes(query)));$('matchCount').textContent=match.length+' FINISHES';const current=materials[pickForZone(activeZone)];let s='';for(let cat of ORDER){const group=match.filter(m=>m.category===cat);if(!group.length)continue;s+=`<section class="material-section"><h3 class="material-section-title">${CATEGORY[cat]} <span>${group.length.toString().padStart(2,'0')}</span></h3><div class="material-grid">`;for(let m of group){const ix=materials.indexOf(m);s+=`<button data-finish="${ix}" class="material-card ${m===current?'selected':''}" aria-pressed="${m===current}"><img loading="lazy" decoding="async" class="texture-img" src="${m.texture}" alt="Sampel katalog ${m.name}" onerror="this.style.display='none'"><div class="material-label">${m.name}</div><div class="material-code">${m.code}</div></button>`;}s+='</div></section>';}$('finishList').innerHTML=s||'<p style="font-size:11px;color:#9fb3a2">Tidak ada material yang sesuai pencarian.</p>';document.querySelectorAll('[data-finish]').forEach(b=>b.addEventListener('click',()=>{zonePicks[currentScene][activeZone]=+b.dataset.finish;forceSoftwareRedraw();updateChosen();loadTexture(activeZone);document.querySelectorAll('[data-finish]').forEach(card=>{const selected=+card.dataset.finish===zonePicks[currentScene][activeZone];card.classList.toggle('selected',selected);card.setAttribute('aria-pressed',String(selected));});}));updateChosen();}
function presentation(on){fullPresentation=on;$('appShell').classList.toggle('presentation',on);$('presentationBtn').textContent=on?'✕':'⛶';setTimeout(resize,80);if(on)toast('Presentation mode aktif — ESC untuk kembali');}
function capture(){if(!glReady&&!fallbackReady)return toast('Viewer 3D belum siap');try{let out=document.createElement('canvas');out.width=2400;out.height=1590;const ctx=out.getContext('2d');ctx.scale(1.5,1.5);let g=ctx.createLinearGradient(0,0,1600,1060);g.addColorStop(0,night?'#1c1a19':'#34383e');g.addColorStop(1,night?'#111418':'#171a20');ctx.fillStyle=g;ctx.fillRect(0,0,1600,1060);const src=canvas.width/canvas.height,dst=1600/840;let w,h;if(src>dst){w=1600;h=w/src}else{h=840;w=h*src}ctx.drawImage(canvas,(1600-w)/2,116+(840-h)/2,w,h);ctx.fillStyle='#f1e9d5';ctx.font='700 29px Arial';ctx.fillText('GLOBAL FUTURE LAB',52,55);ctx.font='700 14px Arial';ctx.fillText('OFFICIAL MATERIAL VISUALIZER  ·  GLOBALBOND / GLOBAL ALUMINIUM ASIA',53,82);ctx.font='700 24px Arial';ctx.fillText(SCENES[currentScene].title.toUpperCase(),52,990);ctx.font='16px Arial';ctx.fillText(SCENES[currentScene].zones.map((label,i)=>`${label}: ${materials[pickForZone(i)].name}`).join('     |     '),52,1023);const link=document.createElement('a');link.download=`GLOBAL-FUTURE-LAB_${currentScene}.png`;link.href=out.toDataURL('image/png');link.click();toast('Render concept tersimpan.');}catch(e){console.error(e);toast('Export gagal. Coba browser Chrome/Edge.');}}
function bind(){document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>activateScene(b.dataset.preset))); document.querySelectorAll('[data-scene-filter]').forEach(b=>b.addEventListener('click',()=>{sceneFilter=b.dataset.sceneFilter;document.querySelectorAll('[data-scene-filter]').forEach(v=>v.classList.toggle('active',v===b));sceneList();}));$('finishSearch').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();buildFinishes();});$('blendSlider').addEventListener('input',e=>{blend=(+e.target.value)/100;$('blendPercent').textContent=blend===0?'ORIGINAL SURFACE':Math.round(blend*100)+'% FINISHED';});$('rotateBtn').addEventListener('click',()=>{autorotate=!autorotate;$('rotateBtn').classList.toggle('active',autorotate);});$('resetBtn').addEventListener('click',()=>{const d=SCENES[currentScene];targetAngle=d.angle;targetElevation=d.elevation;targetDistance=d.distance;});$('daylightBtn').addEventListener('click',()=>{night=!night;$('daylightBtn').classList.toggle('active',night);viewport.style.background=night?'linear-gradient(140deg,#2b4041,#42544c 60%,#293b37)':'linear-gradient(155deg,#eef0ea,#c9d6cf 60%,#a6baac)';});$('captureBtn').addEventListener('click',capture);$('presentationBtn').addEventListener('click',()=>presentation(!fullPresentation));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&fullPresentation)presentation(false);if(e.key==='ArrowLeft')targetAngle-=.15;if(e.key==='ArrowRight')targetAngle+=.15;});viewport.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;mouseDown=true;oldX=e.clientX;oldY=e.clientY;mouseButton=e.button;viewport.setPointerCapture(e.pointerId)});viewport.addEventListener('pointermove',e=>{if(!mouseDown)return;let dx=e.clientX-oldX,dy=e.clientY-oldY;if(mouseButton===2)targetDistance=Math.max(9,Math.min(54,targetDistance+dy*.05));else{targetAngle+=dx*.009;targetElevation=Math.max(.1,Math.min(1.15,targetElevation+dy*.005));}oldX=e.clientX;oldY=e.clientY});viewport.addEventListener('pointerup',()=>{mouseDown=false});viewport.addEventListener('pointercancel',()=>{mouseDown=false});viewport.addEventListener('contextmenu',e=>e.preventDefault());viewport.addEventListener('wheel',e=>{e.preventDefault();targetDistance=Math.max(9,Math.min(54,targetDistance+e.deltaY*.016));},{passive:false});window.addEventListener('resize',resize);}
window.GFL_DIAGNOSTICS=()=>({scene:currentScene,zone:activeZone,materials:zonePicks[currentScene].map(i=>({code:materials[i].code,name:materials[i].name,category:materials[i].category})),textureReady:texReady.slice(),software:fallbackReady,webgl:glReady,textureVersion:texVersion.slice(),available:materials.length,geometry:vertexCount,pixelCache:textureBytesCache.size,renderer:glReady?"gpu-raw-pixels":"software-raw-pixels"});
function main(){if(!materials.length){$('viewerError').hidden=false;$('viewerError').textContent='Library material belum termuat';return;}$('totalCounter').textContent=materials.length;bind();initGL();categories();activateScene('residence');buildFinishes();if(glReady||fallbackReady){resize();requestAnimationFrame(render);}}
main();
})();