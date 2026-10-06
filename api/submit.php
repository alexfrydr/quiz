<?php
/**
 * Принимает ответы пользователя и возвращает результат.
 * Правильные ответы берутся только из серверной сессии.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Метод не разрешён']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data) || empty($data['token']) || empty($data['answers']) || !is_array($data['answers'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Некорректный запрос']);
    exit;
}

if (
    empty($_SESSION['quiz_token']) ||
    empty($_SESSION['quiz_correct']) ||
    !hash_equals((string)$_SESSION['quiz_token'], (string)$data['token'])
) {
    http_response_code(403);
    echo json_encode(['error' => 'Сессия квиза недействительна. Начните заново.']);
    exit;
}

// Ограничение по времени (например, 30 минут)
if (!empty($_SESSION['quiz_created']) && (time() - (int)$_SESSION['quiz_created']) > 1800) {
    unset($_SESSION['quiz_correct'], $_SESSION['quiz_token'], $_SESSION['quiz_created']);
    http_response_code(403);
    echo json_encode(['error' => 'Время прохождения квиза истекло. Начните заново.']);
    exit;
}

$correctMap = $_SESSION['quiz_correct'];
$userAnswers = $data['answers']; // { question_id: answer_id }

$total = count($correctMap);
$score = 0;
$details = [];

foreach ($correctMap as $qId => $correctAnswerId) {
    $userAnswerId = $userAnswers[$qId] ?? null;
    $isCorrect = $userAnswerId !== null && hash_equals((string)$correctAnswerId, (string)$userAnswerId);
    if ($isCorrect) {
        $score++;
    }
    $details[] = [
        'question_id' => $qId,
        'correct' => $isCorrect,
    ];
}

// Одноразовая проверка — сбрасываем сессию квиза
unset($_SESSION['quiz_correct'], $_SESSION['quiz_token'], $_SESSION['quiz_created']);

echo json_encode([
    'score' => $score,
    'total' => $total,
    'details' => $details,
], JSON_UNESCAPED_UNICODE);
