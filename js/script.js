const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const toggleBtn = document.getElementById('toggle-btn');
const statusBadge = document.getElementById('status-badge');
const transcriptDiv = document.getElementById('transcript');
const hiraganaTranscriptDiv = document.getElementById('hiragana-transcript');
const kanjiCandidatesDiv = document.getElementById('kanji-candidates');

// --- 【追加】波形描画用要素と Web Audio API 変数 ---
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas ? canvas.getContext('2d') : null;

let audioCtx = null;
let analyser = null;
let microphone = null;
let animationId = null;
let audioStream = null;

// --- 1. Kuroshiro（ひらがな変換器）の初期化 ---
const KuroshiroClass = Kuroshiro.default || Kuroshiro;
const KuromojiAnalyzerClass = KuromojiAnalyzer.default || KuromojiAnalyzer;

const kuroshiro = new KuroshiroClass();
let isKuroshiroReady = false;
let isInitializing = false;

async function initKuroshiroIfNeeded() {
  if (isKuroshiroReady || isInitializing) return;
  isInitializing = true;
  hiraganaTranscriptDiv.textContent = 'ひらがな変換エンジン（辞書）を読み込み中...';

  try {
    await kuroshiro.init(new KuromojiAnalyzerClass({
      dictPath: 'dict/'
    }));
    isKuroshiroReady = true;
    console.log('Kuroshiro 準備完了');
    hiraganaTranscriptDiv.textContent = '準備完了。音声入力を待っています...';
  } catch (err) {
    console.error('Kuroshiro 初期化エラー:', err);
    hiraganaTranscriptDiv.textContent = '辞書の読み込みに失敗しました。';
  } finally {
    isInitializing = false;
  }
}

// --- 【追加】音声波形の描画ロジック ---
function drawWaveform() {
  if (!analyser || !canvasCtx) return;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const draw = () => {
    animationId = requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = '#1e1e24';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = '#4cc9f0'; // 波形カラー（明るいシアン）
    canvasCtx.beginPath();

    const sliceWidth = canvas.width * 1.0 / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * canvas.height / 2;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  };

  draw();
}

// 音声入力のビジュアライザー開始
async function startVisualizer() {
  if (!canvasCtx) return;
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;

    microphone = audioCtx.createMediaStreamSource(audioStream);
    microphone.connect(analyser);

    drawWaveform();
  } catch (err) {
    console.error('マイク波形取得エラー:', err);
  }
}

// 音声入力のビジュアライザー停止
function stopVisualizer() {
  if (animationId) cancelAnimationFrame(animationId);
  if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
  }
  
  // キャンバス初期化（直線を描画）
  if (canvasCtx && canvas) {
    canvasCtx.fillStyle = '#1e1e24';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = '#4cc9f0';
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, canvas.height / 2);
    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }
}

// --- 2. 漢字変換候補取得関数 (Google CGI API) ---
async function fetchKanjiCandidates(hiraganaText) {
  if (!hiraganaText || hiraganaText.trim() === '') {
    kanjiCandidatesDiv.innerHTML = '<span class="candidate-placeholder">音声入力待ち...</span>';
    return;
  }

  try {
    const url = `https://www.google.com/transliterate?langpair=ja-Hira|ja&text=${encodeURIComponent(hiraganaText)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.length > 0 && data[0][1]) {
      const allCandidates = data[0][1];

      // カタカナ（全角・半角）が含まれているか判定する正規表現
      const katakanaRegex = /[\u30A0-\u30FF\uFF65-\uFF9F]/;

      const filteredCandidates = allCandidates.filter(candidate => {
        const isSameAsInput = candidate.trim() === hiraganaText.trim();
        const hasKatakana = katakanaRegex.test(candidate);

        return !isSameAsInput && !hasKatakana;
      });

      const candidates = filteredCandidates.slice(0, 5);

      kanjiCandidatesDiv.innerHTML = '';

      if (candidates.length > 0) {
        candidates.forEach(kanji => {
          // リスト形式の要素を生成（クリップボードコピー機能は削除）
          const item = document.createElement('div');
          item.className = 'candidate-item';
          item.textContent = kanji;

          kanjiCandidatesDiv.appendChild(item);
        });
      } else {
        kanjiCandidatesDiv.innerHTML = '<span class="candidate-placeholder">漢字変換候補が見つかりませんでした</span>';
      }

    } else {
      kanjiCandidatesDiv.innerHTML = '<span class="candidate-placeholder">変換候補が見つかりませんでした</span>';
    }
  } catch (err) {
    console.error('漢字変換APIエラー:', err);
    kanjiCandidatesDiv.innerHTML = '<span class="candidate-placeholder">変換取得エラー</span>';
  }
}

// --- 3. Web Speech API の設定 ---
if (!SpeechRecognition) {
  alert('お使いのブラウザは Web Speech API に対応していません。');
} else {
  const recognition = new SpeechRecognition();
  recognition.lang = 'ja-JP';
  recognition.interimResults = true;
  recognition.continuous = true;

  let isListening = false;

  recognition.onresult = async (event) => {
    let rawText = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      rawText += event.results[i][0].transcript;
    }

    if (rawText.trim() !== '') {
      transcriptDiv.textContent = rawText;

      if (!isKuroshiroReady) {
        return;
      }

      try {
        const hiraganaText = await kuroshiro.convert(rawText, { to: 'hiragana' });
        hiraganaTranscriptDiv.textContent = hiraganaText;
        fetchKanjiCandidates(hiraganaText);
      } catch (err) {
        console.error('変換エラー:', err);
      }
    }
  };

  recognition.onend = () => {
    if (isListening) recognition.start();
  };

  function toggleListening() {
    if (isListening) {
      isListening = false;
      recognition.stop();
      stopVisualizer(); // 【追加】波形描画の停止
      toggleBtn.textContent = '音声認識を開始';
      toggleBtn.classList.remove('active');
      statusBadge.textContent = '停止中';
      statusBadge.className = 'badge stopped';
    } else {
      isListening = true;
      try {
        recognition.start();
        startVisualizer(); // 【追加】波形描画の開始
        toggleBtn.textContent = '音声認識を停止';
        toggleBtn.classList.add('active');
        statusBadge.textContent = 'マイク受付中';
        statusBadge.className = 'badge listening';
      } catch (err) {
        console.error('音声認識スタートエラー:', err);
      }

      initKuroshiroIfNeeded();
    }
  }

  toggleBtn.addEventListener('click', toggleListening);
}