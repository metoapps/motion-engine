#!/usr/bin/env python3
"""Kupon ceremony music: royalty-free procedural fanfare + comic defeat sting.
Only NumPy is required. Output: 15-second 48 kHz stereo signed WAV.
The file can be supplied to prepare.mjs using --audio. No downloads, no paid API.
"""
import sys
import numpy as np
from scipy.io import wavfile
from pathlib import Path
SR=48000; D=15; N=SR*D
y=np.zeros(N)
def hz(note):
    mapping={'C':0,'Cs':1,'D':2,'Eb':3,'E':4,'F':5,'Fs':6,'G':7,'Ab':8,'A':9,'Bb':10,'B':11}
    name=note[:-1]; octv=int(note[-1]);return 440*2**((((octv+1)*12+mapping[name])-69)/12)
def play(note,start,sec,level=.08,kind='brass'):
    p=int(start*SR);n=min(int(sec*SR),N-p)
    if n<=0:return
    t=np.arange(n)/SR; frequency=hz(note)
    if kind=='brass':
        a=sum(weight*np.sin(2*np.pi*frequency*k*t+.15*np.sin(2*np.pi*5*t)) for k,weight in ((1,1),(2,.38),(3,.23),(4,.13)))
        env=np.minimum(1,t/.05)*np.minimum(1,np.maximum(0,(sec-t)/.24))
    elif kind=='sad':
        phi=2*np.pi*np.cumsum(frequency*(1-.08*np.minimum(1,t/.3)))/SR
        a=np.sin(phi)+.27*np.sin(2*phi)+.1*np.sin(3*phi)
        env=np.minimum(1,t/.06)*np.minimum(1,np.maximum(0,(sec-t)/.18))
    else:
        a=np.sin(2*np.pi*frequency*t)+.13*np.sin(4*np.pi*frequency*t)
        env=np.minimum(1,t/.009)*np.exp(-7*t)
    y[p:p+n]+=level*a*env
for start,chord,sec in [
    (2.45,['C4','E4','G4','C5'],.72),
    (3.24,['F4','A4','C5','F5'],.72),
    (4.01,['G4','B4','D5','G5'],.65),
    (4.74,['C4','E4','G4','C5','E5'],1.9)]:
    for i,note in enumerate(chord): play(note,start+i*.018,sec,.054 if i<3 else .085)
for start,note in [(2.48,'C5'),(2.85,'E5'),(3.24,'G5'),(3.65,'E5'),(4.02,'G5'),(4.4,'B5'),(4.82,'C6')]:
    play(note,start,.31 if start<4.8 else 1.6,.083)
rng=np.random.default_rng(2026)
for st in (2.43,3.22,4.,4.76,5.65):
    p=int(st*SR);n=int(.12*SR);t=np.arange(n)/SR
    y[p:p+n]+=.055*rng.normal(size=n)*np.exp(-t*34)
for st,note,sec in [(7.08,'A4',.55),(7.61,'G4',.48),(8.1,'F4',.53),(8.65,'E4',.57),(9.25,'D4',.64),(10.02,'C4',1.05)]:
    play(note,st,sec,.1,'sad')
for st,note in [(7.2,'A3'),(7.72,'F3'),(8.2,'D3'),(8.75,'E3'),(9.3,'D3'),(10.08,'C3')]:
    play(note,st,.35,.055,'pluck')
for st,note in [(11.76,'C5'),(12.03,'E5'),(12.29,'G5'),(12.57,'C6')]:
    play(note,st,.27 if st<12.5 else .72,.057)
original=y.copy()
for delay,g in ((.095,.09),(.18,.035)):
    o=int(delay*SR);y[o:]+=original[:-o]*g
y*=min(1.,.77/max(1e-6,np.max(np.abs(y))))
stereo=np.stack((y,.965*y+.035*np.r_[np.zeros(109),y[:-109]]),axis=1)
dest=Path(sys.argv[1] if len(sys.argv)>1 else 'kupon-music.wav')
wavfile.write(dest,SR,(np.clip(stereo,-.9,.9)*32767).astype(np.int16))
print('MUSIC_OK',dest)
