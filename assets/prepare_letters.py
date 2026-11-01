from pathlib import Path
from collections import deque
import json, string, shutil
import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parent
SIZES={'compact':(242,270),'tall':(348,437),'pumpkin':(348,359)}
ORIGINAL=ROOT/'originals'

def components(image):
    a=np.asarray(image)
    mask=(a[:,:,3]>180)&(a[:,:,:3].min(axis=2)<248)
    h,w=mask.shape
    seen=np.zeros((h,w),bool)
    objects=[]
    for y,x in zip(*np.nonzero(mask)):
        if seen[y,x]: continue
        q=deque([(int(y),int(x))]);seen[y,x]=True;coords=[]
        while q:
            yy,xx=q.popleft();coords.append((yy,xx))
            for ny,nx in ((yy-1,xx),(yy+1,xx),(yy,xx-1),(yy,xx+1)):
                if 0<=ny<h and 0<=nx<w and mask[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx]=True;q.append((ny,nx))
        if len(coords)>1500:
            ys,xs=zip(*coords)
            objects.append({'box':(min(xs),min(ys),max(xs)+1,max(ys)+1),'count':len(coords),'coords':coords})
    return objects

def extract_atlas(style,part,letters):
    src=ROOT/'atlases'/f'{style}-{part}.png'
    if not src.exists(): return []
    im=Image.open(src).convert('RGBA')
    objects=components(im)
    # Reading order: cluster by top/bottom row, then sort by horizontal center.
    mids=[(c['box'][1]+c['box'][3])/2 for c in objects]
    split=(min(mids)+max(mids))/2
    rows=[[o for o in objects if (o['box'][1]+o['box'][3])/2 < split],
          [o for o in objects if (o['box'][1]+o['box'][3])/2 >= split]]
    ordered=sum((sorted(row,key=lambda c:c['box'][0]) for row in rows),[])
    print(src.name,'objects',len(ordered),'boxes',[o['box'] for o in ordered])
    if len(ordered)!=len(letters):
        raise ValueError(f'{src}: expected {len(letters)} objects, found {len(ordered)}')
    output=[]
    for letter,obj in zip(letters,ordered):
        mask=np.zeros((im.height,im.width),np.uint8)
        yy,xx=zip(*obj['coords']);mask[yy,xx]=255
        support=Image.fromarray(mask).filter(ImageFilter.MaxFilter(19))
        arr=np.array(im);arr[:,:,3]=np.minimum(arr[:,:,3],np.asarray(support))
        # A nearby glyph can have a diagonal projection inside this padded box.
        # Retain white rim pixels but never import colored ink from another component.
        foreign=(np.asarray(im)[:,:,:3].min(axis=2)<248)&(mask==0)
        arr[:,:,3][foreign]=0
        cut=Image.fromarray(arr)
        x0,y0,x1,y1=obj['box'];box=(max(0,x0-12),max(0,y0-12),min(im.width,x1+12),min(im.height,y1+12))
        cut=cut.crop(box);cut=cut.crop(cut.getbbox())
        target=SIZES[style]
        scale=min((target[0]-12)/cut.width,(target[1]-12)/cut.height)
        cut=cut.resize((round(cut.width*scale),round(cut.height*scale)),Image.Resampling.LANCZOS)
        canvas=Image.new('RGBA',target)
        canvas.alpha_composite(cut,((target[0]-cut.width)//2,(target[1]-cut.height)//2))
        folder=ROOT/'letters'/style;folder.mkdir(parents=True,exist_ok=True)
        canvas.save(folder/f'{letter}.png',optimize=True)
        output.append(letter)
    return output

def exact_existing(style,letter,source):
    src=Image.open(source).convert('RGBA');target=SIZES[style]
    if src.size==target:
        shutil.copyfile(source,ROOT/'letters'/style/f'{letter}.png');return
    canvas=Image.new('RGBA',target)
    scale=min(target[0]/src.width,target[1]/src.height)
    cut=src.resize((round(src.width*scale),round(src.height*scale)),Image.Resampling.LANCZOS)
    canvas.alpha_composite(cut,((target[0]-cut.width)//2,(target[1]-cut.height)//2))
    canvas.save(ROOT/'letters'/style/f'{letter}.png',optimize=True)

def attachment(image):
    a=np.asarray(image)
    # Choose the center of a substantial solid top stroke, not its counter or empty canvas.
    solid=(a[:,:,3]>245)&(a[:,:,:3].min(axis=2)<245)
    ys,xs=np.nonzero(solid)
    top=int(ys.min());bottom=int(ys.max());left=int(xs.min());right=int(xs.max())
    # Prefer an upper-right upper stroke for consistent rear mount alignment.
    idealx=left+(right-left)*.75
    for frac in (.14,.18,.22,.27,.33):
        yy=round(top+(bottom-top)*frac)
        radius=max(5,round(image.width*.025))
        for x in sorted(range(left+radius,right-radius+1),key=lambda x:abs(x-idealx)):
            patch=solid[max(0,yy-radius):min(image.height,yy+radius+1),x-radius:x+radius+1]
            if patch.mean()>.97:return [int(x),int(yy)]
    # Fallback still chooses a fully opaque ink point, preferring the top quarter.
    scores=abs(xs-idealx)+abs(ys-(top+(bottom-top)*.2))*2
    j=int(np.argmin(scores));return [int(xs[j]),int(ys[j])]

def write_manifest():
    result={'version':1,'styles':{},'piston':{'src':'assets/piston-base.png','width':140,'height':139,'socket':[57,70]},'variants':{'leftD':{'src':'assets/variants/D-left.png','width':242,'height':270,'attachment':[186,38]}}}
    existing={('compact','G'):ORIGINAL/'G.png',('compact','T'):ORIGINAL/'T.png',('compact','D'):ORIGINAL/'DR.png',('tall','M'):ORIGINAL/'M.png',('pumpkin','C'):ORIGINAL/'C.png'}
    for style,size in SIZES.items():
        folder=ROOT/'letters'/style
        if not folder.exists():continue
        entries={}
        for letter in string.ascii_uppercase:
            dest=folder/f'{letter}.png'
            if not dest.exists():continue
            if (style,letter) in existing:exact_existing(style,letter,existing[style,letter])
            im=Image.open(dest).convert('RGBA')
            anchor=attachment(im)
            if style=='compact' and letter=='G':anchor=[186,38]
            if style=='compact' and letter=='T':anchor=[192,38]
            if style=='tall' and letter=='M':anchor=[196,54]
            entries[letter]={'src':f'assets/letters/{style}/{letter}.png','width':size[0],'height':size[1],'attachment':anchor}
        result['styles'][style]=entries
    shutil.copyfile(ORIGINAL/'piston-base.png',ROOT/'piston-base.png')
    (ROOT/'variants').mkdir(exist_ok=True)
    left=Image.open(ORIGINAL/'DL.png').convert('RGBA')
    target=(242,270);layer=Image.new('RGBA',target)
    scale=min(target[0]/left.width,target[1]/left.height)
    left=left.resize((round(left.width*scale),round(left.height*scale)),Image.Resampling.LANCZOS)
    layer.alpha_composite(left,((target[0]-left.width)//2,(target[1]-left.height)//2));layer.save(ROOT/'variants'/'D-left.png',optimize=True)
    (ROOT/'manifest.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    return result

def contact_sheet(style):
    folder=ROOT/'letters'/style
    if not folder.exists():return
    thumb=(150,180)
    canvas=Image.new('RGB',(7*thumb[0],4*(thumb[1]+22)),(239,240,244));d=ImageDraw.Draw(canvas)
    for i,letter in enumerate(string.ascii_uppercase):
        f=folder/f'{letter}.png'
        if not f.exists():continue
        im=Image.open(f).convert('RGBA');im.thumbnail((140,174),Image.Resampling.LANCZOS)
        x=(i%7)*150+(150-im.width)//2;y=(i//7)*202+(180-im.height)//2
        canvas.paste(im,(x,y),im)
        d.text(((i%7)*150+70,(i//7)*202+182),letter,fill=(10,30,55))
    canvas.save(ROOT/f'{style}-contact.png')

if __name__=='__main__':
    for style in SIZES:
        extract_atlas(style,'a-m','ABCDEFGHIJKLM')
        extract_atlas(style,'n-z','NOPQRSTUVWXYZ')
    result=write_manifest()
    for style in result['styles']:contact_sheet(style)
    print('counts',{s:len(a) for s,a in result['styles'].items()})
