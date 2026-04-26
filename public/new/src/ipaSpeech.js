// ipaSpeech.js - experimental browser-side English -> IPA -> mouth adapter.
//
// The first version is intentionally local and deterministic. It uses a small
// built-in General American dictionary for common studio phrases, falls back
// to transparent grapheme rules for unknown words, and maps IPA phonemes to
// VRM mouth expressions plus jaw bone deltas. A larger CMU/eSpeak/WebAssembly
// G2P backend can replace createPlan later without changing the cfg surface.

(function () {
  const MODEL_ID = 'ipa-speech-browser-adapter-v0';

  const LEXICON = {
    accurate: {
      ipa: 'ˈækjɚət',
      phonemes: ['æ', 'k', 'j', 'ɚ', 'ə', 't'],
      stress: [0],
    },
    airflow: {
      ipa: 'ˈɛɹˌfloʊ',
      phonemes: ['ɛ', 'ɹ', 'f', 'l', 'oʊ'],
      stress: [0],
    },
    alphabet: {
      ipa: 'ˈælfəˌbɛt',
      phonemes: ['æ', 'l', 'f', 'ə', 'b', 'ɛ', 't'],
      stress: [0],
    },
    animate: {
      ipa: 'ˈænəˌmeɪt',
      phonemes: ['æ', 'n', 'ə', 'm', 'eɪ', 't'],
      stress: [0],
    },
    animation: {
      ipa: 'ˌænəˈmeɪʃən',
      phonemes: ['æ', 'n', 'ə', 'm', 'eɪ', 'ʃ', 'ə', 'n'],
      stress: [4],
    },
    anime: {
      ipa: 'ˈænəˌmeɪ',
      phonemes: ['æ', 'n', 'ə', 'm', 'eɪ'],
      stress: [0],
    },
    avatar: {
      ipa: 'ˈævəˌtɑɹ',
      phonemes: ['æ', 'v', 'ə', 't', 'ɑ', 'ɹ'],
      stress: [0],
    },
    browser: {
      ipa: 'ˈbɹaʊzɚ',
      phonemes: ['b', 'ɹ', 'aʊ', 'z', 'ɚ'],
      stress: [2],
    },
    case: { ipa: 'ˈkeɪs', phonemes: ['k', 'eɪ', 's'], stress: [1] },
    convert: {
      ipa: 'kənˈvɝt',
      phonemes: ['k', 'ə', 'n', 'v', 'ɝ', 't'],
      stress: [4],
    },
    dictionary: {
      ipa: 'ˈdɪkʃəˌnɛɹi',
      phonemes: ['d', 'ɪ', 'k', 'ʃ', 'ə', 'n', 'ɛ', 'ɹ', 'i'],
      stress: [0],
    },
    english: {
      ipa: 'ˈɪŋɡlɪʃ',
      phonemes: ['ɪ', 'ŋ', 'ɡ', 'l', 'ɪ', 'ʃ'],
      stress: [0],
    },
    experimental: {
      ipa: 'ɪkˌspɛɹəˈmɛntəl',
      phonemes: [
        'ɪ',
        'k',
        's',
        'p',
        'ɛ',
        'ɹ',
        'ə',
        'm',
        'ɛ',
        'n',
        't',
        'ə',
        'l',
      ],
      stress: [8],
    },
    hello: { ipa: 'həˈloʊ', phonemes: ['h', 'ə', 'l', 'oʊ'], stress: [3] },
    international: {
      ipa: 'ˌɪntɚˈnæʃənəl',
      phonemes: ['ɪ', 'n', 't', 'ɚ', 'n', 'æ', 'ʃ', 'ə', 'n', 'ə', 'l'],
      stress: [5],
    },
    ipa: { ipa: 'ˌaɪpiːˈeɪ', phonemes: ['aɪ', 'p', 'iː', 'eɪ'], stress: [3] },
    issue: { ipa: 'ˈɪʃuː', phonemes: ['ɪ', 'ʃ', 'uː'], stress: [0] },
    motion: {
      ipa: 'ˈmoʊʃən',
      phonemes: ['m', 'oʊ', 'ʃ', 'ə', 'n'],
      stress: [1],
    },
    mouth: { ipa: 'ˈmaʊθ', phonemes: ['m', 'aʊ', 'θ'], stress: [1] },
    move: { ipa: 'ˈmuːv', phonemes: ['m', 'uː', 'v'], stress: [1] },
    moves: { ipa: 'ˈmuːvz', phonemes: ['m', 'uː', 'v', 'z'], stress: [1] },
    my: { ipa: 'ˈmaɪ', phonemes: ['m', 'aɪ'], stress: [1] },
    phoneme: {
      ipa: 'ˈfoʊniːm',
      phonemes: ['f', 'oʊ', 'n', 'iː', 'm'],
      stress: [1],
    },
    phonemes: {
      ipa: 'ˈfoʊniːmz',
      phonemes: ['f', 'oʊ', 'n', 'iː', 'm', 'z'],
      stress: [1],
    },
    phonetic: {
      ipa: 'fəˈnɛtɪk',
      phonemes: ['f', 'ə', 'n', 'ɛ', 't', 'ɪ', 'k'],
      stress: [3],
    },
    physics: {
      ipa: 'ˈfɪzɪks',
      phonemes: ['f', 'ɪ', 'z', 'ɪ', 'k', 's'],
      stress: [0],
    },
    possible: {
      ipa: 'ˈpɑsəbəl',
      phonemes: ['p', 'ɑ', 's', 'ə', 'b', 'ə', 'l'],
      stress: [1],
    },
    real: { ipa: 'ˈɹiːəl', phonemes: ['ɹ', 'iː', 'ə', 'l'], stress: [1] },
    shape: { ipa: 'ˈʃeɪp', phonemes: ['ʃ', 'eɪ', 'p'], stress: [1] },
    shapes: { ipa: 'ˈʃeɪps', phonemes: ['ʃ', 'eɪ', 'p', 's'], stress: [1] },
    speech: { ipa: 'ˈspiːtʃ', phonemes: ['s', 'p', 'iː', 'tʃ'], stress: [2] },
    studio: {
      ipa: 'ˈstuːdiˌoʊ',
      phonemes: ['s', 't', 'uː', 'd', 'i', 'oʊ'],
      stress: [2],
    },
    talking: {
      ipa: 'ˈtɔkɪŋ',
      phonemes: ['t', 'ɔ', 'k', 'ɪ', 'ŋ'],
      stress: [1],
    },
    text: { ipa: 'ˈtɛkst', phonemes: ['t', 'ɛ', 'k', 's', 't'], stress: [1] },
    tongue: { ipa: 'ˈtʌŋ', phonemes: ['t', 'ʌ', 'ŋ'], stress: [1] },
    true: { ipa: 'ˈtɹuː', phonemes: ['t', 'ɹ', 'uː'], stress: [2] },
    viseme: {
      ipa: 'ˈvɪziːm',
      phonemes: ['v', 'ɪ', 'z', 'iː', 'm'],
      stress: [0],
    },
    visemes: {
      ipa: 'ˈvɪziːmz',
      phonemes: ['v', 'ɪ', 'z', 'iː', 'm', 'z'],
      stress: [0],
    },
    world: { ipa: 'ˈwɝld', phonemes: ['w', 'ɝ', 'l', 'd'], stress: [1] },
  };

  const REQUIRED = {
    model: MODEL_ID,
    memoryMb: 32,
    cpuCores: 1,
    wasm: false,
    webgl: false,
    webgpu: false,
    dictionaryEntries: Object.keys(LEXICON).length,
  };

  const RULES = [
    ['tion', ['ʃ', 'ə', 'n']],
    ['sion', ['ʒ', 'ə', 'n']],
    ['ture', ['tʃ', 'ɚ']],
    ['sure', ['ʒ', 'ɚ']],
    ['augh', ['ɔ']],
    ['ough', ['oʊ']],
    ['igh', ['aɪ']],
    ['eigh', ['eɪ']],
    ['qu', ['k', 'w']],
    ['ch', ['tʃ']],
    ['sh', ['ʃ']],
    ['ph', ['f']],
    ['th', ['θ']],
    ['ng', ['ŋ']],
    ['ck', ['k']],
    ['ee', ['iː']],
    ['ea', ['iː']],
    ['oo', ['uː']],
    ['ou', ['aʊ']],
    ['ow', ['aʊ']],
    ['oi', ['ɔɪ']],
    ['oy', ['ɔɪ']],
    ['ai', ['eɪ']],
    ['ay', ['eɪ']],
    ['oa', ['oʊ']],
    ['oe', ['oʊ']],
    ['er', ['ɝ']],
    ['ir', ['ɝ']],
    ['ur', ['ɝ']],
    ['ar', ['ɑ', 'ɹ']],
    ['or', ['ɔ', 'ɹ']],
    ['le', ['ə', 'l']],
  ];

  const LETTERS = {
    a: ['æ'],
    b: ['b'],
    c: ['k'],
    d: ['d'],
    e: ['ɛ'],
    f: ['f'],
    g: ['ɡ'],
    h: ['h'],
    i: ['ɪ'],
    j: ['dʒ'],
    k: ['k'],
    l: ['l'],
    m: ['m'],
    n: ['n'],
    o: ['ɑ'],
    p: ['p'],
    q: ['k'],
    r: ['ɹ'],
    s: ['s'],
    t: ['t'],
    u: ['ʌ'],
    v: ['v'],
    w: ['w'],
    x: ['k', 's'],
    y: ['i'],
    z: ['z'],
  };

  const PROFILES = {
    sil: {
      viseme: 'silence',
      kind: 'silence',
      jaw: 0.02,
      duration: 0.055,
      place: 'rest',
      manner: 'pause',
      lips: 'neutral',
      exprs: {},
    },
    p: {
      viseme: 'bilabial',
      kind: 'consonant',
      jaw: 0.02,
      duration: 0.075,
      place: 'bilabial',
      manner: 'stop',
      lips: 'closed',
    },
    b: {
      viseme: 'bilabial',
      kind: 'consonant',
      jaw: 0.03,
      duration: 0.075,
      place: 'bilabial',
      manner: 'stop',
      lips: 'closed',
    },
    m: {
      viseme: 'bilabial',
      kind: 'consonant',
      jaw: 0.02,
      duration: 0.09,
      place: 'bilabial',
      manner: 'nasal',
      lips: 'closed',
    },
    f: {
      viseme: 'labiodental',
      kind: 'consonant',
      jaw: 0.1,
      duration: 0.09,
      place: 'labiodental',
      manner: 'fricative',
      lips: 'lower-lip-to-teeth',
    },
    v: {
      viseme: 'labiodental',
      kind: 'consonant',
      jaw: 0.11,
      duration: 0.09,
      place: 'labiodental',
      manner: 'fricative',
      lips: 'lower-lip-to-teeth',
    },
    θ: {
      viseme: 'dental',
      kind: 'consonant',
      jaw: 0.14,
      duration: 0.095,
      place: 'dental',
      manner: 'fricative',
      tongue: 'between-teeth',
    },
    ð: {
      viseme: 'dental',
      kind: 'consonant',
      jaw: 0.14,
      duration: 0.095,
      place: 'dental',
      manner: 'fricative',
      tongue: 'between-teeth',
    },
    t: {
      viseme: 'alveolar',
      kind: 'consonant',
      jaw: 0.12,
      duration: 0.07,
      place: 'alveolar',
      manner: 'stop',
      tongue: 'tip-to-ridge',
    },
    d: {
      viseme: 'alveolar',
      kind: 'consonant',
      jaw: 0.12,
      duration: 0.07,
      place: 'alveolar',
      manner: 'stop',
      tongue: 'tip-to-ridge',
    },
    n: {
      viseme: 'alveolar',
      kind: 'consonant',
      jaw: 0.1,
      duration: 0.08,
      place: 'alveolar',
      manner: 'nasal',
      tongue: 'tip-to-ridge',
    },
    l: {
      viseme: 'alveolar',
      kind: 'consonant',
      jaw: 0.13,
      duration: 0.08,
      place: 'alveolar',
      manner: 'lateral',
      tongue: 'tip-to-ridge',
    },
    s: {
      viseme: 'sibilant',
      kind: 'consonant',
      jaw: 0.08,
      duration: 0.085,
      place: 'alveolar',
      manner: 'fricative',
      tongue: 'grooved',
    },
    z: {
      viseme: 'sibilant',
      kind: 'consonant',
      jaw: 0.08,
      duration: 0.085,
      place: 'alveolar',
      manner: 'fricative',
      tongue: 'grooved',
    },
    ʃ: {
      viseme: 'postalveolar',
      kind: 'consonant',
      jaw: 0.13,
      duration: 0.1,
      place: 'postalveolar',
      manner: 'fricative',
      tongue: 'retracted',
      exprs: { oh: 0.18 },
    },
    ʒ: {
      viseme: 'postalveolar',
      kind: 'consonant',
      jaw: 0.13,
      duration: 0.1,
      place: 'postalveolar',
      manner: 'fricative',
      tongue: 'retracted',
      exprs: { oh: 0.18 },
    },
    tʃ: {
      viseme: 'postalveolar',
      kind: 'consonant',
      jaw: 0.16,
      duration: 0.1,
      place: 'postalveolar',
      manner: 'affricate',
      tongue: 'retracted',
      exprs: { oh: 0.16 },
    },
    dʒ: {
      viseme: 'postalveolar',
      kind: 'consonant',
      jaw: 0.16,
      duration: 0.1,
      place: 'postalveolar',
      manner: 'affricate',
      tongue: 'retracted',
      exprs: { oh: 0.16 },
    },
    k: {
      viseme: 'velar',
      kind: 'consonant',
      jaw: 0.18,
      duration: 0.075,
      place: 'velar',
      manner: 'stop',
      tongue: 'dorsum-to-soft-palate',
    },
    ɡ: {
      viseme: 'velar',
      kind: 'consonant',
      jaw: 0.18,
      duration: 0.075,
      place: 'velar',
      manner: 'stop',
      tongue: 'dorsum-to-soft-palate',
    },
    ŋ: {
      viseme: 'velar',
      kind: 'consonant',
      jaw: 0.16,
      duration: 0.09,
      place: 'velar',
      manner: 'nasal',
      tongue: 'dorsum-to-soft-palate',
    },
    h: {
      viseme: 'open',
      kind: 'consonant',
      jaw: 0.24,
      duration: 0.075,
      place: 'glottal',
      manner: 'fricative',
    },
    ɹ: {
      viseme: 'rhotic',
      kind: 'consonant',
      jaw: 0.17,
      duration: 0.095,
      place: 'postalveolar',
      manner: 'approximant',
      tongue: 'bunched',
      exprs: { oh: 0.15 },
    },
    j: {
      viseme: 'palatal',
      kind: 'consonant',
      jaw: 0.1,
      duration: 0.075,
      place: 'palatal',
      manner: 'approximant',
      exprs: { ih: 0.35 },
    },
    w: {
      viseme: 'rounded',
      kind: 'consonant',
      jaw: 0.08,
      duration: 0.08,
      place: 'labiovelar',
      manner: 'approximant',
      lips: 'rounded',
      exprs: { ou: 0.45 },
    },
    æ: {
      viseme: 'open-front-vowel',
      kind: 'vowel',
      jaw: 0.78,
      duration: 0.16,
      height: 'near-open',
      backness: 'front',
      rounded: false,
      exprs: { aa: 0.88 },
    },
    ɑ: {
      viseme: 'open-back-vowel',
      kind: 'vowel',
      jaw: 0.86,
      duration: 0.17,
      height: 'open',
      backness: 'back',
      rounded: false,
      exprs: { aa: 0.9, oh: 0.12 },
    },
    ʌ: {
      viseme: 'open-mid-vowel',
      kind: 'vowel',
      jaw: 0.58,
      duration: 0.13,
      height: 'open-mid',
      backness: 'central',
      rounded: false,
      exprs: { aa: 0.62 },
    },
    ə: {
      viseme: 'schwa',
      kind: 'vowel',
      jaw: 0.34,
      duration: 0.095,
      height: 'mid',
      backness: 'central',
      rounded: false,
      exprs: { aa: 0.26 },
    },
    ɚ: {
      viseme: 'rhotic-vowel',
      kind: 'vowel',
      jaw: 0.36,
      duration: 0.12,
      height: 'mid',
      backness: 'central',
      rounded: false,
      exprs: { aa: 0.22, oh: 0.18 },
    },
    ɝ: {
      viseme: 'rhotic-vowel',
      kind: 'vowel',
      jaw: 0.4,
      duration: 0.14,
      height: 'mid',
      backness: 'central',
      rounded: false,
      exprs: { aa: 0.24, oh: 0.22 },
    },
    ɛ: {
      viseme: 'open-mid-front-vowel',
      kind: 'vowel',
      jaw: 0.52,
      duration: 0.13,
      height: 'open-mid',
      backness: 'front',
      rounded: false,
      exprs: { ee: 0.72, aa: 0.18 },
    },
    eɪ: {
      viseme: 'front-diphthong',
      kind: 'vowel',
      jaw: 0.45,
      duration: 0.16,
      height: 'close-mid',
      backness: 'front',
      rounded: false,
      exprs: { ee: 0.72, ih: 0.28 },
    },
    ɪ: {
      viseme: 'near-close-front-vowel',
      kind: 'vowel',
      jaw: 0.32,
      duration: 0.115,
      height: 'near-close',
      backness: 'front',
      rounded: false,
      exprs: { ih: 0.72 },
    },
    i: {
      viseme: 'close-front-vowel',
      kind: 'vowel',
      jaw: 0.25,
      duration: 0.12,
      height: 'close',
      backness: 'front',
      rounded: false,
      exprs: { ih: 0.86 },
    },
    iː: {
      viseme: 'close-front-vowel',
      kind: 'vowel',
      jaw: 0.25,
      duration: 0.16,
      height: 'close',
      backness: 'front',
      rounded: false,
      exprs: { ih: 0.9 },
    },
    aɪ: {
      viseme: 'open-to-front-diphthong',
      kind: 'vowel',
      jaw: 0.78,
      duration: 0.18,
      height: 'open-to-close',
      backness: 'fronting',
      rounded: false,
      exprs: { aa: 0.78, ih: 0.34 },
    },
    aʊ: {
      viseme: 'open-to-rounded-diphthong',
      kind: 'vowel',
      jaw: 0.78,
      duration: 0.18,
      height: 'open-to-close',
      backness: 'backing',
      rounded: true,
      exprs: { aa: 0.68, ou: 0.42 },
    },
    ɔ: {
      viseme: 'open-mid-back-rounded-vowel',
      kind: 'vowel',
      jaw: 0.62,
      duration: 0.14,
      height: 'open-mid',
      backness: 'back',
      rounded: true,
      exprs: { oh: 0.78, aa: 0.15 },
    },
    ɔɪ: {
      viseme: 'rounded-to-front-diphthong',
      kind: 'vowel',
      jaw: 0.58,
      duration: 0.17,
      height: 'open-mid-to-close',
      backness: 'fronting',
      rounded: true,
      exprs: { oh: 0.58, ih: 0.35 },
    },
    oʊ: {
      viseme: 'close-mid-back-rounded-vowel',
      kind: 'vowel',
      jaw: 0.4,
      duration: 0.16,
      height: 'close-mid',
      backness: 'back',
      rounded: true,
      exprs: { oh: 0.76, ou: 0.2 },
    },
    ʊ: {
      viseme: 'near-close-back-rounded-vowel',
      kind: 'vowel',
      jaw: 0.31,
      duration: 0.115,
      height: 'near-close',
      backness: 'back',
      rounded: true,
      exprs: { ou: 0.68 },
    },
    u: {
      viseme: 'close-back-rounded-vowel',
      kind: 'vowel',
      jaw: 0.25,
      duration: 0.12,
      height: 'close',
      backness: 'back',
      rounded: true,
      exprs: { ou: 0.84 },
    },
    uː: {
      viseme: 'close-back-rounded-vowel',
      kind: 'vowel',
      jaw: 0.24,
      duration: 0.16,
      height: 'close',
      backness: 'back',
      rounded: true,
      exprs: { ou: 0.9 },
    },
  };

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function normalizeWord(word) {
    return String(word || '')
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/[^a-z]/g, '');
  }

  function splitWords(text) {
    return (
      String(text || '')
        .toLowerCase()
        .match(/[a-z]+(?:[’'][a-z]+)?/g) || []
    );
  }

  function fallbackWordToPhonemes(word) {
    const out = [];
    let i = 0;
    while (i < word.length) {
      let matched = false;
      for (const [letters, phonemes] of RULES) {
        if (word.startsWith(letters, i)) {
          out.push(...phonemes);
          i += letters.length;
          matched = true;
          break;
        }
      }
      if (matched) continue;
      const letter = word[i];
      out.push(...(LETTERS[letter] || []));
      i += 1;
    }

    if (out.length > 2 && out[out.length - 1] === 'ɛ')
      out[out.length - 1] = 'i';
    return out.length ? out : ['ə'];
  }

  function lookupWord(rawWord) {
    const word = normalizeWord(rawWord);
    if (!word) return null;
    if (LEXICON[word])
      return { word, source: 'dictionary', ...clone(LEXICON[word]) };

    if (word.endsWith('s')) {
      const base = word.slice(0, -1);
      if (LEXICON[base]) {
        const rec = clone(LEXICON[base]);
        return {
          word,
          source: 'dictionary',
          ipa: rec.ipa + 'z',
          phonemes: [...rec.phonemes, 'z'],
          stress: rec.stress || [],
        };
      }
    }

    if (word.endsWith('ing')) {
      const base = word.slice(0, -3);
      if (LEXICON[base]) {
        const rec = clone(LEXICON[base]);
        return {
          word,
          source: 'dictionary',
          ipa: rec.ipa + 'ɪŋ',
          phonemes: [...rec.phonemes, 'ɪ', 'ŋ'],
          stress: rec.stress || [],
        };
      }
    }

    const phonemes = fallbackWordToPhonemes(word);
    return {
      word,
      source: 'rules',
      ipa: phonemes.join(''),
      phonemes,
      stress:
        phonemes.findIndex((p) => PROFILES[p]?.kind === 'vowel') >= 0
          ? [phonemes.findIndex((p) => PROFILES[p]?.kind === 'vowel')]
          : [],
    };
  }

  function primaryExpression(exprs) {
    const entries = Object.entries(exprs || {}).sort((a, b) => b[1] - a[1]);
    return entries[0]?.[0] || '';
  }

  function profileFor(symbol) {
    return (
      PROFILES[symbol] || {
        viseme: 'neutral',
        kind: 'unknown',
        jaw: 0.12,
        duration: 0.08,
        place: 'unknown',
        manner: 'unknown',
        exprs: {},
      }
    );
  }

  function wordIpa(rec) {
    const stress = new Set(rec.stress || []);
    return rec.phonemes
      .map((p, i) => `${stress.has(i) ? 'ˈ' : ''}${p}`)
      .join('');
  }

  function detectResources(env) {
    const scope = env || window;
    const nav = scope.navigator || {};
    const perfMemory = scope.performance?.memory;
    const heapMb = perfMemory?.jsHeapSizeLimit
      ? Math.round(perfMemory.jsHeapSizeLimit / 1024 / 1024)
      : null;
    const deviceMb = nav.deviceMemory
      ? Math.round(nav.deviceMemory * 1024)
      : null;
    return {
      memoryMb: heapMb || deviceMb || null,
      cpuCores: nav.hardwareConcurrency || null,
      dictionaryEntries: Object.keys(LEXICON).length,
      localOnly: true,
      userAgent: nav.userAgent || '',
    };
  }

  function evaluateResources(available, required = REQUIRED) {
    const problems = [];
    if (available.cpuCores != null && available.cpuCores < required.cpuCores) {
      problems.push(`CPU cores ${available.cpuCores} < ${required.cpuCores}`);
    }
    if (available.memoryMb != null && available.memoryMb < required.memoryMb) {
      problems.push(
        `memory ${available.memoryMb} MiB < ${required.memoryMb} MiB`
      );
    }
    return {
      ok: problems.length === 0,
      problems,
      required,
      available,
    };
  }

  function createPlan(text, options = {}) {
    const required = options.required || REQUIRED;
    const available = options.available || detectResources(options.env);
    const resources = evaluateResources(available, required);
    if (!resources.ok) {
      return {
        ok: false,
        status: 'insufficient-resources',
        text: String(text || ''),
        resources,
        reason: resources.problems.join('; '),
      };
    }

    const rawWords = splitWords(text);
    if (!rawWords.length) {
      return {
        ok: false,
        status: 'empty-text',
        text: String(text || ''),
        resources,
        reason: 'Enter English text to generate an IPA mouth plan.',
      };
    }

    const words = rawWords.map(lookupWord).filter(Boolean);
    const phonemes = [];
    const visemes = [];
    let cursor = 0;

    const addTimelinePhoneme = (
      word,
      wordIndex,
      phonemeIndex,
      symbol,
      stress
    ) => {
      const profile = profileFor(symbol);
      const stressed = stress.has(phonemeIndex);
      const duration =
        profile.duration * (stressed && profile.kind === 'vowel' ? 1.22 : 1);
      const phoneme = {
        ipa: symbol,
        word: word.word,
        wordIndex,
        phonemeIndex,
        stress: stressed ? 'primary' : '',
        start: cursor,
        end: cursor + duration,
        duration,
        viseme: profile.viseme,
        kind: profile.kind,
        jaw: profile.jaw,
        lips: profile.lips || '',
        tongue: profile.tongue || '',
        place: profile.place || '',
        manner: profile.manner || '',
        height: profile.height || '',
        backness: profile.backness || '',
        rounded: !!profile.rounded,
        exprs: clone(profile.exprs || {}),
      };
      phoneme.expression = primaryExpression(phoneme.exprs);
      phonemes.push(phoneme);
      visemes.push({
        start: phoneme.start,
        end: phoneme.end,
        phoneme: phoneme.ipa,
        viseme: phoneme.viseme,
        expression: phoneme.expression,
        jaw: phoneme.jaw,
      });
      cursor += duration;
    };

    for (const [wordIndex, word] of words.entries()) {
      if (wordIndex > 0) {
        addTimelinePhoneme({ word: '' }, wordIndex, -1, 'sil', new Set());
      }
      const stress = new Set(word.stress || []);
      word.ipa = word.ipa || wordIpa(word);
      for (const [phonemeIndex, symbol] of word.phonemes.entries()) {
        addTimelinePhoneme(word, wordIndex, phonemeIndex, symbol, stress);
      }
    }

    const fallbackWords = words
      .filter((word) => word.source === 'rules')
      .map((word) => word.word);
    const dictionaryWords = words.length - fallbackWords.length;
    const ipa = words.map((word) => word.ipa || wordIpa(word)).join(' ');
    return {
      ok: true,
      status: 'ready',
      model: MODEL_ID,
      text: String(text || ''),
      ipa,
      words,
      phonemes,
      visemes,
      duration: cursor,
      loop: false,
      resources,
      coverage: {
        totalWords: words.length,
        dictionaryWords,
        fallbackWords: fallbackWords.length,
        ratio: words.length ? dictionaryWords / words.length : 0,
      },
      reason: fallbackWords.length
        ? `Used rule fallback for: ${fallbackWords.join(', ')}.`
        : '',
    };
  }

  function mixExprs(a, b, t) {
    const out = {};
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    for (const key of keys)
      out[key] = (a?.[key] || 0) * (1 - t) + (b?.[key] || 0) * t;
    return out;
  }

  function sampleMouth(plan, t) {
    const timeline = plan?.phonemes || [];
    if (!timeline.length) return null;
    if (t < 0 || t > plan.duration) return null;
    let idx = timeline.findIndex((p) => t >= p.start && t <= p.end);
    if (idx < 0) idx = timeline.length - 1;
    const cur = timeline[idx];
    const next = timeline[idx + 1];
    if (!next) return cur;
    const blendWindow = Math.min(0.055, cur.duration * 0.45);
    const remain = cur.end - t;
    if (remain > blendWindow) return cur;
    const k = clamp(1 - remain / blendWindow, 0, 1);
    return {
      ...cur,
      ipa: k >= 0.5 ? next.ipa : cur.ipa,
      viseme: k >= 0.5 ? next.viseme : cur.viseme,
      expression: k >= 0.5 ? next.expression : cur.expression,
      jaw: cur.jaw * (1 - k) + next.jaw * k,
      exprs: mixExprs(cur.exprs, next.exprs, k),
      lips: k >= 0.5 ? next.lips : cur.lips,
      tongue: k >= 0.5 ? next.tongue : cur.tongue,
      place: k >= 0.5 ? next.place : cur.place,
      manner: k >= 0.5 ? next.manner : cur.manner,
    };
  }

  function deltaAt(plan, t) {
    const out = {
      active: false,
      phoneme: '',
      viseme: '',
      rot: {},
      exprs: {},
      mouth: { jaw: 0, lips: '', tongue: '', place: '', manner: '' },
    };
    if (!plan?.ok) return out;
    const sample = sampleMouth(plan, t);
    if (!sample) return out;

    const jawRad = clamp(sample.jaw || 0, 0, 1) * 0.55;
    out.active = true;
    out.phoneme = sample.ipa;
    out.viseme = sample.viseme;
    out.rot.jaw = { x: jawRad, y: 0, z: 0 };
    out.exprs = clone(sample.exprs || {});
    out.mouth = {
      jaw: Math.round((sample.jaw || 0) * 1000) / 1000,
      lips: sample.lips || '',
      tongue: sample.tongue || '',
      place: sample.place || '',
      manner: sample.manner || '',
    };
    return out;
  }

  function resourceReport(env) {
    return evaluateResources(detectResources(env), REQUIRED);
  }

  window.ACS_IPA_SPEECH_MODEL_ID = MODEL_ID;
  window.ACS_IPA_SPEECH_REQUIRED = REQUIRED;
  window.ACS_IPA_SPEECH_LEXICON = LEXICON;
  window.ACS_IPA_SPEECH_PROFILES = PROFILES;
  window.ACS_detectIpaSpeechResources = detectResources;
  window.ACS_evaluateIpaSpeechResources = evaluateResources;
  window.ACS_getIpaSpeechResourceReport = resourceReport;
  window.ACS_lookupIpaSpeechWord = lookupWord;
  window.ACS_createIpaSpeechPlan = createPlan;
  window.ACS_ipaSpeechDelta = deltaAt;
})();
