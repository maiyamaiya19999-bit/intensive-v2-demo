# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1080, 1350
PADX = 100
CW = W - 2 * PADX
F = "/home/claude/c/fonts/"
OUT = "/mnt/user-data/outputs/carousel"
os.makedirs(OUT, exist_ok=True)

ACCENT=(110,84,63); INK=(26,26,26); T444=(68,68,68); T666=(102,102,102)
T888=(136,136,136); T999=(153,153,153); SOFT_BG=(243,238,231)
LINE_E8=(231,224,214); LINE_F0=(240,235,227); WHITE=(255,255,255)

def font(p,s): return ImageFont.truetype(F+p,s)
LORA_B=lambda s: font("Lora-Bold.ttf",s); LORA_I=lambda s: font("Lora-Italic.ttf",s)
IN_4=lambda s: font("Inter-400.ttf",s); IN_5=lambda s: font("Inter-500.ttf",s); IN_6=lambda s: font("Inter-600.ttf",s)

def wrap(d,text,fnt,max_w):
    words,lines,cur=text.split(),[],""
    for w_ in words:
        t=(cur+" "+w_).strip()
        if d.textlength(t,font=fnt)<=max_w: cur=t
        else:
            if cur: lines.append(cur)
            cur=w_
    if cur: lines.append(cur)
    return lines

def tracked(d,xy,text,fnt,fill,tr=4):
    x,y=xy
    for ch in text:
        d.text((x,y),ch,font=fnt,fill=fill); x+=d.textlength(ch,font=fnt)+tr
    return x-tr

def tracked_w(d,text,fnt,tr=4):
    return sum(d.textlength(c,font=fnt) for c in text)+tr*(len(text)-1)

def base(n,total=9):
    img=Image.new("RGB",(W,H),WHITE); d=ImageDraw.Draw(img)
    author=CONTENT.get("author","")
    if author:
        d.text((PADX,74),author,font=LORA_I(30),fill=T888)
    d.rectangle([0,152,W,153],fill=LINE_F0)
    d.rectangle([PADX,H-140,W-PADX,H-139],fill=LINE_E8)
    f2=IN_4(26)
    d.text((PADX,H-106),"листай дальше  →",font=f2,fill=T999)
    pg=f"{n:02d} / {total:02d}"
    d.text((W-PADX-d.textlength(pg,font=f2),H-106),pg,font=f2,fill=T999)
    return img,d

def badge(d,x,y,text):
    fnt=IN_6(24); tw=tracked_w(d,text,fnt,5)
    d.rectangle([x,y,x+tw+36,y+52],outline=ACCENT,width=2)
    tracked(d,(x+18,y+12),text,fnt,ACCENT,5)
    return y+52

def section_heading(d,y,num,text,em=None):
    d.rectangle([PADX,y,W-PADX,y+1],fill=LINE_E8); y+=56
    fnt=LORA_B(58); x=PADX
    d.text((x,y),num,font=fnt,fill=ACCENT)
    x+=d.textlength(num+" ",font=fnt)+6
    for i,line in enumerate(wrap(d,text,fnt,W-PADX-x)):
        d.text((x if i==0 else PADX,y),line,font=fnt,fill=INK); y+=78
    if em:
        d.text((PADX,y),em,font=LORA_I(58),fill=ACCENT); y+=78
    return y+26

def body(d,y,text,size=34,color=T444,max_w=CW,lh=1.72):
    fnt=IN_4(size)
    for line in wrap(d,text,fnt,max_w):
        d.text((PADX,y),line,font=fnt,fill=color); y+=int(size*lh)
    return y

def highlight(d,y,label,text):
    fnt=IN_4(31); fnt_b=IN_6(31); inner_w=CW-88
    lines=wrap(d,label+" "+text,fnt,inner_w)
    hgt=88+len(lines)*52-10
    d.rectangle([PADX,y,W-PADX,y+hgt],fill=SOFT_BG)
    ty=y+40; first=True
    for line in lines:
        if first and line.startswith(label):
            lw=d.textlength(label,font=fnt_b)
            d.text((PADX+44,ty),label,font=fnt_b,fill=INK)
            d.text((PADX+44+lw+10,ty),line[len(label):].strip(),font=fnt,fill=T444)
            first=False
        else:
            d.text((PADX+44,ty),line,font=fnt,fill=T444)
        ty+=52
    return y+hgt

def dot_list(d,y,items):
    fnt_b=IN_6(32); fnt=IN_4(32)
    for strong,rest in items:
        d.ellipse([PADX,y+18,PADX+12,y+30],fill=ACCENT)
        x=PADX+36; lw=d.textlength(strong,font=fnt_b)
        d.text((x,y),strong,font=fnt_b,fill=INK)
        fx=x+lw+12
        first_fit=wrap(d,rest,fnt,W-PADX-fx)
        if first_fit:
            d.text((fx,y),first_fit[0],font=fnt,fill=T444)
            remainder=rest[len(first_fit[0]):].strip()
        else: remainder=rest
        y+=52
        for line in wrap(d,remainder,fnt,CW-36):
            d.text((x,y),line,font=fnt,fill=T444); y+=52
        y+=18
        d.rectangle([PADX,y,W-PADX,y+1],fill=LINE_F0); y+=26
    return y

