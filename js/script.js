const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const toggleBtn = document.getElementById('toggle-btn');
const statusBadge = document.getElementById('status-badge');
const transcriptDiv = document.getElementById('transcript');
const hiraganaTranscriptDiv = document.getElementById('hiragana-transcript');
const kanjiCandidatesDiv = document.getElementById('kanji-candidates');

// --- 1. Kuroshiro（ひらがな変換器）の変数宣言 ---
const KuroshiroClass = Kuroshiro.default || Kuroshiro;
const KuromojiAnalyzerClass = KuromojiAnalyzer.default || KuromojiAnalyzer;

const kuroshiro = new KuroshiroClass();
let isKuroshiroReady = false;
let isInitializing = false;

// ボタンが押された時に初めて辞書を読み込む（ページ初期化時のフリーズ防止）
async function initKuroshiroIfNeeded() {
  if (isKuroshiroReady || isInitializing) return;
  isInitializing = true;
  hiraganaTranscriptDiv.textContent = 'ひらがな変換エンジン（辞書）を読み込み中...';

  try {
    await kuroshiro.init(new KuromojiAnalyzerClass({
        // dictPath: 'https://cdn.jsdelivr.net/gh/takuyaa/kuromoji.js@master/dict'
        dictPath: 'https://cdn.jsdelivr.net/gh/takuyaa/kuromoji.js@master/dict/'
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

      // ひらがな文字列(hiraganaText)と完全一致するものだけを除去
      const filteredCandidates = allCandidates.filter(candidate => {
        return candidate.trim() !== hiraganaText.trim();
      });

      const candidates = filteredCandidates.slice(0, 5);

      kanjiCandidatesDiv.innerHTML = '';

      if (candidates.length > 0) {
        candidates.forEach(kanji => {
          const btn = document.createElement('button');
          btn.className = 'candidate-btn';
          btn.textContent = kanji;
          
          btn.addEventListener('click', () => {
            navigator.clipboard.writeText(kanji);
            alert(`「${kanji}」をクリップボードにコピーしました！`);
          });

          kanjiCandidatesDiv.appendChild(btn);
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
  alert('お使いのブラウザは Web Speech API に対応していません。Google Chrome等をご利用ください。');
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

  async function toggleListening() {
    if (isListening) {
      isListening = false;
      recognition.stop();
      toggleBtn.textContent = '音声認識を開始';
      toggleBtn.classList.remove('active');
      statusBadge.textContent = '停止中';
      statusBadge.className = 'badge stopped';
    } else {
      isListening = true;
      // ボタンが押されたらバックグラウンドで辞書読み込みを開始
      initKuroshiroIfNeeded();
      
      recognition.start();
      toggleBtn.textContent = '音声認識を停止';
      toggleBtn.classList.add('active');
      statusBadge.textContent = 'マイク受付中';
      statusBadge.className = 'badge listening';
    }
  }

  toggleBtn.addEventListener('click', toggleListening);
}