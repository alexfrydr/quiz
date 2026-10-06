/**
 * Клиент квиза.
 * Вопросы и варианты приходят с сервера без признака правильности.
 * Проверка ответов выполняется только на сервере.
 */
(function () {
    'use strict';

    const API_GET = 'api/get_quiz.php';
    const API_SUBMIT = 'api/submit.php';

    let token = null;
    let questions = [];
    let currentIndex = 0;
    /** @type {Record<string, string>} questionId -> answerId */
    let userAnswers = {};

    const screens = {
        start: document.getElementById('screen-start'),
        quiz: document.getElementById('screen-quiz'),
        result: document.getElementById('screen-result'),
        error: document.getElementById('screen-error'),
    };

    const el = {
        quizContainer: document.getElementById('quiz-container'),
        progressFill: document.getElementById('progress-fill'),
        progressText: document.getElementById('progress-text'),
        btnStart: document.getElementById('btn-start'),
        btnPrev: document.getElementById('btn-prev'),
        btnNext: document.getElementById('btn-next'),
        btnRestart: document.getElementById('btn-restart'),
        btnRetry: document.getElementById('btn-retry'),
        scoreDisplay: document.getElementById('score-display'),
        scoreMessage: document.getElementById('score-message'),
        errorText: document.getElementById('error-text'),
    };

    function showScreen(name) {
        Object.values(screens).forEach((s) => s.classList.remove('active'));
        screens[name].classList.add('active');
    }

    function showError(message) {
        el.errorText.textContent = message;
        showScreen('error');
    }

    async function startQuiz() {
        el.btnStart.disabled = true;
        el.btnStart.textContent = 'Загрузка…';

        try {
            const res = await fetch(API_GET, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Не удалось загрузить квиз');
            }

            if (!data.token || !Array.isArray(data.questions) || data.questions.length === 0) {
                throw new Error('Некорректный ответ сервера');
            }

            token = data.token;
            questions = data.questions;
            currentIndex = 0;
            userAnswers = {};

            showScreen('quiz');
            renderQuestion();
        } catch (err) {
            showError(err.message || 'Ошибка сети');
        } finally {
            el.btnStart.disabled = false;
            el.btnStart.textContent = 'Начать квиз';
        }
    }

    function renderQuestion() {
        const q = questions[currentIndex];
        const total = questions.length;
        const num = currentIndex + 1;

        el.progressFill.style.width = (num / total) * 100 + '%';
        el.progressText.textContent = 'Вопрос ' + num + ' из ' + total;

        const selectedId = userAnswers[q.id] || null;

        let html = '<p class="question-text">' + escapeHtml(q.text) + '</p>';
        html += '<div class="answers" role="radiogroup" aria-label="Варианты ответа">';

        q.answers.forEach((ans, i) => {
            const checked = selectedId === ans.id ? ' checked' : '';
            const selectedClass = selectedId === ans.id ? ' selected' : '';
            const inputId = 'ans-' + currentIndex + '-' + i;

            html +=
                '<label class="answer-option' +
                selectedClass +
                '" for="' +
                inputId +
                '">' +
                '<input type="radio" name="answer" id="' +
                inputId +
                '" value="' +
                escapeHtml(ans.id) +
                '"' +
                checked +
                '>' +
                '<span>' +
                escapeHtml(ans.text) +
                '</span>' +
                '</label>';
        });

        html += '</div>';
        el.quizContainer.innerHTML = html;

        el.quizContainer.querySelectorAll('input[name="answer"]').forEach((input) => {
            input.addEventListener('change', onAnswerSelect);
        });

        el.btnPrev.disabled = currentIndex === 0;
        updateNextButton();
    }

    function onAnswerSelect(e) {
        const q = questions[currentIndex];
        userAnswers[q.id] = e.target.value;

        el.quizContainer.querySelectorAll('.answer-option').forEach((label) => {
            label.classList.toggle('selected', label.querySelector('input').checked);
        });

        updateNextButton();
    }

    function updateNextButton() {
        const q = questions[currentIndex];
        const hasAnswer = Boolean(userAnswers[q.id]);
        const isLast = currentIndex === questions.length - 1;

        el.btnNext.disabled = !hasAnswer;
        el.btnNext.textContent = isLast ? 'Завершить' : 'Далее';
    }

    function goPrev() {
        if (currentIndex > 0) {
            currentIndex--;
            renderQuestion();
        }
    }

    async function goNext() {
        const q = questions[currentIndex];
        if (!userAnswers[q.id]) return;

        if (currentIndex < questions.length - 1) {
            currentIndex++;
            renderQuestion();
            return;
        }

        await submitQuiz();
    }

    async function submitQuiz() {
        el.btnNext.disabled = true;
        el.btnNext.textContent = 'Проверка…';

        try {
            const res = await fetch(API_SUBMIT, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    token: token,
                    answers: userAnswers,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Ошибка при проверке');
            }

            showResult(data.score, data.total);
        } catch (err) {
            showError(err.message || 'Ошибка сети');
        }
    }

    function showResult(score, total) {
        el.scoreDisplay.innerHTML =
            escapeHtml(String(score)) + ' <span class="total">из ' + escapeHtml(String(total)) + '</span>';

        let msg;
        if (score === total) {
            msg = 'Отличный результат! Все ответы верные.';
        } else if (score >= Math.ceil(total * 0.6)) {
            msg = 'Хороший результат. Есть куда расти.';
        } else if (score > 0) {
            msg = 'Стоит повторить материал по веб-программированию.';
        } else {
            msg = 'Не расстраивайтесь — попробуйте ещё раз.';
        }

        el.scoreMessage.textContent = msg;
        showScreen('result');

        // Сброс клиентского состояния (серверная сессия уже сброшена)
        token = null;
        questions = [];
        userAnswers = {};
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    el.btnStart.addEventListener('click', startQuiz);
    el.btnPrev.addEventListener('click', goPrev);
    el.btnNext.addEventListener('click', goNext);
    el.btnRestart.addEventListener('click', () => {
        showScreen('start');
    });
    el.btnRetry.addEventListener('click', () => {
        showScreen('start');
    });
})();
