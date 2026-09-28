import numpy as np
import wave
import os

def generate_cinematic_audio(output_path="scripts/recorder/cinematic/cinematic_soundtrack.wav", total_duration=210.0):
    sr = 44100
    n_samples = int(sr * total_duration)
    left = np.zeros(n_samples, dtype=np.float32)
    right = np.zeros(n_samples, dtype=np.float32)
    t = np.linspace(0, total_duration, n_samples, endpoint=False)

    print(f"Generating Vectorized Cinematic Audio ({total_duration:.1f}s @ {sr}Hz)...")

    # BPM = 116 -> Quarter note = 0.5172s
    bpm = 116.0
    beat_dur = 60.0 / bpm
    chord_dur = beat_dur * 8 # 4.138s

    chords = [
        # Dm
        [146.83, 174.61, 220.00, 293.66],
        # Bb
        [116.54, 146.83, 174.61, 233.08],
        # F
        [174.61, 220.00, 261.63, 349.23],
        # C
        [130.81, 164.81, 196.00, 261.63],
    ]
    roots = [73.42, 58.27, 87.31, 65.41]

    # Global envelope
    env = np.ones(n_samples, dtype=np.float32) * 0.7
    fade_in_samples = int(sr * 6.0)
    fade_out_samples = int(sr * 8.0)
    env[:fade_in_samples] = np.linspace(0.0, 0.7, fade_in_samples)
    env[-fade_out_samples:] = np.linspace(0.7, 0.0, fade_out_samples)

    # 1. PROCESS CHORDS IN BLOCKS
    num_chords = int(np.ceil(total_duration / chord_dur))
    for c_i in range(num_chords):
        start_t = c_i * chord_dur
        end_t = min((c_i + 1) * chord_dur, total_duration)
        s_idx = int(start_t * sr)
        e_idx = int(end_t * sr)
        if s_idx >= n_samples:
            break
        chunk_len = e_idx - s_idx
        chunk_t = t[s_idx:e_idx]

        c_idx = c_i % len(chords)
        chord_freqs = chords[c_idx]
        root_f = roots[c_idx]

        # Sub bass
        bass = np.sin(2 * np.pi * root_f * chunk_t) + 0.35 * np.sin(2 * np.pi * (root_f * 2) * chunk_t)
        bass = np.tanh(bass * 1.3) * 0.28 * env[s_idx:e_idx]
        left[s_idx:e_idx] += bass
        right[s_idx:e_idx] += bass

        # Pad with detuned stereo chorus
        pad_l = np.zeros(chunk_len, dtype=np.float32)
        pad_r = np.zeros(chunk_len, dtype=np.float32)
        for f in chord_freqs:
            pad_l += np.sin(2 * np.pi * (f - 0.5) * chunk_t)
            pad_r += np.sin(2 * np.pi * (f + 0.5) * chunk_t)
        pad_l = (pad_l / len(chord_freqs)) * 0.20 * env[s_idx:e_idx]
        pad_r = (pad_r / len(chord_freqs)) * 0.20 * env[s_idx:e_idx]

        left[s_idx:e_idx] += pad_l
        right[s_idx:e_idx] += pad_r

    # 2. VECTORIZED ARPEGGIOS (16th notes)
    sixteenth_dur = beat_dur / 4.0
    total_steps = int(total_duration / sixteenth_dur)
    for step in range(total_steps):
        st_t = step * sixteenth_dur
        if st_t < 6.0 or st_t > (total_duration - 6.0):
            continue
        s_idx = int(st_t * sr)
        step_len = int(sixteenth_dur * sr)
        e_idx = min(s_idx + step_len, n_samples)
        if s_idx >= n_samples:
            break
        sub_len = e_idx - s_idx
        local_t = np.linspace(0, sixteenth_dur, sub_len, endpoint=False)

        chord_idx = int(st_t / chord_dur) % len(chords)
        chord_freqs = chords[chord_idx]
        freq = chord_freqs[step % len(chord_freqs)] * 2.0

        decay = np.exp(-local_t * 24.0)
        pluck = np.sin(2 * np.pi * freq * local_t) * decay * 0.08

        pan = 0.5 + 0.35 * np.sin(step * 0.6)
        left[s_idx:e_idx] += pluck * (1.0 - pan)
        right[s_idx:e_idx] += pluck * pan

        if step % 2 == 0:
            tick_decay = np.exp(-local_t * 70.0)
            noise = (np.random.rand(sub_len).astype(np.float32) * 2.0 - 1.0) * tick_decay * 0.02
            left[s_idx:e_idx] += noise
            right[s_idx:e_idx] += noise

    # 3. SFX GENERATION
    def add_sub_boom(sec, intensity=0.75):
        s_idx = int(sec * sr)
        dur = 3.5
        len_samp = min(int(dur * sr), n_samples - s_idx)
        if len_samp <= 0: return
        local_t = np.linspace(0, dur, len_samp, endpoint=False)
        inst_freq = 35.0 + 105.0 * np.exp(-local_t * 3.5)
        phase = 2 * np.pi * np.cumsum(inst_freq) / sr
        boom = np.sin(phase) * np.exp(-local_t * 1.3) * intensity
        boom = np.tanh(boom * 1.5)
        left[s_idx:s_idx+len_samp] += boom
        right[s_idx:s_idx+len_samp] += boom

    def add_whoosh(sec, dur=1.2, pan_dir=1):
        s_idx = int(sec * sr)
        len_samp = min(int(dur * sr), n_samples - s_idx)
        if len_samp <= 0: return
        local_t = np.linspace(0, dur, len_samp, endpoint=False)
        env = np.sin(np.pi * (local_t / dur)) ** 2
        noise = (np.random.rand(len_samp).astype(np.float32) * 2.0 - 1.0) * env * 0.18
        pan = (local_t / dur) if pan_dir > 0 else (1.0 - local_t / dur)
        left[s_idx:s_idx+len_samp] += noise * (1.0 - pan)
        right[s_idx:s_idx+len_samp] += noise * pan

    def add_ui_click(sec, pitch=2800.0, vol=0.14):
        s_idx = int(sec * sr)
        dur = 0.06
        len_samp = min(int(dur * sr), n_samples - s_idx)
        if len_samp <= 0: return
        local_t = np.linspace(0, dur, len_samp, endpoint=False)
        click = np.sin(2 * np.pi * pitch * local_t) * np.exp(-local_t * 80.0) * vol
        left[s_idx:s_idx+len_samp] += click
        right[s_idx:s_idx+len_samp] += click

    def add_chime(sec, freqs=[1200, 1800, 2400], vol=0.18):
        s_idx = int(sec * sr)
        dur = 1.8
        len_samp = min(int(dur * sr), n_samples - s_idx)
        if len_samp <= 0: return
        local_t = np.linspace(0, dur, len_samp, endpoint=False)
        chime = np.zeros(len_samp, dtype=np.float32)
        for i, f in enumerate(freqs):
            chime += np.sin(2 * np.pi * f * local_t) * np.exp(-local_t * (3.0 + i))
        chime = chime * (vol / len(freqs))
        left[s_idx:s_idx+len_samp] += chime
        right[s_idx:s_idx+len_samp] += chime

    def add_security_alert(sec, vol=0.30):
        s_idx = int(sec * sr)
        dur = 2.0
        len_samp = min(int(dur * sr), n_samples - s_idx)
        if len_samp <= 0: return
        local_t = np.linspace(0, dur, len_samp, endpoint=False)
        cluster = np.sin(2 * np.pi * 380 * local_t) + np.sin(2 * np.pi * 402 * local_t)
        sub = np.sin(2 * np.pi * 55 * local_t) * 1.5
        alert = (cluster * 0.4 + sub) * np.exp(-local_t * 1.8) * vol
        left[s_idx:s_idx+len_samp] += alert
        right[s_idx:s_idx+len_samp] += alert

    # Synchronized SFX
    add_sub_boom(0.5, intensity=0.85)
    add_whoosh(6.8, dur=1.2, pan_dir=1)

    # Chapter 1 (Student)
    add_ui_click(12.5, pitch=2600)
    add_ui_click(18.0, pitch=3100)
    add_chime(24.0, [880, 1320, 1760], vol=0.16)
    add_ui_click(32.0, pitch=2400)
    add_ui_click(42.0, pitch=2900)
    add_whoosh(52.5, dur=1.4, pan_dir=-1)

    # Chapter 2 (Admin)
    add_sub_boom(54.0, intensity=0.75)
    add_ui_click(62.0, pitch=2200)
    add_ui_click(72.0, pitch=2800)
    add_chime(82.0, [1046, 1318, 1567], vol=0.18)
    add_ui_click(92.0, pitch=2600)
    add_whoosh(102.5, dur=1.4, pan_dir=1)

    # Chapter 3 (TPO)
    add_sub_boom(104.0, intensity=0.75)
    add_ui_click(112.0, pitch=3200)
    add_ui_click(122.0, pitch=2700)
    add_chime(134.0, [1174, 1479, 1760], vol=0.18)
    add_ui_click(144.0, pitch=3000)
    add_whoosh(152.5, dur=1.4, pan_dir=-1)

    # Chapter 4 (RBAC)
    add_sub_boom(154.0, intensity=0.70)
    add_security_alert(160.0, vol=0.35)
    add_chime(174.0, [880, 1108, 1320, 1760], vol=0.20)
    add_chime(186.0, [987, 1244, 1479, 1975], vol=0.20)
    add_whoosh(192.5, dur=1.4, pan_dir=1)

    # Outro
    add_sub_boom(194.0, intensity=0.90)
    add_chime(198.0, [587, 880, 1174, 1760], vol=0.22)

    # Mastering
    peak = max(np.max(np.abs(left)), np.max(np.abs(right)))
    if peak > 0.95:
        left = (left / peak) * 0.95
        right = (right / peak) * 0.95

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    interleaved = np.empty((n_samples * 2,), dtype=np.int16)
    interleaved[0::2] = (left * 32767).astype(np.int16)
    interleaved[1::2] = (right * 32767).astype(np.int16)

    with wave.open(output_path, 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(interleaved.tobytes())

    print(f"SUCCESS: Vectorized Cinematic Audio saved ({os.path.getsize(output_path)} bytes)")

if __name__ == "__main__":
    generate_cinematic_audio()
