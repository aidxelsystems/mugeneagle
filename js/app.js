/* ========================================
   TalkinEagle - Main Application
   株式会社無限プロジェクト
   ======================================== */

(function () {
    'use strict';

    // ===== Configuration =====
    const CONFIG = {
        // GASでデプロイしたウェブアプリのURLをここに設定してください
        API_URL: 'https://script.google.com/macros/s/AKfycbx_CItnwZ4nw7RiIUS1SA-JSNPpsiOk_TaV2ZVhoPVb01AVvniadavisOtUANurlkSh/exec',
        MAX_HISTORY_TURNS: 3,
        MAX_CONVERSATION_TURNS: 3,  // 最大やり取り回数
        TYPEWRITER_SPEED: 50,       // ms per character
        MOUTH_INTERVAL: 200,        // ms mouth open/close
        BLINK_MIN: 3000,            // ms minimum blink interval
        BLINK_MAX: 6000,            // ms maximum blink interval
        BLINK_DURATION: 150,        // ms blink duration
        INITIAL_MESSAGE: 'お仕事をお探しの求職者の方ですか？\n人材をお求めの求人企業の方ですか？\nお気軽にお問い合わせください',       
        SYSTEM_PROMPT: `あなたは有料職業紹介事業を行う「株式会社無限プロジェクト」の案内役です。
名前は「ムゲンイーグル」。スーツを着た威厳のあるワシのキャラクターです。

【事業内容】
有料職業紹介とは、求人及び求職の申込みを受け、求人者と求職者との間における雇用関係の成立をあっせんすることです。
港湾運送業務・建設業務を除く全ての職業について取り扱うことができます。

【会社情報】
- 会社名: 株式会社無限プロジェクト
- ホームページ: https://job-mugen.com/
- お問い合わせ: https://job-mugen.com/contact

【対応方針】
- 求職者には：希望職種、経験、条件などを丁寧にヒアリングしてください
- 求人企業には：求める人材像、待遇条件などを確認してください
- 丁寧かつ親しみやすい口調で対応してください
- 回答は必ず150文字以内で、2〜3文の簡潔な文章にまとめてください
- 長い説明は避け、要点だけを伝えてください
- 具体的な求人案件の紹介はできないことを伝え、詳細はお問い合わせを促してください
- 最初の質問では「お仕事を探していますか？ 人材を求めていますか？」と聞いてあるので、その回答に合わせて対応してください`
    };

    // ===== DOM Elements =====
    const DOM = {
        speechBubble: document.getElementById('speech-bubble'),
        speechText: document.getElementById('speech-text'),
        speechContact: document.getElementById('speech-contact'),
        chatInput: document.getElementById('chat-input'),
        sendBtn: document.getElementById('send-btn'),
        loadingIndicator: document.getElementById('loading-indicator'),
        characterContainer: document.getElementById('character-container'),
        eagles: [
            document.getElementById('eagle-01'), // eyes open, mouth closed
            document.getElementById('eagle-02'), // eyes closed, mouth closed
            document.getElementById('eagle-03'), // eyes open, mouth open
            document.getElementById('eagle-04'), // eyes closed, mouth open
        ]
    };

    // ===== State =====
    const state = {
        isSpeaking: false,
        isBlinking: false,
        mouthOpen: false,
        blinkTimer: null,
        mouthTimer: null,
        typewriterTimer: null,
        conversationHistory: [],
        turnCount: 0
    };

    // ===== PNG Tuber Engine =====

    /**
     * Set the active eagle image.
     * Index: 0=eyes open mouth closed, 1=eyes closed mouth closed,
     *        2=eyes open mouth open, 3=eyes closed mouth open
     */
    function setEagleFrame(index) {
        DOM.eagles.forEach((img, i) => {
            if (i === index) {
                img.classList.add('active');
            } else {
                img.classList.remove('active');
            }
        });
    }

    function getCurrentFrame() {
        if (state.isBlinking && state.mouthOpen) return 3;
        if (state.isBlinking && !state.mouthOpen) return 1;
        if (!state.isBlinking && state.mouthOpen) return 2;
        return 0;
    }

    function updateFrame() {
        setEagleFrame(getCurrentFrame());
    }

    // --- Blinking ---
    function scheduleNextBlink() {
        const delay = CONFIG.BLINK_MIN + Math.random() * (CONFIG.BLINK_MAX - CONFIG.BLINK_MIN);
        state.blinkTimer = setTimeout(() => {
            doBlink();
        }, delay);
    }

    function doBlink() {
        state.isBlinking = true;
        updateFrame();
        setTimeout(() => {
            state.isBlinking = false;
            updateFrame();
            scheduleNextBlink();
        }, CONFIG.BLINK_DURATION);
    }

    function startBlinking() {
        scheduleNextBlink();
    }

    function stopBlinking() {
        if (state.blinkTimer) {
            clearTimeout(state.blinkTimer);
            state.blinkTimer = null;
        }
        state.isBlinking = false;
    }

    // --- Mouth Animation ---
    function startMouthAnimation() {
        state.isSpeaking = true;
        DOM.characterContainer.classList.add('speaking');
        state.mouthTimer = setInterval(() => {
            state.mouthOpen = !state.mouthOpen;
            updateFrame();
        }, CONFIG.MOUTH_INTERVAL);
    }

    function stopMouthAnimation() {
        state.isSpeaking = false;
        state.mouthOpen = false;
        DOM.characterContainer.classList.remove('speaking');
        if (state.mouthTimer) {
            clearInterval(state.mouthTimer);
            state.mouthTimer = null;
        }
        updateFrame();
    }

    // ===== Speech Bubble =====

    function showBubble() {
        DOM.speechBubble.classList.add('visible');
    }

    function hideBubble() {
        DOM.speechBubble.classList.remove('visible');
    }

    function showContact() {
        DOM.speechContact.classList.remove('hidden');
    }

    function hideContact() {
        DOM.speechContact.classList.add('hidden');
    }

    /**
     * Display text with a typewriter effect in the speech bubble.
     * The eagle does mouth animation while typing.
     */
    function typewriterSpeak(text) {
        return new Promise((resolve) => {
            DOM.speechText.textContent = '';
            hideContact();
            showBubble();
            startMouthAnimation();

            let index = 0;
            state.typewriterTimer = setInterval(() => {
                if (index < text.length) {
                    DOM.speechText.textContent += text[index];
                    index++;
                } else {
                    clearInterval(state.typewriterTimer);
                    state.typewriterTimer = null;
                    stopMouthAnimation();
                    showContact();
                    resolve();
                }
            }, CONFIG.TYPEWRITER_SPEED);
        });
    }

    // ===== Chat / Gemini API =====

    function buildRequestBody(userMessage, isFinalTurn = false) {
        // Build contents array from conversation history
        const contents = [];

        // Add history (up to MAX_HISTORY_TURNS)
        const historyStart = Math.max(0, state.conversationHistory.length - CONFIG.MAX_HISTORY_TURNS * 2);
        for (let i = historyStart; i < state.conversationHistory.length; i++) {
            contents.push(state.conversationHistory[i]);
        }

        // Add current user message
        contents.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        let systemPrompt = CONFIG.SYSTEM_PROMPT;
        if (isFinalTurn) {
            systemPrompt += "\n\n【重要】これが今回の最後の回答になります。質問に簡潔に答えた後、必ず「これ以上の詳細については、ぜひお問い合わせページ（https://job-mugen.com/contact）よりお気軽にご相談ください！」と案内して会話を丁寧に締めくくってください。";
        }

        return {
            system_instruction: {
                parts: [{ text: systemPrompt }]
            },
            contents: contents,
            generationConfig: {
                maxOutputTokens: 200,
                temperature: 0.7
            }
        };
    }

    async function sendToGemini(userMessage, isFinalTurn = false) {
        const url = CONFIG.API_URL;
        const body = buildRequestBody(userMessage, isFinalTurn);

        const response = await fetch(url, {
            method: 'POST',
            // CORSエラーを避けるため、GASの場合は text/plain が推奨されます
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // エラーレスポンスが含まれている場合のハンドリング
        if (data.error) {
            console.error('Gemini API Error:', data.error);
            throw new Error(`Gemini API Error: ${data.error.message || data.error.status}`);
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!reply) {
            console.error('Unexpected Response:', data);
            throw new Error('Empty response from API');
        }

        // Trim to 150 chars if needed
        const trimmedReply = reply.length > 150 ? reply.substring(0, 147) + '...' : reply;

        // Update conversation history
        state.conversationHistory.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });
        state.conversationHistory.push({
            role: 'model',
            parts: [{ text: trimmedReply }]
        });

        // Keep only last MAX_HISTORY_TURNS * 2 entries
        const maxEntries = CONFIG.MAX_HISTORY_TURNS * 2;
        if (state.conversationHistory.length > maxEntries) {
            state.conversationHistory = state.conversationHistory.slice(-maxEntries);
        }

        return trimmedReply;
    }

    // ===== UI Handlers =====

    function setInputEnabled(enabled) {
        DOM.chatInput.disabled = !enabled;
        DOM.sendBtn.disabled = !enabled;
        if (enabled) {
            DOM.loadingIndicator.classList.add('hidden');
            DOM.chatInput.focus();
        } else {
            DOM.loadingIndicator.classList.remove('hidden');
        }
    }

    async function handleSend() {
        const message = DOM.chatInput.value.trim();
        if (!message || !DOM.chatInput.disabled === false) return;

        state.turnCount++;
        const isFinalTurn = state.turnCount >= CONFIG.MAX_CONVERSATION_TURNS;

        DOM.chatInput.value = '';
        setInputEnabled(false);

        try {
            const reply = await sendToGemini(message, isFinalTurn);
            await typewriterSpeak(reply);
            
            if (isFinalTurn) {
                // 3回目で会話を終了し、入力を無効化する
                DOM.chatInput.placeholder = '会話は終了しました。お問い合わせをお待ちしております。';
                return; // ここで終了し、入力を再有効化しない
            }
        } catch (error) {
            console.error('Chat error:', error);
            await typewriterSpeak('申し訳ございません。通信エラーが発生しました。しばらくしてからもう一度お試しください。');
            state.turnCount--; // エラー時はカウントを戻す
        }

        setInputEnabled(true);
    }

    // ===== Event Listeners =====

    DOM.sendBtn.addEventListener('click', handleSend);

    DOM.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.isComposing) {
            e.preventDefault();
            handleSend();
        }
    });

    // ===== Initialization =====

    async function preloadImages() {
        const promises = DOM.eagles.map((img) => {
            return new Promise((resolve) => {
                if (img.complete) {
                    resolve();
                } else {
                    img.onload = resolve;
                    img.onerror = resolve;
                }
            });
        });
        await Promise.all(promises);
    }

    async function init() {
        // Preload all eagle images
        await preloadImages();

        // Start blinking
        startBlinking();

        // Show initial greeting after a short delay
        setTimeout(async () => {
            setInputEnabled(false);
            await typewriterSpeak(CONFIG.INITIAL_MESSAGE);
            setInputEnabled(true);
        }, 800);
    }

    init();
})();
