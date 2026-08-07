// ─── Motor de efeitos sonoros ────────────────────────────────────────────────
// Gera os sons direto no navegador (Web Audio API) — não depende de nenhum
// arquivo de áudio externo, então não pesa no carregamento do app.
// Preferência de "som ligado/desligado" fica salva no navegador (localStorage),
// do mesmo jeito que o Ponto de Controle já faz hoje.

const SOUND_PREF_KEY = "veloce_sound_enabled";

export function isSoundEnabled(): boolean {
    if (typeof window === "undefined") return false;
    const saved = window.localStorage.getItem(SOUND_PREF_KEY);
    return saved === null ? true : saved === "true";
}

export function setSoundEnabled(enabled: boolean) {
    window.localStorage.setItem(SOUND_PREF_KEY, String(enabled));
}

let ctx: AudioContext | null = null;
function getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        ctx = new AudioCtx();
    }
    return ctx;
}

// Toca uma sequência de notas simples (frequência em Hz, duração em segundos)
function tocarNotas(notas: { freq: number; inicio: number; duracao: number; volume?: number }[]) {
    if (!isSoundEnabled()) return;
    const audioCtx = getContext();
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume();

    const agora = audioCtx.currentTime;
    for (const n of notas) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = n.freq;
        const vol = n.volume ?? 0.12;
        const t0 = agora + n.inicio;
        const t1 = t0 + n.duracao;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(vol, t0 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t0);
        osc.stop(t1 + 0.02);
    }
}

/** Entrada no sistema — acorde ascendente curto, dá boas-vindas sem ser chamativo */
export function playLogin() {
    tocarNotas([
        { freq: 523.25, inicio: 0, duracao: 0.12 }, // Dó
        { freq: 659.25, inicio: 0.09, duracao: 0.12 }, // Mi
        { freq: 783.99, inicio: 0.18, duracao: 0.22 }, // Sol
    ]);
}

/** Venda fechada / conquista — soa como "sucesso", mais festivo */
export function playSuccess() {
    tocarNotas([
        { freq: 659.25, inicio: 0, duracao: 0.1 },
        { freq: 783.99, inicio: 0.08, duracao: 0.1 },
        { freq: 1046.5, inicio: 0.16, duracao: 0.28, volume: 0.14 },
    ]);
}

/** Ação pontual concluída (ex: item de checklist marcado) — som curto e discreto */
export function playPop() {
    tocarNotas([{ freq: 880, inicio: 0, duracao: 0.06, volume: 0.08 }]);
}

/** Alerta/atenção — usar com moderação, para coisas que precisam de atenção do usuário */
export function playAlert() {
    tocarNotas([
        { freq: 440, inicio: 0, duracao: 0.09, volume: 0.1 },
        { freq: 349.23, inicio: 0.11, duracao: 0.14, volume: 0.1 },
    ]);
}
