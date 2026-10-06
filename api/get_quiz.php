<?php
/**
 * Выдаёт квиз: 5 случайных вопросов, по 4 варианта ответа (включая правильный).
 * Правильный ответ клиенту не передаётся.
 * Создаёт серверную сессию с правильными ответами для последующей проверки.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');

session_start();

$bank = require __DIR__ . '/../data/questions.php';

if (!is_array($bank) || count($bank) < 5) {
    http_response_code(500);
    echo json_encode(['error' => 'Недостаточно вопросов в банке']);
    exit;
}

// Выбираем 5 случайных вопросов
$keys = array_keys($bank);
shuffle($keys);
$selectedKeys = array_slice($keys, 0, 5);

$quizForClient = [];
$correctMap = []; // question_id => correct_answer_id

foreach ($selectedKeys as $key) {
    $q = $bank[$key];
    $answers = $q['answers'];

    // Находим правильный ответ
    $correct = null;
    foreach ($answers as $a) {
        if (!empty($a['correct'])) {
            $correct = $a;
            break;
        }
    }
    if ($correct === null) {
        continue;
    }

    // Берём правильный + 3 случайных неправильных
    $wrong = array_values(array_filter($answers, static fn($a) => empty($a['correct'])));
    shuffle($wrong);
    $pickedWrong = array_slice($wrong, 0, 3);

    $options = array_merge([$correct], $pickedWrong);
    shuffle($options);

    // Клиенту отдаём только id и текст, без флага correct
    $clientOptions = [];
    foreach ($options as $opt) {
        $clientOptions[] = [
            'id' => $opt['id'],
            'text' => $opt['text'],
        ];
    }

    $quizForClient[] = [
        'id' => $q['id'],
        'text' => $q['text'],
        'answers' => $clientOptions,
    ];

    $correctMap[$q['id']] = $correct['id'];
}

// Сохраняем правильные ответы только на сервере
$timeLimitSec = 300; // 5 минут на весь квиз

$_SESSION['quiz_correct'] = $correctMap;
$_SESSION['quiz_token'] = bin2hex(random_bytes(16));
$_SESSION['quiz_created'] = time();
$_SESSION['quiz_time_limit'] = $timeLimitSec;

echo json_encode([
    'token' => $_SESSION['quiz_token'],
    'time_limit' => $timeLimitSec,
    'questions' => $quizForClient,
], JSON_UNESCAPED_UNICODE);
