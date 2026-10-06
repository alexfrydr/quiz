# Квиз по веб-программированию (клиент + сервер)

## Требования

- PHP 7.4+ с поддержкой сессий
- Веб-сервер (Apache / Nginx)

## Структура

```
quiz/
├── index.html          # Интерфейс
├── style.css
├── app.js              # Клиентская логика (без правильных ответов)
├── api/
│   ├── get_quiz.php    # Выдача 5 случайных вопросов (без correct)
│   └── submit.php      # Проверка ответов по серверной сессии
└── data/
    ├── questions.php   # Банк вопросов (закрыт от прямого доступа)
    └── .htaccess       # Deny from all
```

## Защита от списывания

1. Банк вопросов и флаги `correct` хранятся только на сервере (`data/questions.php`).
2. Клиенту отдаются только текст вопроса и 4 варианта **без** признака правильности.
3. Правильные ответы сохраняются в PHP-сессии (`$_SESSION`), не в JS и не в HTML.
4. После проверки сессия квиза сбрасывается (одноразовая сдача).
5. Папка `data/` закрыта через `.htaccess`.

## Запуск на Apache (Debian)

```bash
sudo apt install php libapache2-mod-php
sudo cp -r quiz /var/www/html/
sudo chown -R www-data:www-data /var/www/html/quiz
```

Откройте: `http://localhost/quiz/`

Убедитесь, что сессии PHP работают (по умолчанию — да).

## API

### GET `api/get_quiz.php`

Ответ:
```json
{
  "token": "...",
  "questions": [
    {
      "id": "q1",
      "text": "...",
      "answers": [
        { "id": "q1_a2", "text": "..." },
        { "id": "q1_a1", "text": "..." }
      ]
    }
  ]
}
```

### POST `api/submit.php`

Тело:
```json
{
  "token": "...",
  "answers": { "q1": "q1_a1", "q2": "q2_a3" }
}
```

Ответ:
```json
{
  "score": 3,
  "total": 5,
  "details": [
    { "question_id": "q1", "correct": true }
  ]
}
```