def render(C):
    # 1 · обложка
    img,d=base(1); y=268
    y=badge(d,PADX,y,C["badge"]); y+=48
    fh=LORA_B(82); fe=LORA_I(82)
    for line in C["h1_black"]:
        d.text((PADX,y),line,font=fh,fill=INK); y+=108
    for line in C["h1_accent"]:
        d.text((PADX,y),line,font=fe,fill=ACCENT); y+=108
    y+=22
    y=body(d,y,C["h1_sub"],36,T666,800); y+=30
    tracked(d,(PADX,y),C["h1_meta"],IN_5(26),T999,4)
    img.save(f"{OUT}/slide_01.jpg","JPEG",quality=95)
    # 2 · заявка (врезка)
    img,d=base(2)
    y=section_heading(d,250,"01.",C["s2_head"])
    y=body(d,y+8,C["s2_text"]); y+=44
    highlight(d,y,C["s2_label"],C["s2_note"])
    img.save(f"{OUT}/slide_02.jpg","JPEG",quality=95)
    # 3 · миф (врезка)
    img,d=base(3)
    y=section_heading(d,250,"02.",C["s3_head"])
    y=body(d,y+8,C["s3_text"]); y+=44
    highlight(d,y,C["s3_label"],C["s3_note"])
    img.save(f"{OUT}/slide_03.jpg","JPEG",quality=95)
    # 4 · сдвиг (em-строка)
    img,d=base(4)
    y=section_heading(d,250,"03.",C["s4_head"],em=C["s4_em"])
    y=body(d,y+8,C["s4_text1"]); y+=30
    body(d,y,C["s4_text2"])
    img.save(f"{OUT}/slide_04.jpg","JPEG",quality=95)
    # 5 · тест (список)
    img,d=base(5)
    y=section_heading(d,250,"04.",C["s5_head"])
    dot_list(d,y+8,C["s5_items"])
    img.save(f"{OUT}/slide_05.jpg","JPEG",quality=95)
    # 6 · что делать (врезка)
    img,d=base(6)
    y=section_heading(d,250,"05.",C["s6_head"])
    y=body(d,y+8,C["s6_text"]); y+=44
    highlight(d,y,C["s6_label"],C["s6_note"])
    img.save(f"{OUT}/slide_06.jpg","JPEG",quality=95)
    # 7 · закрепление
    img,d=base(7)
    y=section_heading(d,250,"06.",C["s7_head"])
    y=body(d,y+8,C["s7_text1"]); y+=30
    body(d,y,C["s7_text2"])
    img.save(f"{OUT}/slide_07.jpg","JPEG",quality=95)
    # 8 · вывод (центр, курсив)
    img,d=base(8); y=470; f_=LORA_I(66)
    for i,t in enumerate(C["s8_lines"]):
        c=ACCENT if i==len(C["s8_lines"])-1 else INK
        d.text(((W-d.textlength(t,font=f_))/2,y),t,font=f_,fill=c); y+=96
    y+=44; fnt=IN_4(32)
    for line in wrap(d,C["s8_sub"],fnt,700):
        d.text(((W-d.textlength(line,font=fnt))/2,y),line,font=fnt,fill=T666); y+=52
    img.save(f"{OUT}/slide_08.jpg","JPEG",quality=95)
    # 9 · призыв (prompt-box)
    img,d=base(9); y=280
    bx0,bx1=PADX,W-PADX; by0=y; by1=y+700
    d.rectangle([bx0,by0,bx1,by1],fill=SOFT_BG)
    ix=bx0+64; iy=by0+64
    d.text((ix,iy),C["s9_title"],font=LORA_B(48),fill=ACCENT); iy+=70
    d.text((ix,iy),C["s9_subtitle"],font=IN_4(27),fill=T888); iy+=78
    fnt=IN_4(33)
    for line in wrap(d,C["s9_text"],fnt,bx1-ix-64):
        d.text((ix,iy),line,font=fnt,fill=T444); iy+=54
    iy+=36
    d.text((ix,iy),"Напиши в комментариях слово",font=IN_4(30),fill=T666); iy+=56
    d.text((ix,iy),C["s9_codeword"],font=LORA_B(92),fill=ACCENT); iy+=122
    d.text((ix,iy),"— пришлю в директ.",font=IN_4(30),fill=T666)
    y=by1+72; f_i=LORA_I(34)
    t1,t2=C["s9_note_black"],C["s9_note_accent"]
    tw=d.textlength(t1,font=f_i)+d.textlength(t2,font=f_i); x=(W-tw)/2
    d.text((x,y),t1,font=f_i,fill=T444)
    d.text((x+d.textlength(t1,font=f_i),y),t2,font=f_i,fill=ACCENT)
    img.save(f"{OUT}/slide_09.jpg","JPEG",quality=95)

#
