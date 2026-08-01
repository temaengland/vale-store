# Vale & co — запуск сайта, шаг за шагом

Простой каталог-сайт: Мебель / Ювелирные изделия / Декор, с фильтром по
подкатегориям. На каждом товаре — две опции для покупателя:
- "Buy now" — оплата картой сразу, в один клик (Stripe)
- "Ask a question first" — написать в WhatsApp или оставить email,
  заявка сохраняется в базу автоматически

Никакой корзины нет специально — оплата разовая, прямо с карточки товара,
чтобы не усложнять сайт.

## Что уже готово
- Главная, категории с фильтром по подкатегориям, карточка товара
- Кнопка "Buy now" — открывает страницу оплаты Stripe для этой одной вещи
- Кнопка "Ask about this on WhatsApp" + форма с email — сохраняются в базу
- Админка на /admin — вход по паролю:
  - вкладка Items — добавление/редактирование/удаление товаров, загрузка фото
  - вкладка Enquiries — список всех заявок с контактами, статус (new /
    contacted / won / lost)
- Пока фото не загружено — простая нарисованная иконка предмета вместо
  пустого места

## Шаг 1. Stripe (оплата)
1. stripe.com/register -> зарегистрируйся
2. Developers -> API keys -> скопируй Secret key (sk_test_... для теста)
3. Это значение -> STRIPE_SECRET_KEY

## Шаг 2. Свой WhatsApp номер
Открой components/Header.tsx и components/InquiryForm.tsx, замени
WHATSAPP_NUMBER на свой номер в международном формате без + и пробелов
(например 447911123456).

## Шаг 3. Supabase (база товаров + заявок + хранилище фото)
1. supabase.com -> Start your project -> создай проект
2. SQL Editor -> New query -> вставь содержимое supabase-setup.sql -> Run
3. Project Settings -> API, скопируй:
   - Project URL -> NEXT_PUBLIC_SUPABASE_URL
   - anon public -> NEXT_PUBLIC_SUPABASE_ANON_KEY
   - service_role (Reveal) -> SUPABASE_SERVICE_ROLE_KEY (никому не показывай)

## Шаг 4. GitHub
1. github.com -> создай пустой репозиторий vale-store
2. Загрузи туда содержимое этой папки

## Шаг 5. Vercel (хостинг)
1. vercel.com/new -> войти через GitHub -> Import vale-store
2. Environment Variables — добавь все из .env.local.example со своими
   реальными значениями, плюс ADMIN_PASSWORD (придумай свой пароль)
3. Deploy — сайт будет на vale-store.vercel.app

## Шаг 6. Домен (names.co.uk)
1. Vercel: Project -> Settings -> Domains -> добавь домен
2. Vercel покажет DNS-записи
3. В панели names.co.uk (DNS Management) — замени старые Shopify-записи
   на новые от Vercel

## Шаг 7. Пользуйся админкой
твой-сайт.vercel.app/admin -> пароль из ADMIN_PASSWORD
- Items: добавляй товары с фото
- Enquiries: кто и что спрашивал, отмечай статус

## Локальный запуск (для проверки перед деплоем)
    npm install
    cp .env.local.example .env.local   (впиши свои настоящие ключи)
    npm run dev

Открой http://localhost:3000

## На будущее
- Мобильное приложение — отдельная тема на будущее; сайт уже полностью
  адаптивный под телефон
