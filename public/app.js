document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const analyzeBtn = document.getElementById('analyze-btn');
    const loadingArea = document.getElementById('loading-area');
    const resultArea = document.getElementById('result-area');
    const errorArea = document.getElementById('error-area');
    const errorMessage = document.getElementById('error-message');

    // Result elements
    const sentimentBadge = document.getElementById('sentiment-badge');
    const sentimentText = document.getElementById('sentiment-text');
    const confidenceProgress = document.getElementById('confidence-progress');
    const confidenceValue = document.getElementById('confidence-value');
    const sentimentReason = document.getElementById('sentiment-reason');

    const sentimentMap = {
        'positive': { text: '긍정', color: '#fff176' },
        'negative': { text: '부정', color: '#ff6b6b' },
        'neutral': { text: '중립', color: '#777777' }
    };

    analyzeBtn.addEventListener('click', async () => {
        const text = textInput.value.trim();

        // 1. Validation
        if (!text) {
            showError('분석할 문장을 입력해 주세요.');
            return;
        }

        if (text.length > 1000) {
            showError('문장은 1000자 이내로 입력해 주세요.');
            return;
        }

        // 2. UI Reset & Loading State
        resetUI();
        setLoading(true);

        try {
            // 3. API Request
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '분석 중 문제가 발생했습니다.');
            }

            // 4. Render Result
            renderResult(data);
        } catch (error) {
            console.error('Analysis error:', error);
            showError(error.message);
        } finally {
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        if (isLoading) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerText = '분석 중...';
            loadingArea.classList.remove('hidden');
        } else {
            analyzeBtn.disabled = false;
            analyzeBtn.innerText = '분석하기';
            loadingArea.classList.add('hidden');
        }
    }

    function renderResult(data) {
        const info = sentimentMap[data.sentiment] || sentimentMap['neutral'];
        
        sentimentBadge.innerText = info.text;
        sentimentBadge.style.backgroundColor = info.color;
        
        // Display formatted text
        sentimentText.innerText = `${info.text}적인 분위기가 느껴집니다.`;
        
        // Update confidence
        confidenceProgress.style.width = `${data.confidence}%`;
        confidenceProgress.style.backgroundColor = info.color;
        confidenceValue.innerText = `${data.confidence}%`;
        
        // Update reason
        sentimentReason.innerText = data.reason;

        resultArea.classList.remove('hidden');
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function showError(message) {
        errorMessage.innerText = message;
        errorArea.classList.remove('hidden');
    }

    function resetUI() {
        resultArea.classList.add('hidden');
        errorArea.classList.add('hidden');
    }
});
