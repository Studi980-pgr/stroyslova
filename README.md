# Стройслова

Английские слова для работы на стройке — для помощника проект-менеджера (assistant project manager) в США.
Карточки с транскрипцией, озвучкой и примерами, тренировки с интервальным повторением и виджет на экран iPhone.

[English below](#english)

## Что умеет

- **35 стартовых слов** — submittal, RFI, change order, punch list, lien waiver, lead time и другие. У каждого американская транскрипция, перевод и три примера из жизни объекта.
- **«Слова сейчас»** — три слова, которые стоит посмотреть и послушать прямо сейчас.
- **Тренировка** с заданиями, которые усложняются по мере того, как вы узнаёте слово: выбрать перевод, узнать на слух, собрать из букв, вставить в предложение, собрать предложение, диктант, написать самому.
- **Интервальное повторение.** Слово без ошибок возвращается через 1, 2, 4, 7, 14 и 30 дней. Ошибка — завтра и ещё раз в конце тренировки.
- **Озвучка** голосами самого телефона, работает без интернета. Совет: скачайте хороший голос — Settings → Accessibility → Spoken Content → Voices → English → Ava (Premium).
- **Свои слова** — кнопка «+ Добавить своё слово» на вкладке «Все слова».

## Как поставить (iPhone, с виджетом)

1. Установите бесплатное приложение **Scriptable** из App Store.
2. Откройте файл [`scriptable/Stroyslova.js`](scriptable/Stroyslova.js), нажмите **Raw** и скопируйте весь текст.
3. В Scriptable нажмите **+**, вставьте текст, назовите скрипт **Stroyslova**.
4. Запустите его один раз — он сам скачает приложение и слова отсюда, с GitHub.
5. **Виджет:** зажмите экран «Домой» → **Edit → Add Widget → Scriptable → Medium**. Нажмите на виджет → **Script: Stroyslova**, **When Interacting: Run Script**.
6. **Иконка:** приложение **Shortcuts** → новая команда → действие **Scriptable → Run Script → Stroyslova**, включить **Run In App** → **Add to Home Screen**.

Если в Scriptable включён iCloud, прогресс хранится в iCloud Drive → Scriptable → Stroyslova.

## Как переделать под себя

Всё приложение — один файл `index.html`, а слова — в `words.json` и прямо в `index.html` (строка `const BASE_WORDS = [...]`).
Скачайте эти файлы и попросите любой ИИ (Claude, ChatGPT) их изменить. Пример запроса:

> Вот приложение для изучения английских слов (файл index.html). Замени стартовые слова на 40 слов для работы **[электриком / в ресторане / в IT / медсестрой]**. Для каждого слова: английское слово, американская транскрипция в IPA, перевод на русский и три коротких примера с переводом. Каждый пример должен содержать само слово. Формат — как в массиве BASE_WORDS. Остальное не меняй. Пришли файл целиком.

Так же можно поменять язык перевода (например, на украинский или испанский), цвета, количество новых слов в день (`NEW_PER_SESSION`) или интервалы повторения (`INTERVALS`).

Чтобы сделать свою версию: нажмите **Fork** на GitHub, замените файлы, а в `scriptable/Stroyslova.js` поменяйте адрес `SOURCE` на свой репозиторий. Или просто положите изменённые `index.html` (как `app.html`) и `words.json` в iCloud Drive → Scriptable → Stroyslova.

## Лицензия

MIT — берите, меняйте, делитесь.

---

<a id="english"></a>
## English

**Stroyslova** ("construction words") teaches English construction vocabulary to Russian speakers working as assistant project managers in the US: flashcards with American IPA and audio, spaced-repetition training (choose, listen, spell from letters, fill the gap, build the sentence, dictation, type it), and an iPhone home-screen widget via Scriptable.

- The whole app is `index.html`; the starter words are in `words.json`.
- Widget + iCloud sync: paste `scriptable/Stroyslova.js` into the Scriptable app and run it once — it downloads the app and words from this repository.
- To adapt it to another field or language, give `index.html` to an AI assistant and ask it to replace the `BASE_WORDS` list (same format: `en`, `ipa`, `ru`, `examples[{en, ru}]`).

MIT licensed.
