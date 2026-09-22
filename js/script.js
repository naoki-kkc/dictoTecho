const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const toggleBtn = document.getElementById('toggle-btn');
const statusBadge = document.getElementById('status-badge');
const transcriptDiv = document.getElementById('transcript');
const hiraganaTranscriptDiv = document.getElementById('hiragana-transcript'); // 追加
const kanjiCandidatesDiv = document.getElementById('kanji-candidates');

// --- 1. Kuroshiro（ひらがな変換器）の初期化 ---
const KuroshiroClass = Kuroshiro.default || Kuroshiro;
const KuromojiAnalyzerClass = KuromojiAnalyzer.default || KuromojiAnalyzer;

const kuroshiro = new KuroshiroClass();
let isKuroshiroReady = false;

kuroshiro.init(new KuromojiAnalyzerClass({
  dictPath: 'https://cdn.jsdelivr.net/gh/takuyaa/kuromoji.js@master/dict/'
})).then(() => {
  isKuroshiroReady = true;
  console.log('Kuroshiro (ひらがな変換機能) の準備が完了しました');
}).catch(err => {
  console.error('Kuroshiro 初期化エラー:', err);
});

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
      // 1. リアルタイム音声認識結果（元のテキスト）を表示
      transcriptDiv.textContent = rawText;

      if (!isKuroshiroReady) {
        hiraganaTranscriptDiv.textContent = 'ひらがな変換エンジン準備中...';
        return;
      }

      try {
        // 2. 音声テキストをひらがなに変換して「ひらがな変換結果」枠に表示
        const hiraganaText = await kuroshiro.convert(rawText, { to: 'hiragana' });
        hiraganaTranscriptDiv.textContent = hiraganaText;

        // 3. ひらがなを元に漢字候補を取得
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
      toggleBtn.textContent = '音声認識を開始';
      toggleBtn.classList.remove('active');
      statusBadge.textContent = '停止中';
      statusBadge.className = 'badge stopped';
    } else {
      isListening = true;
      recognition.start();
      toggleBtn.textContent = '音声認識を停止';
      toggleBtn.classList.add('active');
      statusBadge.textContent = 'マイク受付中';
      statusBadge.className = 'badge listening';
    }
  }

  toggleBtn.addEventListener('click', toggleListening);
}